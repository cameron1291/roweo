"""
oneflare_scraper.py — Scrape the Oneflare business directory for NSW builders.

Tries requests+BeautifulSoup first (fast). If the page looks JS-rendered (no listings
in static HTML), falls back to Selenium + Chrome automatically.

Usage:
  python oneflare_scraper.py            # all categories + locations
  python oneflare_scraper.py --dry-run  # print matches without inserting
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

CHROME_BINARY = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
USER_AGENT_SEL = (
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
)


def _find_chromedriver() -> str:
    """Locate the actual chromedriver binary in the webdriver_manager cache."""
    from webdriver_manager.chrome import ChromeDriverManager
    ChromeDriverManager().install()  # ensures it's downloaded
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


def _get_selenium_driver():
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options

    opts = Options()
    opts.add_argument('--headless')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    opts.add_argument('--disable-gpu')
    opts.add_argument(f'--user-agent={USER_AGENT_SEL}')
    if os.path.exists(CHROME_BINARY):
        opts.binary_location = CHROME_BINARY

    return webdriver.Chrome(service=Service(_find_chromedriver()), options=opts)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

# Category slug → Oneflare URL path segment
CATEGORIES = [
    'builders',
    'home-renovations',
    'extensions',
    'granny-flat-builders',
]

# Location slug
LOCATIONS = [
    'nsw/sydney',
    'nsw/newcastle',
    'nsw/wollongong',
    'nsw/central-coast',
    'nsw/parramatta',
    'nsw/north-shore',
    'nsw/northern-beaches',
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-AU,en;q=0.9',
}


def _parse_listings(html: str) -> list[dict]:
    """Parse Oneflare listing HTML. Returns list of candidate dicts."""
    soup = BeautifulSoup(html, 'html.parser')
    results = []

    # Oneflare business cards typically have class names containing 'business', 'listing', 'card'
    cards = (
        soup.select('[class*="BusinessCard"]')
        or soup.select('[class*="business-card"]')
        or soup.select('[class*="listing-card"]')
        or soup.select('article')
        or soup.select('[data-testid*="business"]')
    )

    for card in cards:
        text = card.get_text(separator=' ', strip=True)
        if len(text) < 10:
            continue

        # Company name
        name_el = (
            card.find(['h2', 'h3'])
            or card.find(class_=re.compile(r'name|title|business', re.I))
        )
        name = name_el.get_text(strip=True) if name_el else None
        if not name or len(name) < 3:
            continue

        # Skip generic/filler cards
        if any(skip in name.lower() for skip in ['advertisement', 'sponsored', 'promoted']):
            continue

        # Website (sometimes shown as an external link on the card)
        website = None
        for a in card.find_all('a', href=True):
            href = a['href']
            if href.startswith('http') and 'oneflare' not in href:
                website = href.rstrip('/')
                break

        # Phone
        phone = None
        tel_link = card.find('a', href=re.compile(r'^tel:'))
        if tel_link:
            phone = tel_link['href'].replace('tel:', '').strip()

        # Suburb / location
        suburb = None
        loc_el = card.find(class_=re.compile(r'location|suburb|city|address', re.I))
        if loc_el:
            suburb = loc_el.get_text(strip=True)

        # Profile URL (for fetching more details)
        profile_url = None
        link_el = card.find('a', href=re.compile(r'/business/|/professionals/'))
        if link_el:
            href = link_el.get('href', '')
            profile_url = f"https://www.oneflare.com.au{href}" if href.startswith('/') else href

        results.append({
            'company_name': name,
            'website': website,
            'phone': phone,
            'suburb': suburb,
            'profile_url': profile_url,
            'source': 'oneflare',
        })

    return results


def _scrape_with_requests(category: str, location: str, page: int) -> list[dict]:
    """Try fetching with requests. Returns empty list if JS-rendered."""
    url = f"https://www.oneflare.com.au/{category}/{location}"
    params = {'page': page} if page > 1 else {}
    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=20)
        r.raise_for_status()
        html = r.text
        # Detect JS-rendered page (minimal static content)
        if html.count('<h') < 3 or 'window.__INITIAL_STATE__' in html and html.count('class=') < 10:
            return []  # signal: needs Playwright
        return _parse_listings(html)
    except Exception as e:
        log.debug(f"  requests failed ({category}/{location} p{page}): {e}")
        return []


def _scrape_with_selenium(driver, category: str, location: str, max_pages: int) -> list[dict]:
    """Fallback Selenium scraper for JS-rendered pages."""
    log.info(f"  Using Selenium for {category}/{location}")
    all_results = []
    try:
        for pg in range(1, max_pages + 1):
            url = f"https://www.oneflare.com.au/{category}/{location}"
            if pg > 1:
                url += f"?page={pg}"

            driver.get(url)
            time.sleep(3)

            listings = _parse_listings(driver.page_source)
            if not listings:
                break
            all_results.extend(listings)
            log.info(f"    Page {pg}: {len(listings)} listings")
            time.sleep(1.5)
    except Exception as e:
        log.warning(f"  Selenium failed ({category}/{location}): {e}")

    return all_results


def run(max_pages: int = 5, dry_run: bool = False) -> dict:
    supabase = None if dry_run else _get_client()
    existing_lower: set[str] = set()

    if supabase:
        log.info("Loading existing prospect names...")
        resp = supabase.table('builder_prospects').select('company_name').limit(5000).execute()
        existing_lower = {r['company_name'].lower() for r in (resp.data or [])}
        log.info(f"  {len(existing_lower)} existing prospects loaded")

    http_session = requests.Session()
    all_candidates: dict[str, dict] = {}
    needs_playwright: set[str] = set()

    # Phase 1: try requests for all combos
    for category in CATEGORIES:
        for location in LOCATIONS:
            for pg in range(1, max_pages + 1):
                log.info(f"Scraping: {category}/{location} page {pg}")
                results = _scrape_with_requests(category, location, pg)

                if results == [] and pg == 1:
                    # Empty on first page = JS-rendered, queue for Playwright
                    needs_playwright.add(f"{category}/{location}")
                    break

                if not results:
                    break  # last page

                for item in results:
                    key = item['company_name'].lower()
                    if key not in all_candidates:
                        all_candidates[key] = item

                log.info(f"  {len(results)} listings, total unique: {len(all_candidates)}")
                time.sleep(1)

    # Phase 2: Selenium for any JS-rendered combos
    if needs_playwright:
        log.info(f"\n{len(needs_playwright)} combos need Selenium: {needs_playwright}")
        try:
            driver = _get_selenium_driver()
            try:
                for combo in needs_playwright:
                    category, location = combo.split('/', 1)
                    results = _scrape_with_selenium(driver, category, location, max_pages)
                    for item in results:
                        key = item['company_name'].lower()
                        if key not in all_candidates:
                            all_candidates[key] = item
            finally:
                driver.quit()
        except Exception as e:
            log.warning(f"Selenium fallback failed — JS-rendered pages skipped: {e}")

    log.info(f"\nTotal unique Oneflare listings: {len(all_candidates)}")

    if dry_run:
        for item in list(all_candidates.values())[:20]:
            log.info(
                f"  [DRY RUN] {item['company_name']} | "
                f"website={item.get('website') or '—'} | "
                f"suburb={item.get('suburb') or '—'}"
            )
        return {'inserted': 0, 'skipped': 0, 'found': len(all_candidates)}

    from acquisition.enricher import enrich_new_candidate
    from acquisition.abr_scraper import lookup_abn_by_name

    total_inserted = 0
    total_skipped = 0

    for item in all_candidates.values():
        name = item['company_name']
        if name.lower() in existing_lower:
            total_skipped += 1
            continue

        # ABN lookup — bonus field only
        abn = lookup_abn_by_name(http_session, name)
        if abn:
            time.sleep(0.3)

        candidate = {
            'company_name': name,
            'website': item.get('website'),   # may be None; enricher tries DuckDuckGo
            'phone': item.get('phone'),
            'postal_address': None,            # enricher extracts full address from website contact page
            'abn': abn,
            'source': 'oneflare',
        }

        inserted = enrich_new_candidate(supabase, candidate, existing_lower)
        if inserted:
            existing_lower.add(name.lower())
            total_inserted += 1
            if total_inserted % 10 == 0:
                log.info(f"  ...{total_inserted} inserted")
        else:
            total_skipped += 1

        time.sleep(1.5)

    log.info(f"\nDone — inserted: {total_inserted}, skipped: {total_skipped}")
    return {'inserted': total_inserted, 'skipped': total_skipped}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape Oneflare builder directory for NSW')
    parser.add_argument('--pages', type=int, default=5, help='Max pages per category+location')
    parser.add_argument('--dry-run', action='store_true', help='Print matches without inserting')
    args = parser.parse_args()
    run(args.pages, args.dry_run)
