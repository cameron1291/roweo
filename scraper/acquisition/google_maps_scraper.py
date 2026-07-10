"""
Scrape builder prospects from Google Maps — Selenium + Chrome.

Works on macOS 10.15+ (no Playwright dependency).
Captures company name, phone, website, address from Google Maps detail panels.
Emails are later extracted by enricher.py from company websites.

Regions covered when run with --all-regions:
  Sydney (Inner West, North Shore, Western Sydney, Eastern Suburbs, South)
  Newcastle
  Central Coast (Gosford, Wyong)
  Northern Beaches (Manly, Dee Why, Mona Vale, Avalon)

Usage:
  python google_maps_scraper.py --query "building company Sydney NSW" --max 30
  python google_maps_scraper.py --all-regions --max 30
"""

import argparse
import logging
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

ALL_REGION_QUERIES = [
    # Sydney - Inner West & City
    "building company Sydney NSW",
    "renovation company Sydney Inner West",
    "home extension builder Sydney",
    # North Shore & Northern Beaches
    "residential builder North Shore Sydney",
    "building company Northern Beaches Sydney",
    "renovation builder Manly Mosman",
    # Western Sydney
    "building company Parramatta NSW",
    "builder Blacktown Penrith NSW",
    "home renovation company Western Sydney",
    # Eastern Suburbs
    "building company Bondi Randwick NSW",
    "renovation builder Eastern Suburbs Sydney",
    # South Sydney / Sutherland
    "building company Sutherland Shire NSW",
    "builder Cronulla Hurstville NSW",
    # Newcastle
    "building company Newcastle NSW",
    "renovation builder Newcastle Lake Macquarie",
    "home extension company Newcastle NSW",
    # Central Coast
    "building company Central Coast NSW",
    "builder Gosford Wyong NSW",
    "renovation company Gosford NSW",
]

SKIP_WORDS = {
    'plumb', 'electr', 'tile', 'tiling', 'paint', 'landscap', 'clean',
    'scaff', 'labour', 'labor', 'hire', 'supply', 'material',
    'search', 'find', 'compare', 'request',
}


def _looks_like_company(name: str) -> bool:
    if not name or len(name) < 4 or len(name) > 80:
        return False
    n = name.lower()
    return not any(w in n for w in SKIP_WORDS)


def _make_driver():
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from webdriver_manager.chrome import ChromeDriverManager
    import pathlib

    opts = Options()
    opts.add_argument('--headless=new')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    opts.add_argument('--disable-blink-features=AutomationControlled')
    opts.add_argument('--window-size=1440,900')
    opts.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36')
    opts.add_experimental_option('excludeSwitches', ['enable-automation'])
    opts.add_experimental_option('useAutomationExtension', False)
    opts.binary_location = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

    # webdriver_manager sometimes returns the wrong file — find the actual binary
    wdm_path = ChromeDriverManager().install()
    driver_dir = pathlib.Path(wdm_path).parent
    chromedriver_path = driver_dir / 'chromedriver'
    if not chromedriver_path.exists():
        chromedriver_path = pathlib.Path(wdm_path)  # fallback to whatever it returned
    chromedriver_path.chmod(0o755)

    service = Service(str(chromedriver_path))
    driver = webdriver.Chrome(service=service, options=opts)
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })
    return driver


