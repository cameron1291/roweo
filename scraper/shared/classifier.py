"""
classifier.py - Single-stage DeepSeek classification of DA descriptions into project types.
Pattern adapted from ~/launchpad/crawler/shared/scorer.py.
"""

import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)
MODEL = "deepseek-chat"

PROJECT_TYPES = [
    "new_dwelling", "extension", "renovation", "granny_flat",
    "pool", "demolition", "duplex", "commercial", "other",
]

CLASSIFY_SYSTEM = """
You classify Australian development application (DA) descriptions into a fixed
project type for a residential/extension builder lead-matching system, and
estimate the construction cost in AUD.

Valid project types:
- new_dwelling: new house, dwelling, knockdown rebuild
- extension: addition, second storey, extension to existing dwelling
- renovation: internal alterations, renovation, refurbishment
- granny_flat: secondary dwelling, granny flat, ancillary dwelling
- pool: swimming pool, spa
- demolition: demolition only, no rebuild mentioned
- duplex: dual occupancy, duplex, townhouses (small scale, 2-4 dwellings)
- commercial: retail, office, industrial, large multi-unit (5+ dwellings)
- other: anything that doesn't clearly fit, or description too vague

Typical Australian construction costs (AUD) for estimated_value_aud:
- new_dwelling: 400000–900000 (depends on size/area)
- extension: 80000–350000
- renovation: 30000–150000
- granny_flat: 100000–200000
- pool: 30000–80000
- demolition: 15000–50000
- duplex: 600000–1400000
- commercial: 200000–2000000
- other: null

Return ONLY valid JSON, nothing else:
{"project_type": "extension", "confidence": 0.0, "estimated_value_aud": 150000}

confidence is 0.0-1.0. estimated_value_aud is an integer (no decimals) or null if other/unclear.
"""


def passes_strict_filter(description: str) -> bool:
    """Zero-cost pre-filter — skip the API call for unusably short descriptions."""
    return bool(description) and len(description.strip()) >= 20


def classify_project_type(description: str) -> dict:
    if not passes_strict_filter(description):
        return {"project_type": "other", "confidence": 0.0}

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": CLASSIFY_SYSTEM},
                {"role": "user", "content": f"DA description:\n---\n{description[:1000]}\n---"},
            ],
            temperature=0.1,
            max_tokens=80,
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
        project_type = result.get("project_type", "other")
        if project_type not in PROJECT_TYPES:
            project_type = "other"
        value_raw = result.get("estimated_value_aud")
        try:
            estimated_value = int(value_raw) if value_raw is not None else None
        except (ValueError, TypeError):
            estimated_value = None
        return {
            "project_type": project_type,
            "confidence": float(result.get("confidence", 0.0)),
            "estimated_value_aud": estimated_value,
        }
    except Exception as e:
        print(f"[Classifier] Error: {e}")
        return {"project_type": "other", "confidence": 0.0, "estimated_value_aud": None}
