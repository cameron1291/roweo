"""
supabase_client.py - DA + lead_match persistence for the Roweo scraper.
Pattern adapted from ~/launchpad/crawler/shared/supabase_client.py.
"""

import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ── Development Applications ────────────────────────────────────────────────

def da_exists(source: str, source_id: str) -> bool:
    client = _get_client()
    result = (
        client.table("development_applications")
        .select("id")
        .eq("source", source)
        .eq("source_id", source_id)
        .limit(1)
        .execute()
    )
    return len(result.data or []) > 0


def upsert_da(da: dict) -> str:
    """Insert a DA row (or update if source/source_id already exists). Returns the row UUID."""
    client = _get_client()
    row = {
        "source": da["source"],
        "source_id": da["source_id"],
        "source_url": da.get("source_url"),
        "council": da.get("council"),
        "state": da["state"],
        "suburb": da["suburb"],
        "postcode": da.get("postcode"),
        "street_address": da.get("street_address"),
        "da_number": da.get("da_number"),
        "description": da.get("description"),
        "project_type": da.get("project_type", "other"),
        "project_type_confidence": da.get("project_type_confidence"),
        "estimated_value_aud": da.get("estimated_value_aud"),
        "applicant_name": da.get("applicant_name"),
        "owner_name": da.get("owner_name"),
        "lodged_date": da.get("lodged_date"),
        "determination_date": da.get("determination_date"),
        "raw_data": da.get("raw_data"),
    }
    try:
        result = (
            client.table("development_applications")
            .upsert(row, on_conflict="source,source_id")
            .execute()
        )
        return result.data[0]["id"] if result.data else ""
    except Exception as e:
        print(f"[Supabase] Error upserting DA {da.get('source_id')}: {e}")
        return ""


def get_recently_approved_das(source: str, since_iso: str) -> list[dict]:
    """DAs whose determination_date was set since the last run (for multi-stage 'approval' matches)."""
    client = _get_client()
    try:
        result = (
            client.table("development_applications")
            .select("*")
            .eq("source", source)
            .gte("determination_date", since_iso)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[Supabase] Error fetching recently approved DAs: {e}")
        return []


# ── Lead matches ─────────────────────────────────────────────────────────────

def get_active_builders() -> list[dict]:
    """All builder profiles belonging to an active subscriber."""
    client = _get_client()
    try:
        profiles = (
            client.table("profiles")
            .select("id")
            .eq("subscription_status", "active")
            .execute()
        )
        active_user_ids = [p["id"] for p in (profiles.data or [])]
        if not active_user_ids:
            return []
        result = (
            client.table("builder_profiles")
            .select("*")
            .in_("user_id", active_user_ids)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[Supabase] Error fetching active builders: {e}")
        return []


def match_exists(da_id: str, builder_id: str, trigger_stage: str) -> bool:
    client = _get_client()
    result = (
        client.table("lead_matches")
        .select("id")
        .eq("da_id", da_id)
        .eq("builder_id", builder_id)
        .eq("trigger_stage", trigger_stage)
        .limit(1)
        .execute()
    )
    return len(result.data or []) > 0


def create_match(da_id: str, builder_id: str, user_id: str, match_reasons: list[str], trigger_stage: str = "lodgement") -> str:
    client = _get_client()
    row = {
        "da_id": da_id,
        "builder_id": builder_id,
        "user_id": user_id,
        "match_reasons": match_reasons,
        "trigger_stage": trigger_stage,
        "status": "new",
    }
    try:
        result = client.table("lead_matches").insert(row).execute()
        match_id = result.data[0]["id"] if result.data else ""
        if match_id:
            client.table("notifications").insert({
                "user_id": user_id,
                "type": "new_lead",
                "title": "New DA lead matched" if trigger_stage == "lodgement" else "A matched DA was approved",
                "body": f"A new development application matches your service area ({', '.join(match_reasons)}).",
                "link": "/dashboard/leads",
            }).execute()
        return match_id
    except Exception as e:
        print(f"[Supabase] Error creating match: {e}")
        return ""


# ── Scraper run logging ──────────────────────────────────────────────────────

def log_scraper_start(source: str) -> str:
    client = _get_client()
    run_id = str(uuid.uuid4())
    try:
        client.table("scraper_runs").insert({
            "id": run_id,
            "source": source,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "status": "running",
        }).execute()
    except Exception as e:
        print(f"[Supabase] Error logging scraper start: {e}")
    return run_id


def log_scraper_end(run_id: str, das_scraped: int, das_new: int, matches_created: int, errors: str = None):
    client = _get_client()
    try:
        client.table("scraper_runs").update({
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "das_scraped": das_scraped,
            "das_new": das_new,
            "matches_created": matches_created,
            "errors": errors,
            "status": "failed" if errors else "done",
        }).eq("id", run_id).execute()
    except Exception as e:
        print(f"[Supabase] Error logging scraper end: {e}")


def log_health(check_name: str, status: str, message: str = ""):
    client = _get_client()
    try:
        client.table("system_health_log").insert({
            "check_name": check_name,
            "status": status,
            "message": message,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        print(f"[Supabase] Error logging health: {e}")


# ── Suburbs (DA count rollup for SEO pages) ──────────────────────────────────

def increment_suburb_da_count(name: str, state: str, postcode: str = None):
    client = _get_client()
    try:
        existing = (
            client.table("suburbs")
            .select("id, da_count")
            .eq("name", name)
            .eq("state", state)
            .limit(1)
            .execute()
        )
        if existing.data:
            client.table("suburbs").update({
                "da_count": existing.data[0]["da_count"] + 1,
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            client.table("suburbs").insert({
                "name": name,
                "state": state,
                "postcode": postcode,
                "da_count": 1,
            }).execute()
    except Exception as e:
        print(f"[Supabase] Error updating suburb DA count: {e}")


def _slugify(text: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def increment_council_da_count(name: str, state: str):
    if not name:
        return
    client = _get_client()
    slug = f"{_slugify(name)}-{state.lower()}"
    try:
        existing = (
            client.table("councils")
            .select("id, da_count")
            .eq("name", name)
            .eq("state", state)
            .limit(1)
            .execute()
        )
        if existing.data:
            client.table("councils").update({
                "da_count": existing.data[0]["da_count"] + 1,
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            client.table("councils").insert({
                "name": name, "state": state, "slug": slug, "da_count": 1,
            }).execute()
    except Exception as e:
        print(f"[Supabase] Error updating council DA count: {e}")


def increment_postcode_da_count(postcode: str, state: str, suburb: str):
    if not postcode:
        return
    client = _get_client()
    slug = f"{postcode}-{_slugify(suburb)}"
    try:
        existing = (
            client.table("postcodes")
            .select("id, da_count, suburbs")
            .eq("postcode", postcode)
            .eq("state", state)
            .limit(1)
            .execute()
        )
        if existing.data:
            row = existing.data[0]
            suburbs = set(row.get("suburbs") or [])
            suburbs.add(suburb)
            client.table("postcodes").update({
                "da_count": row["da_count"] + 1,
                "suburbs": list(suburbs),
            }).eq("id", row["id"]).execute()
        else:
            client.table("postcodes").insert({
                "postcode": postcode, "state": state, "suburbs": [suburb],
                "da_count": 1, "slug": slug,
            }).execute()
    except Exception as e:
        print(f"[Supabase] Error updating postcode DA count: {e}")
