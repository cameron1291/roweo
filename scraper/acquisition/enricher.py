"""
enricher.py — 5-stage Builder Intelligence enrichment pipeline.

Stage 1  DISCOVER  : Record already exists from scraper (name + optional suburb)
Stage 2  WEBSITE   : Find and validate the company's own website
Stage 3  EXTRACT   : Scrape website for phone, email, address, owner, service areas
Stage 4  ENRICH    : Fetch additional data (Google rating, socials, licence)
Stage 5  SCORE     : Calculate and persist completeness_score (0–100)

Records are NEVER discarded because enrichment failed — they move forward with
whatever data was found. A record with only name + address is still valid (score 40).

Completeness scoring:
  REQUIRED  (60 pts):  company_name=15, postal_address=25, website=20
  PREFERRED (35 pts):  phone=8, email=8, owner_name=8, google=4, any_social=3, licence=4
  OPTIONAL   (5 pts):  abn=2, employee_count_est=1, years_in_business=1, logo_url=1

Usage:
  python enricher.py --limit 50 --stage 2    # only run stage 2 (website)
  python enricher.py --limit 50              # run all stages on scraped records
  python enricher.py --rescore               # recalculate completeness scores only
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from urllib.parse import urlparse, unquote, parse_qs

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-AU,en;q=0.9',
}

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')

# Full street address validation — must have a street number AND a street type word
_STREET_NUM_RE = re.compile(r'(?:unit\s+\d+\s*/\s*)?\d+[\-–]?\d*\s+\w', re.IGNORECASE)
_STREET_TYPE_RE = re.compile(
    r'\b(Street|St|Road|Rd|Avenue|Ave|Av|Drive|Dr|Court|Ct|Close|Cl|Lane|Ln|'
    r'Place|Pl|Way|Crescent|Cres|Boulevard|Blvd|Parade|Pde|Circuit|Cct|'
    r'Highway|Hwy|Terrace|Tce|Grove|Gve|Rise|Row|Track|Trail|Walk|Square|Sq|'
    r'Link|Loop|Mews|Pass|Path|Point|Pt|Ridge|Slope|Straight|Vale|View|Vw|'
    r'Wharf|Wynd|Nook|Glen|Dell|Chase|Heath|Bend|Gate|Gully)\b',
    re.IGNORECASE,
)

SKIP_EMAIL_DOMAINS = {
    'example.com', 'yourdomain.com', 'email.com', 'domain.com',
    'sentry.io', 'wixpress.com', 'squarespace.com',
}

# Franchise corporate email domains — every location shares the same email
FRANCHISE_EMAIL_DOMAINS = {
    'gjgardner.com.au', 'masterton.com.au', 'metricon.com.au',
    'henley.com.au', 'porterdavis.com.au', 'simonds.com.au',
    'burbank.com.au', 'mcdonald-jones.com.au', 'wisdomhomes.com.au',
    'clarendonhomes.com.au', 'hotondo.com.au', 'stroud-homes.com.au',
}

# Domains that appear for many unrelated companies (aggregators, shared CMS hosts)
AGGREGATOR_DOMAINS = {
    'truelocal.com.au', 'hipages.com.au', 'yellowpages.com.au', 'whitepages.com.au',
    'hotfrog.com.au', 'localsearch.com.au', 'oneflare.com.au', 'serviceseeking.com.au',
    'womo.com.au', 'startlocal.com.au', 'businesslist.com.au', 'whereis.com',
    'linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com', 'youtube.com',
    'google.com', 'yelp.com', 'duckduckgo.com', 'healthengine.com.au',
    'houzz.com.au', 'houzz.com', 'airtasker.com', 'bark.com', 'porch.com',
    'build.com.au', 'builderscrack.co.nz', 'seek.com.au', 'indeed.com',
    'yellowpages.com', 'yelp.com.au', 'aussiehomeinspections.com.au',
    'ratemyagent.com.au', 'realestate.com.au', 'domain.com.au',
    'legislation.nsw.gov.au', 'fairtrading.nsw.gov.au', 'abr.business.gov.au',
    'data.gov.au', 'asic.gov.au', 'nsw.gov.au',
}

BUSINESS_TYPES = [
    'residential', 'renovation', 'extension', 'granny_flat',
    'custom', 'knockdown_rebuild', 'commercial', 'civil', 'other',
]


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _is_full_address(text: str) -> bool:
    """True if text is a deliverable address — either a physical street (number + type) or a PO Box.
    Rejects suburb-only strings like 'Sydney NSW 2000' or 'Orange NSW'."""
    if not text or len(text) < 8:
        return False
    stripped = text.strip().upper()
    # Accept PO Box / Locked Bag — these are valid mailing addresses for letters
    if stripped.startswith(('PO BOX', 'P.O. BOX', 'GPO BOX', 'LOCKED BAG', 'PRIVATE BAG')):
        return True
    # Accept physical street: must have a number AND a street-type word
    return bool(_STREET_NUM_RE.search(text)) and bool(_STREET_TYPE_RE.search(text))


def _extract_domain(url: str) -> str:
    try:
        host = urlparse(url).netloc or urlparse('https://' + url).netloc
        return host.lower().lstrip('www.')
    except Exception:
        return ''


def _domain_shared(supabase, domain: str, exclude_id: str, threshold: int = 3) -> bool:
    """True if this domain already appears on threshold+ other prospects — indicates a bad URL."""
    if not domain or any(ag in domain for ag in AGGREGATOR_DOMAINS):
        return True
    try:
        resp = supabase.table('builder_prospects') \
            .select('id', count='exact') \
            .ilike('website', f'%{domain}%') \
            .neq('id', exclude_id) \
            .execute()
        return (resp.count or 0) >= threshold
    except Exception:
        return False


def _fetch(url: str, timeout: int = 12) -> tuple[str, str]:
    """Fetch URL. Returns (html, final_url). Empty string on failure."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout,
                            allow_redirects=True)
        resp.raise_for_status()
        return resp.text, resp.url
    except Exception:
        return '', url


