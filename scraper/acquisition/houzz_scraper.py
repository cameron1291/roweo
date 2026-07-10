"""
houzz_scraper.py — Scrape Houzz "Find a Pro" directory for NSW builders.

Houzz listing pages are JS-rendered so we use Selenium + Chrome (headless).
For each listing we extract: company name, Houzz profile URL, suburb.
Then we visit each profile page to get the company website.
The enricher extracts the full street address from the company's website.

Usage:
  python houzz_scraper.py            # all categories + locations
  python houzz_scraper.py --dry-run  # print matches without inserting
"""

import argparse
import glob
import logging
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

CATEGORIES = [
    'general-contractor',
    'home-builder',
    'renovation',
]

LOCATIONS = [
    'sydney-au',
    'newcastle-au',
    'wollongong-au',
    'central-coast-au',
    'parramatta-au',
    'north-shore-sydney-au',
    'northern-beaches-sydney-au',
    'inner-west-sydney-au',
    'eastern-suburbs-sydney-au',
]

USER_AGENT = (
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
)

CHROME_BINARY = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def _find_chromedriver() -> str:
    """Locate the actual chromedriver binary in the webdriver_manager cache."""
    from webdriver_manager.chrome import ChromeDriverManager
    ChromeDriverManager().install()  # ensures it's downloaded
    # wdm sometimes returns an auxiliary file; search for the real binary
    patterns = [
        os.path.expanduser('~/.wdm/drivers/chromedriver/mac64/*/chromedriver-mac-x64/chromedriver'),
        os.path.expanduser('~/.wdm/drivers/chromedriver/mac-arm64/*/chromedriver-mac-arm64/chromedriver'),
        os.path.expanduser('~/.wdm/drivers/chromedriver/mac64/*/chromedriver'),
    ]
    for pat in patterns:
        hits = sorted(glob.glob(pat))
        if hits:
            return hits[-1]
    raise FileNotFoundError('chromedriver binary not found in wdm cache')


def _get_driver():
    """Create a headless Chrome Selenium driver."""
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options

    opts = Options()
    opts.add_argument('--headless')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    opts.add_argument('--disable-gpu')
    opts.add_argument(f'--user-agent={USER_AGENT}')
    opts.add_argument('--lang=en-AU')
    if os.path.exists(CHROME_BINARY):
        opts.binary_location = CHROME_BINARY

    return webdriver.Chrome(service=Service(_find_chromedriver()), options=opts)


def _parse_listing_html(html: str) -> list[dict]:
    """Parse Houzz listing page HTML for pro cards."""
    soup = BeautifulSoup(html, 'html.parser')
    results = []
    seen_hrefs: set[str] = set()

    # Approach 1: look for structured pro cards
    cards = (
        soup.select('[data-component*="ProResult"]')
        or soup.select('[class*="hz-pro-search-result"]')
        or soup.select('[class*="ProResultCard"]')
    )

    if cards:
        for card in cards:
            name_el = card.find(['h2', 'h3']) or card.find(class_=re.compile(r'name|title', re.I))
            name = name_el.get_text(strip=True) if name_el else ''
            if not name or len(name) < 3:
                continue
            link_el = card.find('a', href=re.compile(r'/professionals/'))
            href = link_el['href'] if link_el else None
            if not href or href in seen_hrefs:
                continue
            seen_hrefs.add(href)
            full_href = f'https://www.houzz.com.au{href}' if href.startswith('/') else href
            loc_el = card.find(class_=re.compile(r'location|city|suburb', re.I))
            suburb = loc_el.get_text(strip=True) if loc_el else None
            results.append({'company_name': name, 'profile_url': full_href, 'suburb': suburb})
        return results

    # Approach 2: harvest /professionals/ deep links (at least 3 path segments)
    for link in soup.find_all('a', href=re.compile(r'/professionals/[^/]+/[^/]+/[^/]+')):
        href = link.get('href', '')
        if '/find-pros' in href or href in seen_hrefs:
            continue
        seen_hrefs.add(href)
        name_el = link.find(['h2', 'h3', 'strong']) or link.find(class_=re.compile(r'name|title', re.I))
        name = name_el.get_text(strip=True) if name_el else link.get_text(strip=True)
        name = name.strip()
        if not name or len(name) < 3:
            continue
        full_href = f'https://www.houzz.com.au{href}' if href.startswith('/') else href
        results.append({'company_name': name, 'profile_url': full_href, 'suburb': None})

    return results


