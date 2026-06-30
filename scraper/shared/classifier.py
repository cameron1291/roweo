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
project type for a residential/extension builder lead-matching system.

Valid types:
- new_dwelling: new house, dwelling, knockdown rebuild
- extension: addition, second storey, extension to existing dwelling
- renovation: internal alterations, renovation, refurbishment
- granny_flat: secondary dwelling, granny flat, ancillary dwelling
- pool: swimming pool, spa
- demolition: demolition only, no rebuild mentioned
- duplex: dual occupancy, duplex, townhouses (small scale, 2-4 dwellings)
- commercial: retail, office, industrial, large multi-unit (5+ dwellings)
- other: anything that doesn't clearly fit, or description too vague

Return ONLY valid JSON, nothing else:
{"project_type": "extension", "confidence": 0.0}

confidence is 0.0-1.0 reflecting how clearly the description matches the type.
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
        return {
            "project_type": project_type,
            "confidence": float(result.get("confidence", 0.0)),
        }
    except Exception as e:
        print(f"[Classifier] Error: {e}")
        return {"project_type": "other", "confidence": 0.0}