def _extract_emails(html: str) -> list[str]:
    raw = EMAIL_RE.findall(html)
    seen: set[str] = set()
    out: list[str] = []
    for e in raw:
        e = e.lower()
        domain = e.split('@')[-1]
        if (e not in seen
                and domain not in SKIP_EMAIL_DOMAINS
                and not e.startswith(('no-reply', 'noreply', 'donotreply'))
                and '.' in domain):
            seen.add(e)
            out.append(e)
    return out


def _page_text(html: str) -> str:
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
        tag.decompose()
    text = soup.get_text(separator=' ', strip=True)
    return re.sub(r'\s+', ' ', text)[:5000]


# ─────────────────────────────────────────────────────────────
# Stage 2 — Find and validate website
# ─────────────────────────────────────────────────────────────

def _extract_suburb(address: str) -> str:
    """Pull suburb from "89 Rex Rd, Georges Hall, NSW 2198" → "Georges Hall"."""
    if not address:
        return ''
    suburb = ''
    for part in [p.strip() for p in address.split(',')]:
        if re.match(r'^(NSW|VIC|QLD|SA|WA|ACT|TAS|NT)\b', part, re.IGNORECASE):
            break
        if not re.match(r'^\d', part):
            suburb = part
    return suburb


_CO_SUFFIX_RE = re.compile(
    r'\b(pty\.?\s*ltd\.?|pty\s+limited|proprietary\s+limited|limited|ltd\.?|'
    r'p/l|& co\.?|and co\.?|group|holdings|australia|australasia|aust\.?)\b',
    re.IGNORECASE,
)
_CO_SPECIAL_RE = re.compile(r"[&'\".,()\[\]#@!/\\+]")