def _parse_profile_html(html: str) -> dict:
    """Parse Houzz pro profile page for website, phone, location."""
    soup = BeautifulSoup(html, 'html.parser')
    data: dict = {}

    # Website — external link not pointing to houzz/facebook/instagram
    for a in soup.find_all('a', href=True):
        href = a['href']
        if (href.startswith('http')
                and 'houzz' not in href
                and 'facebook' not in href
                and 'instagram' not in href
                and 'twitter' not in href
                and 'linkedin' not in href):
            data['website'] = href.rstrip('/')
            break

    # Phone
    tel = soup.find('a', href=re.compile(r'^tel:'))
    if tel:
        data['phone'] = tel['href'].replace('tel:', '').strip()

    # Suburb / location
    for sel in [
        {'class': re.compile(r'location|city|suburb|address', re.I)},
    ]:
        loc_el = soup.find(**sel)
        if loc_el:
            text = loc_el.get_text(strip=True)
            if text:
                data['suburb'] = text
                break

    return data


def _scrape_listing(driver, url: str) -> list[dict]:
    try:
        driver.get(url)
        time.sleep(4)
        return _parse_listing_html(driver.page_source)
    except Exception as e:
        log.warning(f'  Listing page failed ({url}): {e}')
        return []


def _scrape_profile(driver, profile_url: str) -> dict:
    try:
        driver.get(profile_url)
        time.sleep(2)
        return _parse_profile_html(driver.page_source)
    except Exception as e:
        log.debug(f'  Profile page failed ({profile_url}): {e}')
        return {}


def run(max_pages_per_category: int = 5, dry_run: bool = False) -> dict:
    supabase = None if dry_run else _get_client()
    existing_lower: set[str] = set()

    if supabase:
        log.info('Loading existing prospect names...')
        resp = supabase.table('builder_prospects').select('company_name').limit(5000).execute()
        existing_lower = {r['company_name'].lower() for r in (resp.data or [])}
        log.info(f'  {len(existing_lower)} existing prospects loaded')

    http_session = requests.Session()
    http_session.headers.update({'User-Agent': USER_AGENT})

    all_candidates: dict[str, dict] = {}
    total_inserted = 0
    total_skipped = 0

    driver = _get_driver()
    try:
        # ── Phase 1: collect listing cards ──────────────────────────────
        for category in CATEGORIES:
            for location in LOCATIONS:
                for pg in range(1, max_pages_per_category + 1):
                    if pg == 1:
                        url = f'https://www.houzz.com.au/professionals/{category}/{location}-professionals'
                    else:
                        url = f'https://www.houzz.com.au/professionals/{category}/{location}-professionals/p/{pg}'

                    log.info(f'Listing: {category}/{location} page {pg}')
                    listings = _scrape_listing(driver, url)

                    if not listings:
                        log.info('  No results — moving to next')
                        break

                    for item in listings:
                        key = item['company_name'].lower()
                        if key not in all_candidates:
                            all_candidates[key] = item

                    log.info(f'  {len(listings)} found, total unique: {len(all_candidates)}')
                    time.sleep(2)

        log.info(f'\nTotal unique Houzz listings collected: {len(all_candidates)}')

        if dry_run:
            for item in list(all_candidates.values())[:20]:
                log.info(f'  [DRY RUN] {item["company_name"]} | suburb={item.get("suburb") or "—"}')
            return {'inserted': 0, 'skipped': 0, 'found': len(all_candidates)}

        # ── Phase 2: visit profiles for website, then enrich ────────────
        from acquisition.enricher import enrich_new_candidate
        from acquisition.abr_scraper import lookup_abn_by_name

        for key, item in all_candidates.items():
            name = item['company_name']
            if name.lower() in existing_lower:
                total_skipped += 1
                continue

            log.info(f'Processing: {name}')

            profile_data = {}
            if item.get('profile_url'):
                profile_data = _scrape_profile(driver, item['profile_url'])
                time.sleep(1.5)

            website = profile_data.get('website')
            if not website:
                log.info(f'  SKIP {name} — no website on Houzz profile')
                total_skipped += 1
                continue

            abn = lookup_abn_by_name(http_session, name)
            if abn:
                time.sleep(0.3)

            candidate = {
                'company_name': name,
                'website': website,
                'phone': profile_data.get('phone') or item.get('phone'),
                'postal_address': None,
                'abn': abn,
                'source': 'houzz',
            }

            inserted = enrich_new_candidate(supabase, candidate, existing_lower)
            if inserted:
                existing_lower.add(name.lower())
                total_inserted += 1
                if total_inserted % 10 == 0:
                    log.info(f'  ...{total_inserted} inserted')
            else:
                total_skipped += 1

            time.sleep(1.5)

    finally:
        driver.quit()

    log.info(f'\nDone — inserted: {total_inserted}, skipped: {total_skipped}')
    return {'inserted': total_inserted, 'skipped': total_skipped}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape Houzz Find a Pro for NSW builders')
    parser.add_argument('--pages', type=int, default=5, help='Max pages per category+location combo')
    parser.add_argument('--dry-run', action='store_true', help='Print matches without inserting')
    args = parser.parse_args()
    run(args.pages, args.dry_run)