def scrape_query(driver, query: str, max_results: int = 30) -> list[dict]:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    results = []
    seen: set[str] = set()

    search_url = f"https://www.google.com.au/maps/search/{query.replace(' ', '+')}/"
    log.info(f"  → {query}")
    driver.get(search_url)
    time.sleep(4)

    # Scroll results panel to load listings
    try:
        feed = driver.find_element(By.CSS_SELECTOR, '[role="feed"]')
        for _ in range(max(3, max_results // 7)):
            driver.execute_script("arguments[0].scrollBy(0, 2500)", feed)
            time.sleep(1.2)
    except Exception:
        pass

    # Get all result cards
    try:
        cards = driver.find_elements(By.CSS_SELECTOR, '[role="feed"] [jsaction]')
    except Exception:
        return results

    log.info(f"     Found {len(cards)} cards")

    for card in cards:
        if len(results) >= max_results:
            break
        try:
            # Get name from card text
            name = ''
            for sel in ['div[class*="fontHeadline"]', 'div[class*="qBF1Pd"]', 'div.fontHeadlineSmall']:
                try:
                    el = card.find_element(By.CSS_SELECTOR, sel)
                    name = el.text.strip().split('\n')[0]
                    if name:
                        break
                except Exception:
                    pass

            if not _looks_like_company(name) or name in seen:
                continue

            # Click card to open detail panel
            driver.execute_script("arguments[0].click()", card)
            time.sleep(2)

            # Phone
            phone = None
            for sel in ['[data-item-id="phone"] [aria-label]', 'button[data-item-id*="phone"]', '[aria-label^="Phone"]']:
                try:
                    el = driver.find_element(By.CSS_SELECTOR, sel)
                    raw = el.get_attribute('aria-label') or el.text
                    raw = raw.replace('Phone:', '').strip()
                    if raw and re.search(r'\d{8,}', raw.replace(' ', '')):
                        phone = raw
                        break
                except Exception:
                    pass

            # Website
            website = None
            for sel in ['a[data-item-id="authority"]', 'a[aria-label*="website" i]']:
                try:
                    el = driver.find_element(By.CSS_SELECTOR, sel)
                    href = el.get_attribute('href') or ''
                    if href and 'google.com' not in href and 'maps' not in href:
                        website = href
                        break
                except Exception:
                    pass

            # Address
            address = None
            for sel in ['[data-item-id*="address"] [aria-label]', 'button[data-item-id*="address"]']:
                try:
                    el = driver.find_element(By.CSS_SELECTOR, sel)
                    raw = el.get_attribute('aria-label') or el.text
                    raw = raw.replace('Address:', '').strip()
                    if raw:
                        address = raw
                        break
                except Exception:
                    pass

            seen.add(name)
            results.append({
                'company_name': name,
                'postal_address': address,
                'phone': phone,
                'website': website,
                'source': 'google_maps',
            })
            log.info(f"     ✓ {name} | {phone or '—'} | {website or '—'}")

        except Exception as e:
            log.debug(f"Card error: {e}")

    # If >40% of results share the same website, it's a sponsored result bleeding through — discard all those URLs
    if results:
        from collections import Counter
        url_counts = Counter(r['website'] for r in results if r.get('website'))
        most_common_url, most_common_count = url_counts.most_common(1)[0] if url_counts else (None, 0)
        if most_common_count > len(results) * 0.4:
            log.warning(f"     Discarding repeated website (likely sponsored): {most_common_url}")
            for r in results:
                if r.get('website') == most_common_url:
                    r['website'] = None

    return results


def run(queries: list[str], max_per_query: int = 30):
    from acquisition.enricher import enrich_new_candidate

    supabase = _get_client()
    log.info('Loading existing prospect names...')
    resp = supabase.table('builder_prospects').select('company_name').limit(5000).execute()
    existing_lower = {r['company_name'].lower() for r in (resp.data or [])}
    log.info(f'  {len(existing_lower)} existing prospects loaded')

    log.info(f"Starting Google Maps scraper — {len(queries)} queries")
    driver = _make_driver()
    all_prospects = []

    try:
        for query in queries:
            results = scrape_query(driver, query, max_per_query)
            all_prospects.extend(results)
            time.sleep(2)
    finally:
        driver.quit()

    log.info(f"Total scraped: {len(all_prospects)} — now enriching...")
    inserted = 0
    skipped = 0

    for p in all_prospects:
        if not p.get('company_name'):
            skipped += 1
            continue
        if p['company_name'].lower() in existing_lower:
            skipped += 1
            continue

        # Google Maps gives us a full address directly — pass it through enricher
        # which validates it with _is_full_address() and also scrapes the website
        # for email, owner_name, business_type, etc.
        candidate = {
            'company_name': p['company_name'],
            'website': p.get('website'),
            'phone': p.get('phone'),
            'postal_address': p.get('postal_address'),  # may already be a full street address
            'source': 'google_maps',
        }
        ok = enrich_new_candidate(supabase, candidate, existing_lower)
        if ok:
            existing_lower.add(p['company_name'].lower())
            inserted += 1
            if inserted % 10 == 0:
                log.info(f'  ...{inserted} inserted')
        else:
            skipped += 1

        time.sleep(1.0)

    log.info(f"Done — inserted: {inserted}, skipped: {skipped}")
    return {'inserted': inserted, 'skipped': skipped}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape builder prospects from Google Maps (Selenium)')
    parser.add_argument('--query', help='Single Google Maps search query')
    parser.add_argument('--all-regions', action='store_true', help='Run all NSW region queries (Sydney, Newcastle, Central Coast, Northern Beaches)')
    parser.add_argument('--max', type=int, default=30, help='Max results per query')
    args = parser.parse_args()

    if args.all_regions:
        queries = ALL_REGION_QUERIES
    elif args.query:
        queries = [args.query]
    else:
        queries = ALL_REGION_QUERIES[:3]  # default: first 3 Sydney queries

    run(queries, args.max)