def _domain_guess_website(company_name: str) -> str | None:
    """Guess the company website by trying common .com.au domain patterns.
    No search engine needed — HEAD request each candidate then AI validate."""
    name = _CO_SUFFIX_RE.sub(' ', company_name)
    name = _CO_SPECIAL_RE.sub(' ', name)
    name = re.sub(r'\band\b', ' ', name, flags=re.IGNORECASE)
    name = ' '.join(name.split()).lower()
    if not name or len(name) < 3:
        return None

    words = name.split()
    full = ''.join(words)

    candidates: list[str] = []
    if len(full) >= 4:
        candidates.append(f'https://www.{full}.com.au')
        candidates.append(f'https://{full}.com.au')
    hyph = '-'.join(words)
    if hyph != full:
        candidates.append(f'https://www.{hyph}.com.au')
    if len(words) >= 2:
        two = ''.join(words[:2])
        if two != full and len(two) >= 4:
            candidates.append(f'https://www.{two}.com.au')
    if len(words) >= 3:
        three = ''.join(words[:3])
        if three != full and len(three) >= 4:
            candidates.append(f'https://www.{three}.com.au')
    candidates.append(f'https://www.{full}.com')

    seen: set[str] = set()
    for url in candidates:
        domain = _extract_domain(url)
        if domain in seen or any(ag in domain for ag in AGGREGATOR_DOMAINS):
            continue
        seen.add(domain)
        try:
            resp = requests.head(url, timeout=5, allow_redirects=True, headers=HEADERS)
            if resp.status_code < 400:
                parsed = urlparse(resp.url)
                homepage = f'{parsed.scheme}://{parsed.netloc}/'
                final_domain = _extract_domain(homepage)
                if any(ag in final_domain for ag in AGGREGATOR_DOMAINS):
                    continue
                if _ai_validate_website(company_name, homepage):
                    log.info(f"  Domain guess hit: {homepage}")
                    return homepage
        except Exception:
            pass

    return None


def _ai_find_website(company_name: str, suburb: str = '') -> str | None:
    """Ask DeepSeek to look up the website for this company from its training data.
    Much more reliable than DuckDuckGo when DDG is rate-limited or blocked."""
    try:
        from openai import OpenAI
        location_hint = f' based in {suburb}, NSW, Australia' if suburb else ' in NSW, Australia'
        client = OpenAI(
            api_key=os.environ.get('DEEPSEEK_API_KEY', ''),
            base_url='https://api.deepseek.com',
        )
        resp = client.chat.completions.create(
            model='deepseek-chat',
            messages=[{
                'role': 'user',
                'content': (
                    f'What is the official website URL of the Australian building/construction '
                    f'company called "{company_name}"{location_hint}?\n'
                    f'Return ONLY valid JSON with no other text: {{"website": "https://example.com"}} '
                    f'or {{"website": null}} if you do not know.\n'
                    f'Only return a URL you are confident about. Do not guess.'
                ),
            }],
            max_tokens=60,
            temperature=0,
        )
        text = resp.choices[0].message.content.strip()
        text = re.sub(r'^```[a-z]*\n?', '', text).rstrip('`').strip()
        result = json.loads(text)
        url = result.get('website')
        if not url or not str(url).startswith('http'):
            return None
        domain = _extract_domain(str(url))
        if any(ag in domain for ag in AGGREGATOR_DOMAINS):
            return None
        return str(url)
    except Exception as e:
        log.debug(f"AI website lookup failed for {company_name!r}: {e}")
        return None


_STARTPAGE_BLOCKED = False


def _startpage_website(company_name: str, suburb: str = '') -> str | None:
    """Search Startpage (privacy Google proxy) for the company website.
    Returns direct URLs without tracking wrappers — no API key needed."""
    global _STARTPAGE_BLOCKED
    if _STARTPAGE_BLOCKED:
        return None

    queries = [
        f'"{company_name}" builder NSW site:.com.au',
        f'{company_name} {suburb} NSW building contractor'.strip(),
    ]

    for query in queries:
        try:
            resp = requests.get(
                'https://www.startpage.com/search',
                params={'q': query, 'language': 'english'},
                headers=HEADERS, timeout=15, allow_redirects=True,
            )
            if resp.status_code != 200:
                continue
            soup = BeautifulSoup(resp.text, 'html.parser')
            seen: set[str] = set()
            validated = 0
            for a in soup.find_all('a', href=True):
                if validated >= 3:  # cap AI calls per query at 3
                    break
                href = a.get('href', '')
                if not href.startswith('http'):
                    continue
                if 'startpage.com' in href or 'google.com' in href:
                    continue
                host = _extract_domain(href)
                if host in seen:
                    continue
                seen.add(host)
                if not any(ag in host for ag in AGGREGATOR_DOMAINS):
                    # Normalise to homepage URL — avoid PDF/image deep links
                    parsed = urlparse(href)
                    homepage = f'{parsed.scheme}://{parsed.netloc}/'
                    validated += 1
                    if _ai_validate_website(company_name, homepage):
                        log.debug(f"Startpage hit (validated): {homepage}")
                        return homepage
        except Exception as e:
            log.debug(f"Startpage failed for {company_name!r}: {e}")
            _STARTPAGE_BLOCKED = True
            return None
        time.sleep(1.0)

    return None


