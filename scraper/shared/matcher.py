"""
matcher.py - Fans a newly-ingested DA out to every active builder whose
service area / project type / value range matches, creating lead_matches rows.
Also detects DA status changes (lodged -> approved) for multi-stage campaigns.
"""

from shared.supabase_client import (
    get_active_builders,
    match_exists,
    create_match,
)


def builder_matches_da(builder: dict, da: dict) -> list[str]:
    """Returns a list of match reasons if the builder matches this DA, else []."""
    reasons = []

    service_suburbs = builder.get("service_suburbs") or []
    if da["suburb"] not in service_suburbs:
        return []
    reasons.append(f"services {da['suburb']}")

    service_states = builder.get("service_states") or []
    if service_states and da["state"] not in service_states:
        return []

    project_types = builder.get("project_types") or []
    if project_types and da.get("project_type") not in project_types:
        return []
    if da.get("project_type") in project_types:
        reasons.append(f"builds {da['project_type'].replace('_', ' ')}")

    value = da.get("estimated_value_aud")
    if value is not None:
        min_value = builder.get("min_value_aud") or 0
        max_value = builder.get("max_value_aud")
        if value < min_value:
            return []
        if max_value is not None and value > max_value:
            return []

    return reasons


def match_da_to_builders(da_id: str, da: dict, trigger_stage: str = "lodgement") -> int:
    """Fan a single DA out to all active builders. Returns count of new matches created."""
    builders = get_active_builders()
    created = 0

    for builder in builders:
        reasons = builder_matches_da(builder, da)
        if not reasons:
            continue

        if match_exists(da_id, builder["id"], trigger_stage):
            continue

        match_id = create_match(
            da_id=da_id,
            builder_id=builder["id"],
            user_id=builder["user_id"],
            match_reasons=reasons,
            trigger_stage=trigger_stage,
        )
        if match_id:
            created += 1

    return created


def process_approval_stage_matches(source: str, since_iso: str) -> int:
    """Check for DAs that moved to 'approved' since the last run and create
    a second-stage lead_match (trigger_stage='approval') for already-matched builders."""
    from shared.supabase_client import get_recently_approved_das

    approved_das = get_recently_approved_das(source, since_iso)
    total_created = 0

    for da in approved_das:
        total_created += match_da_to_builders(da["id"], da, trigger_stage="approval")

    return total_created
