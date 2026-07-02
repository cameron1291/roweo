"""
generate_suburb_content.py — AI-generated suburb pages for SEO.

Generates 400-600 words of unique, suburb-specific content per suburb using DeepSeek.
Covers: local building scene, typical projects, council context, property types,
growth trends, and why the area is active for residential construction.

Run after adding ai_content column:
  python generate_suburb_content.py --limit 50      # do 50 at a time
  python generate_suburb_content.py --state NSW     # NSW only
  python generate_suburb_content.py --force         # regenerate existing
"""

import argparse
import logging
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from shared.supabase_client import _get_client
from openai import OpenAI

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

DEEPSEEK_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
client = OpenAI(api_key=DEEPSEEK_KEY, base_url='https://api.deepseek.com')

STATE_COUNCILS = {
    'NSW': {
        'Parramatta': 'City of Parramatta Council',
        'Blacktown': 'Blacktown City Council',
        'Liverpool': 'Liverpool City Council',
        'Penrith': 'Penrith City Council',
        'Sydney': 'City of Sydney Council',
        'Sutherland': 'Sutherland Shire Council',
        'Hornsby': 'Hornsby Shire Council',
        'Randwick': 'Randwick City Council',
        'Campbelltown': 'Campbelltown City Council',
        'Ryde': 'City of Ryde Council',
        'Fairfield': 'Fairfield City Council',
        'default': 'local council',
    },
    'ACT': {'default': 'ACT Planning Directorate'},
}

PROJECT_TYPE_DESCRIPTIONS = {
    'extension': 'home extensions and first-floor additions',
    'renovation': 'internal renovations and refurbishments',
    'new_dwelling': 'new home construction',
    'granny_flat': 'granny flat and secondary dwelling construction',
    'duplex': 'duplex and dual-occupancy builds',
    'pool': 'swimming pool and outdoor living installations',
    'demolition': 'knockdown-rebuild projects',
    'commercial': 'light commercial fitouts',
}


def get_council(suburb: str, state: str) -> str:
    councils = STATE_COUNCILS.get(state, {})
    return councils.get(suburb, councils.get('default', f'{state} council'))


def generate_content(suburb: str, state: str, da_count: int, postcode: str,
                     top_types: list[dict]) -> str:
    council = get_council(suburb, state)
    type_desc = ', '.join(
        PROJECT_TYPE_DESCRIPTIONS.get(t['type'], t['type'])
        for t in top_types[:3]
    ) if top_types else 'extensions, renovations, and new dwellings'

    prompt = f"""You are writing web copy for an Australian construction industry platform. Write 500-600 words about the residential building scene in {suburb}, {state}.

Facts you have:
- {da_count} development applications lodged there
- Most active project types: {type_desc}
- Local council: {council}
- Postcode: {postcode or 'not specified'}

Write as if you are a local who has worked in the construction industry in {suburb} for years. Use plain, direct Australian English — the kind you'd read in a trade publication, not a corporate website. Short sentences. Specific details. No waffle.

Do NOT use:
- "In conclusion", "Furthermore", "It's worth noting", "It is important to"
- Lists or bullet points
- Headings or subheadings
- Any markdown formatting
- Phrases like "as mentioned above", "this article", "we can see"
- Generic filler sentences that could apply to any suburb

DO include:
- The name {suburb} used naturally throughout (not forced)
- Specific observations about what homeowners there typically build and why
- How {council} handles DAs — turnaround, common conditions, what builders should know
- What the local housing stock looks like (period homes, new estates, mixed, etc. — be specific to this area)
- Who the clients are (upsizers, renovators, knockdown-rebuilders, investors — be specific)
- A realistic picture of the market — not salesy, just factual

Write 5-6 paragraphs of flowing prose. Make each paragraph cover a distinct angle. Vary sentence length. Sound like a real person who knows this suburb."""

    response = client.chat.completions.create(
        model='deepseek-chat',
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=900,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


def get_top_types_for_suburb(c, suburb: str, state: str) -> list[dict]:
    r = c.table('development_applications') \
        .select('project_type') \
        .ilike('suburb', suburb) \
        .eq('state', state) \
        .execute()
    counts: dict[str, int] = {}
    for row in (r.data or []):
        t = row.get('project_type') or 'other'
        counts[t] = counts.get(t, 0) + 1
    return sorted([{'type': k, 'count': v} for k, v in counts.items()],
                  key=lambda x: -x['count'])[:3]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=50)
    parser.add_argument('--state', default=None)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    c = _get_client()

    q = c.table('suburbs').select('id,name,state,postcode,da_count,ai_content') \
        .gt('da_count', 3) \
        .order('da_count', desc=True) \
        .limit(args.limit * 3)

    if args.state:
        q = q.eq('state', args.state)

    rows = q.execute().data or []

    if not args.force:
        rows = [r for r in rows if not r.get('ai_content')]

    rows = rows[:args.limit]
    log.info(f'Generating content for {len(rows)} suburbs')

    done = 0
    for row in rows:
        suburb = row['name']
        state = row['state']
        log.info(f'[{done+1}/{len(rows)}] {suburb}, {state}')

        try:
            top_types = get_top_types_for_suburb(c, suburb, state)
            content = generate_content(
                suburb=suburb,
                state=state,
                da_count=row['da_count'],
                postcode=row.get('postcode') or '',
                top_types=top_types,
            )
            c.table('suburbs').update({
                'ai_content': content,
                'ai_content_updated_at': 'now()',
            }).eq('id', row['id']).execute()
            log.info(f'  ✓ {len(content)} chars')
            done += 1
            time.sleep(0.5)  # Stay under DeepSeek rate limit
        except Exception as e:
            log.error(f'  ✗ {suburb}: {e}')

    log.info(f'Done — generated content for {done}/{len(rows)} suburbs')


if __name__ == '__main__':
    main()