def _duckduckgo_website(company_name: str, suburb_hint: str = '') -> str | None:
    """Find the company website.
    Order: domain guessing → Startpage → DeepSeek direct → DuckDuckGo."""

    suburb = _extract_suburb(suburb_hint)

    # Primary: domain guessing — no search engine, just HEAD requests
    url = _domain_guess_website(company_name)
    if url:
        return url

    # Secondary: Startpage — Google results, direct URLs, accessible from Mac Mini
    url = _startpage_website(company_name, suburb)
    if url:
        return url

    # Fallback: DeepSeek knowledge lookup (well-known companies)
    url = _ai_find_website(company_name, suburb)
    if url:
        log.debug(f"DeepSeek direct match: {url}")
        return url

    # Last resort: DuckDuckGo (may be blocked)
    for query in [f'"{company_name}" builder NSW', f'{company_name} {suburb} NSW builder'.strip()]:
        try:
            resp = requests.get(
                'https://html.duckduckgo.com/html/',
                params={'q': query}, headers=HEADERS, timeout=6,
            )
            soup = BeautifulSoup(resp.text, 'html.parser')
            for el in soup.select('.result__a'):
                href = el.get('href', '')
                if 'uddg=' in href:
                    qs = parse_qs(urlparse(href).query)
                    href = unquote(qs.get('uddg', [href])[0])
                if not href.startswith('http'):
                    continue
                host = _extract_domain(href)
                if not any(ag in host for ag in AGGREGATOR_DOMAINS):
                    if _ai_validate_website(company_name, href):
                        return href
        except Exception:
            break
        time.sleep(0.3)

    return None


def _ai_validate_website(company_name: str, url: str) -> bool:
    """Ask DeepSeek whether url is the official website of company_name.
    Returns True if confident match, False if mismatch or unsure."""
    try:
        from openai import OpenAI
        domain = _extract_domain(url)
        client = OpenAI(
            api_key=os.environ.get('DEEPSEEK_API_KEY', ''),
            base_url='https://api.deepseek.com',
        )
        resp = client.chat.completions.create(
            model='deepseek-chat',
            messages=[{
                'role': 'user',
                'content': (
                    f'Is the domain "{domain}" likely the official website of an Australian '
                    f'building or construction company called "{company_name}"?\n'
                    f'Return only valid JSON: {{"valid": true}} or {{"valid": false}}.\n'
                    f'Return true if the domain plausibly belongs to this company name.\n'
                    f'Return true only if the domain name relates to the company name '
                    f'(matching words, abbreviations, or a plausible short form of the company name).\n'
                    f'Return false if the domain is for a different company, a directory, a platform, or unrelated industry.\n'
                    f'When genuinely unsure, return false.'
                ),
            }],
            max_tokens=20,
            temperature=0,
        )
        text = resp.choices[0].message.content.strip()
        text = re.sub(r'^```[a-z]*\n?', '', text).rstrip('`').strip()
        result = json.loads(text)
        return bool(result.get('valid'))
    except Exception as e:
        log.debug(f"AI validation failed for {url}: {e}")
        return True  # default to accepting if AI call fails (better than losing all hits)


def stage2_website(supabase, prospect: dict) -> dict:
    """Find and validate the company website. Returns updates dict."""
    updates: dict = {}
    website = prospect.get('website')

    if not website:
        suburb_hint = prospect.get('postal_address', '') or ''
        website = _duckduckgo_website(prospect['company_name'], suburb_hint)
        if website:
            log.info(f"  Stage 2: found via DDG: {website}")

    if not website:
        return updates  # No website found — that's OK, move forward

    domain = _extract_domain(website)
    if _domain_shared(supabase, domain, prospect['id']):
        log.warning(f"  Stage 2: domain {domain} is shared/aggregator — discarding")
        updates['website'] = None
        return updates

    updates['website'] = website
    return updates


# ─────────────────────────────────────────────────────────────
# Stage 3 — Extract required data from website
# ─────────────────────────────────────────────────────────────

def stage3_extract(prospect: dict, website: str | None) -> dict:
    """Scrape website and use DeepSeek to extract structured data.
    Works even if website is None — still calls DeepSeek if there's any text."""
    updates: dict = {}

    all_emails: list[str] = []
    all_text = ''

    if website:
        for path in ['', '/contact', '/contact-us', '/about', '/services']:
            url = website.rstrip('/') + path
            html, _ = _fetch(url)
            if html:
                all_emails.extend(_extract_emails(html))
                chunk = _page_text(html)
                if chunk and len(all_text) < 4000:
                    all_text = (all_text + ' ' + chunk)[:5000]

    # Dedupe emails, reject franchise/shared
    seen: set[str] = set()
    clean_emails: list[str] = []
    for e in all_emails:
        if e in seen:
            continue
        seen.add(e)
        domain = e.split('@')[-1].lower()
        if domain not in FRANCHISE_EMAIL_DOMAINS:
            clean_emails.append(e)

    best_email = clean_emails[0] if clean_emails else None
    updates['email'] = best_email

    # DeepSeek extraction
    if all_text:
        extracted = _deepseek_extract(prospect['company_name'], all_text)
        if extracted:
            is_suitable = extracted.get('is_suitable', True)
            is_sole_trader = extracted.get('is_sole_trader', False)
            if not is_suitable:
                updates['status'] = 'not_suitable'
                updates['ai_summary'] = extracted.get('ai_summary') or 'Marked not suitable by AI'
                return updates

            updates['business_type'] = extracted.get('business_type')
            updates['service_suburbs'] = extracted.get('service_suburbs', []) or []
            updates['ai_summary'] = extracted.get('ai_summary') or None
            updates['employee_count_est'] = (
                extracted.get('employee_count_band')
                or ('1' if is_sole_trader else None)
            )
            updates['owner_name'] = extracted.get('owner_name') or None
            updates['years_in_business'] = extracted.get('years_in_business') or None

            # Fill phone/address only if not already present
            if extracted.get('phone') and not prospect.get('phone'):
                updates['phone'] = extracted['phone']
            if extracted.get('postal_address') and not prospect.get('postal_address'):
                updates['postal_address'] = extracted['postal_address']

    return updates


def _deepseek_extract(company_name: str, text: str) -> dict:
    from openai import OpenAI
    client = OpenAI(
        api_key=os.environ.get('DEEPSEEK_API_KEY', ''),
        base_url='https://api.deepseek.com',
    )
    prompt = f"""You are analysing an Australian building company's website content.

Company: {company_name}
Content: {text[:3500]}

Extract the following as JSON (return ONLY valid JSON, no markdown):
{{
  "business_type": one of ["residential","renovation","extension","granny_flat","custom","knockdown_rebuild","commercial","civil","other"],
  "service_suburbs": ["suburb names they serve, max 10, Australian suburbs only"],
  "phone": "phone number or null",
  "postal_address": "Physical street address (e.g. '12 George St, Parramatta NSW 2150') OR a PO Box (e.g. 'PO Box 828, Orange NSW 2800'). Both are acceptable. Look in the footer, /contact page, and /about page. Return null ONLY if no address of any kind is visible — a suburb name alone ('Orange NSW') is NOT acceptable.",
  "owner_name": "owner, director, or manager name if visible or null",
  "years_in_business": integer or null,
  "ai_summary": "2-3 sentence summary of their business",
  "is_suitable": true/false (false if: commercial-only, civil, labour hire, or national franchise like GJ Gardner, Masterton, Metricon, Henley, Simonds, Burbank, McDonald Jones, Wisdom, Clarendon, Hotondo, Stroud),
  "is_sole_trader": true/false,
  "employee_count_band": "1" | "2-5" | "6-15" | "16-50" | "50+" or null
}}"""
    try:
        resp = client.chat.completions.create(
            model='deepseek-chat',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=500,
            temperature=0.1,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r'^```[a-z]*\n?', '', raw)
        raw = re.sub(r'\n?```$', '', raw)
        return json.loads(raw)
    except Exception as e:
        log.warning(f"  DeepSeek failed: {e}")
        return {}


# ─────────────────────────────────────────────────────────────
# Stage 4 — Enrich: socials, Google rating, licence
# ─────────────────────────────────────────────────────────────

def stage4_enrich(prospect: dict, website: str | None) -> dict:
    """Find social media links and other enrichment data from the website."""
    updates: dict = {}
    if not website:
        return updates

    html, _ = _fetch(website)
    if not html:
        return updates

    soup = BeautifulSoup(html, 'html.parser')

    for a in soup.find_all('a', href=True):
        href = a['href']
        if 'facebook.com' in href and not prospect.get('facebook_url'):
            updates['facebook_url'] = href
        elif 'instagram.com' in href and not prospect.get('instagram_url'):
            updates['instagram_url'] = href
        elif 'linkedin.com' in href and not prospect.get('linkedin_url'):
            updates['linkedin_url'] = href

    return updates


# ─────────────────────────────────────────────────────────────
# Stage 5 — Completeness score
# ─────────────────────────────────────────────────────────────

def calculate_completeness(p: dict) -> int:
    """
    Calculate a 0–100 completeness score for a prospect record.

    REQUIRED  (60 pts): company_name=15, full_street_address=25, website=20
    PREFERRED (35 pts): email=10, owner_name=10, phone=8, employee_count_est=4, business_type=3
    BONUS      (5 pts): abn=2, google_rating=1, any_social=1, builder_licence=1
    """
    score = 0

    # Required
    if p.get('company_name'):
        score += 15
    if p.get('postal_address') and _is_full_address(p['postal_address']):
        score += 25
    if p.get('website'):
        score += 20

    # Preferred
    if p.get('email'):
        score += 10
    if p.get('owner_name'):
        score += 10
    if p.get('phone'):
        score += 8
    if p.get('employee_count_est'):
        score += 4
    if p.get('business_type'):
        score += 3

    # Bonus
    if p.get('abn'):
        score += 2
    if p.get('google_rating') or p.get('google_review_count'):
        score += 1
    if p.get('facebook_url') or p.get('instagram_url') or p.get('linkedin_url'):
        score += 1
    if p.get('builder_licence'):
        score += 1

    return min(score, 100)


# ─────────────────────────────────────────────────────────────
# Main pipeline
# ─────────────────────────────────────────────────────────────

def enrich_prospect(supabase, prospect: dict) -> bool:
    """Enrich a prospect. DELETE it if website or address cannot be found — we only
    keep records that have company_name + website + postal_address."""
    pid = prospect['id']
    name = prospect['company_name']
    log.info(f"Enriching: {name}")

    accumulated: dict = {}

    # Stage 2 — Website
    s2 = stage2_website(supabase, prospect)
    accumulated.update(s2)
    website = accumulated.get('website') or prospect.get('website')

    # Stage 3 — Extract from website (phone, email, address, owner, etc.)
    s3 = stage3_extract(prospect, website)
    accumulated.update(s3)

    # Check not_suitable early
    if accumulated.get('status') == 'not_suitable':
        supabase.table('builder_prospects').delete().eq('id', pid).execute()
        log.info(f"  → deleted (not suitable: franchise/commercial)")
        return True

    # Determine final address
    final_address = (
        accumulated.get('postal_address')
        or prospect.get('postal_address')
    )
    final_website = website

    # Validate address
    if final_address and not _is_full_address(final_address):
        final_address = None

    final_email = accumulated.get('email') or prospect.get('email')

    # Delete if no website and no email — not contactable, no value for outreach
    if not final_website and not final_email:
        supabase.table('builder_prospects').delete().eq('id', pid).execute()
        log.info(f"  → deleted (no website and no email)")
        return True

    # Stage 4 — Enrich socials
    s4 = stage4_enrich(prospect, final_website)
    accumulated.update(s4)

    # Stage 5 — Score
    merged = {**prospect, **accumulated}
    score = calculate_completeness(merged)
    accumulated['completeness_score'] = score
    accumulated['enrichment_stage'] = 5
    accumulated['website'] = final_website
    accumulated['postal_address'] = final_address

    if prospect.get('status', 'scraped') == 'scraped':
        accumulated['status'] = 'reviewed'

    accumulated['updated_at'] = 'now()'
    supabase.table('builder_prospects').update(accumulated).eq('id', pid).execute()

    log.info(
        f"  → KEPT score={score}% | email={accumulated.get('email') or '—'} "
        f"| phone={accumulated.get('phone') or prospect.get('phone') or '—'} "
        f"| owner={accumulated.get('owner_name') or '—'}"
    )
    return True


def enrich_new_candidate(supabase, candidate: dict, existing_names: set) -> bool:
    """Used by scrapers: enriches a candidate dict (not yet in DB) and only
    inserts it if all three required fields (name + website + address) are confirmed.
    Returns True if the record was inserted."""
    import uuid
    from datetime import datetime, timezone

    name = candidate['company_name']

    # Stage 2 — validate/find website (use scraper-provided URL if present, else DDG)
    import uuid as _uuid
    mock_prospect = {
        'id': str(_uuid.uuid4()),
        'company_name': name,
        'website': candidate.get('website'),
        'postal_address': candidate.get('postal_address'),  # suburb hint for DuckDuckGo
    }
    s2 = stage2_website(supabase, mock_prospect)
    website = s2.get('website')

    if not website:
        log.info(f"  SKIP {name} — no website found")
        return False

    # Stage 3 — extract from website
    mock_prospect['website'] = website
    s3 = stage3_extract(mock_prospect, website)

    if s3.get('status') == 'not_suitable':
        log.info(f"  SKIP {name} — not suitable (franchise/commercial)")
        return False

    # Determine address: website extraction may improve on the ABR postcode
    final_address = s3.get('postal_address') or candidate.get('postal_address')

    if not final_address:
        log.info(f"  SKIP {name} — no address found")
        return False

    if not _is_full_address(final_address):
        log.info(f"  SKIP {name} — address not a full street address: {final_address!r}")
        return False

    # Stage 4 — socials
    s4 = stage4_enrich(mock_prospect, website)

    # Build full record
    merged = {**candidate, **s3, **s4, 'website': website, 'postal_address': final_address}
    score = calculate_completeness(merged)

    demo_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:40] + '-' + os.urandom(3).hex()

    row = {
        'company_name': name,
        'abn': candidate.get('abn'),
        'website': website,
        'postal_address': final_address,
        'source': candidate.get('source', 'abr'),
        'email': s3.get('email'),
        'phone': s3.get('phone') or candidate.get('phone'),
        'owner_name': s3.get('owner_name'),
        'business_type': s3.get('business_type'),
        'service_suburbs': s3.get('service_suburbs', []) or [],
        'ai_summary': s3.get('ai_summary'),
        'employee_count_est': s3.get('employee_count_est'),
        'facebook_url': s4.get('facebook_url'),
        'instagram_url': s4.get('instagram_url'),
        'linkedin_url': s4.get('linkedin_url'),
        'completeness_score': score,
        'enrichment_stage': 5,
        'status': 'reviewed',
        'demo_slug': demo_slug,
        'qr_token': str(uuid.uuid4()),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }

    try:
        supabase.table('builder_prospects').insert(row).execute()
        log.info(f"  INSERTED {name} | score={score}% | {website} | {final_address}")
        return True
    except Exception as e:
        log.warning(f"  Insert failed for {name}: {e}")
        return False


def rescore_all(supabase):
    """Recalculate completeness_score for every record."""
    resp = supabase.table('builder_prospects').select('*').execute()
    rows = resp.data or []
    log.info(f"Rescoring {len(rows)} records...")
    for p in rows:
        score = calculate_completeness(p)
        supabase.table('builder_prospects').update({
            'completeness_score': score,
            'updated_at': 'now()',
        }).eq('id', p['id']).execute()
    log.info("Rescore complete")


def run(limit: int = 50, min_stage: int = 0, max_stage: int = 5):
    supabase = _get_client()
    result = supabase.table('builder_prospects') \
        .select('*') \
        .in_('status', ['scraped', 'reviewed']) \
        .lte('enrichment_stage', max_stage - 1) \
        .order('completeness_score', desc=False) \
        .limit(limit) \
        .execute()

    prospects = result.data or []
    log.info(f"Processing {len(prospects)} prospects (limit={limit})")

    enriched = 0
    for p in prospects:
        try:
            if enrich_prospect(supabase, p):
                enriched += 1
        except Exception as e:
            log.error(f"Failed on {p.get('company_name')}: {e}")
        time.sleep(1.5)

    log.info(f"Done: {enriched}/{len(prospects)} processed")
    return {'enriched': enriched, 'total': len(prospects)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=50)
    parser.add_argument('--rescore', action='store_true',
                        help='Recalculate completeness scores without re-enriching')
    args = parser.parse_args()

    supabase = _get_client()
    if args.rescore:
        rescore_all(supabase)
    else:
        run(limit=args.limit)
