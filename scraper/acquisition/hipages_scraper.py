"""
hipages_scraper.py — Scrape builder prospects from hipages.com.au (Selenium).

Hipages is React/Next.js SSR so requests alone is unreliable — Selenium is used.
Company-size filter: min_reviews >= 3 AND name does not look like a sole trader.

Usage:
  python hipages_scraper.py --category builders --location nsw --max-pages 10
  python hipages_scraper.py --all
"""

import argparse
import logging
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

BASE_URL = "https://www.hipages.com.au"

ALL_JOBS = [
    ("builders", "nsw/sydney", 12),
    ("builders", "nsw/newcastle", 6),
    ("builders", "nsw/wollongong", 5),
    ("builders", "nsw/central-coast", 5),
    ("builders", "act/canberra", 5),
    ("home-renovations", "nsw/sydney", 8),
    ("home-renovations", "nsw/newcastle", 4),
    ("home-additions-and-extensions", "nsw/sydney", 6),
    ("home-additions-and-extensions", "nsw/newcastle", 3),
]

SOLE_TRADER_NAME_RE = re.compile(
    r'^[A-Z][a-z]+ [A-Z][a-z]+ (builder|building|renovation|renovations|construction|constr|trades|handyman)s?$',
    re.IGNORECASE
)

COMPANY_TOKENS = {
    'pty ltd', 'pty. ltd.', 'p/l', 'proprietary limited',
    'constructions', 'group', '& sons', 'and sons', 'co.', ' co ',
    'corporation', 'corp', 'holdings',
}

SKIP_KEYWORDS = {
    'plumb', 'electr', 'tile', 'paint', 'landscap', 'clean',
    'scaff', 'labour', 'labor', 'hire', 'supply', 'material',
    'glass', 'roofing', 'flooring', 'carpet', 'concrete only',
}


def _is_company(name: str, review_count: int) -> tuple[bool, str]:
    n = name.lower()
    if any(kw in n for kw in SKIP_KEYWORDS):
        return False, "unrelated trade keyword"
    if SOLE_TRADER_NAME_RE.match(name) and review_count < 10:
        return False, "sole trader name pattern + low reviews"
    has_company_token = any(tok in n for tok in COMPANY_TOKENS)
    if has_company_token:
        return True, "company name token"
    if review_count >= 3:
        return True, f"{review_count} reviews"
    return False, f"only {review_count} reviews and no company name signal"


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

    wdm_path = ChromeDriverManager().install()
    driver_dir = pathlib.Path(wdm_path).parent
    chromedriver_path = driver_dir / 'chromedriver'
    if not chromedriver_path.exists():
        chromedriver_path = pathlib.Path(wdm_path)
    chromedriver_path.chmod(0o755)

    service = Service(str(chromedriver_path))
    driver = webdriver.Chrome(service=service, options=opts)
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })
    return driver


def _extract_int(text: str) -> int:
    m = re.search(r'\d+', text.replace(',', ''))
    return int(m.group()) if m else 0


def scrape_listing_page(driver, url: str) -> list[dict]:
    from selenium.webdriver.common.by import By

    log.info(f"  Fetching: {url}")
    driver.get(url)
    time.sleep(4)

    for _ in range(4):
        driver.execute_script("window.scrollBy(0, 1200)")
        time.sleep(1.0)

    results = []
    seen: set[str] = set()

    card_selectors = [
        'div[data-testid="business-card"]',
        'div[class*="BusinessCard"]',
        'article[class*="listing"]',
        'div[class*="tradie-card"]',
        'div[class*="TradesCard"]',
        'li[class*="business"]',
        '[data-component="business-card"]',
    ]

    cards = []
    for sel in card_selectors:
        try:
            found = driver.find_elements(By.CSS_SELECTOR, sel)
            if found:
                cards = found
                log.info(f"    Found {len(cards)} cards via '{sel}'")
                break
        except Exception:
            pass

    if not cards:
        log.info("    No cards via Selenium — trying page source parse")
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        for heading in soup.select('h2 a, h3 a, [class*="name"] a, [class*="title"] a'):
            name = heading.get_text(strip=True)
            href = heading.get('href', '')
            if not name or len(name) < 4 or len(name) > 80:
                continue
            if name in seen:
                continue

            parent = heading.find_parent(['article', 'li', 'div'])
            review_count = 0
            if parent:
                review_text = parent.get_text()
                m = re.search(r'(\d+)\s*(review|job|hire)', review_text, re.IGNORECASE)
                if m:
                    review_count = int(m.group(1))

            keep, reason = _is_company(name, review_count)
            if not keep:
                log.debug(f"    SKIP {name}: {reason}")
                continue

            seen.add(name)
            results.append({
                'company_name': name,
                'website': None,
                'phone': None,
                'postal_address': None,
                'hipages_reviews': review_count,
                'source': 'hipages',
            })
            log.info(f"    ✓ {name} ({review_count} reviews)")

        return results

    for card in cards:
        try:
            name = ''
            for sel in ['h2', 'h3', '[class*="name"]', '[class*="title"]', '[class*="BusinessName"]']:
                try:
                    el = card.find_element(By.CSS_SELECTOR, sel)
                    t = el.text.strip().split('\n')[0]
                    if t and len(t) > 3:
                        name = t
                        break
                except Exception:
                    pass

            if not name or name in seen:
                continue

            review_count = 0
            for sel in ['[class*="review"]', '[class*="Review"]', '[aria-label*="review"]', '[class*="rating"]']:
                try:
                    el = card.find_element(By.CSS_SELECTOR, sel)
                    review_count = _extract_int(el.text or el.get_attribute('aria-label') or '')
                    if review_count > 0:
                        break
                except Exception:
                    pass

            keep, reason = _is_company(name, review_count)
            if not keep:
                log.debug(f"    SKIP {name}: {reason}")
                continue

            # Website — hipages sometimes shows the company's own website on the card
            website = None
            for sel in ['a[href*="http"]:not([href*="hipages"])']:
                try:
                    el = card.find_element(By.CSS_SELECTOR, sel)
                    href = el.get_attribute('href') or ''
                    if href and 'hipages' not in href and 'google' not in href:
                        website = href
                        break
                except Exception:
                    pass

            phone = None
            for sel in ['[aria-label*="phone" i]', '[class*="phone"]', 'a[href^="tel:"]']:
                try:
                    el = card.find_element(By.CSS_SELECTOR, sel)
                    raw = el.get_attribute('href') or el.get_attribute('aria-label') or el.text
                    raw = raw.replace('tel:', '').strip()
                    if raw and re.search(r'\d{8,}', raw.replace(' ', '')):
                        phone = raw
                        break
                except Exception:
                    pass

            seen.add(name)
            results.append({
                'company_name': name,
                'website': website,
                'phone': phone,
                'postal_address': None,  # hipages gives suburb only; enricher finds full address from website
                'hipages_reviews': review_count,
                'source': 'hipages',
            })
            log.info(f"    ✓ {name} | {review_count} reviews | {phone or '—'} | {website or '—'}")

        except Exception as e:
            log.debug(f"Card error: {e}")

    return results


def run(category: str = 'builders', location: str = 'nsw/sydney', max_pages: int = 10,
        existing_lower: set | None = None, supabase=None) -> dict:
    from acquisition.enricher import enrich_new_candidate

    if supabase is None:
        supabase = _get_client()
    if existing_lower is None:
        log.info('Loading existing prospect names...')
        resp = supabase.table('builder_prospects').select('company_name').limit(10000).execute()
        existing_lower = {r['company_name'].lower() for r in (resp.data or [])}
        log.info(f'  {len(existing_lower)} existing prospects loaded')

    log.info(f"Hipages scraper: {category}/{location} max_pages={max_pages}")
    driver = _make_driver()
    all_prospects: list[dict] = []

    try:
        url = f"{BASE_URL}/find/{category}/{location}"
        for page in range(1, max_pages + 1):
            page_url = url if page == 1 else f"{url}?page={page}"
            results = scrape_listing_page(driver, page_url)
            if not results:
                log.info(f"  Page {page}: no results — stopping")
                break
            all_prospects.extend(results)
            log.info(f"  Page {page}: {len(results)} — {len(all_prospects)} total")
            time.sleep(2)
    finally:
        driver.quit()

    log.info(f"Scraped {len(all_prospects)} candidates — enriching now...")
    inserted = 0
    skipped = 0

    for p in all_prospects:
        name = p.get('company_name', '')
        if not name or name.lower() in existing_lower:
            skipped += 1
            continue

        candidate = {
            'company_name': name,
            'website': p.get('website'),       # may be None; enricher tries DDG
            'phone': p.get('phone'),
            'postal_address': None,            # hipages suburb is not a full address; enricher extracts from website
            'source': 'hipages',
        }

        ok = enrich_new_candidate(supabase, candidate, existing_lower)
        if ok:
            existing_lower.add(name.lower())
            inserted += 1
        else:
            skipped += 1

        time.sleep(1.5)

    log.info(f"Done — inserted: {inserted}, skipped: {skipped}")
    return {'inserted': inserted, 'skipped': skipped, 'existing_lower': existing_lower}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--category', default='builders')
    parser.add_argument('--location', default='nsw/sydney')
    parser.add_argument('--max-pages', type=int, default=10)
    parser.add_argument('--all', action='store_true', help='Run all predefined jobs')
    args = parser.parse_args()

    supabase = _get_client()
    resp = supabase.table('builder_prospects').select('company_name').limit(10000).execute()
    existing_lower = {r['company_name'].lower() for r in (resp.data or [])}

    if args.all:
        total = 0
        for (cat, loc, pages) in ALL_JOBS:
            r = run(cat, loc, pages, existing_lower=existing_lower, supabase=supabase)
            total += r.get('inserted', 0)
            existing_lower = r.get('existing_lower', existing_lower)
        log.info(f"All jobs done — total inserted: {total}")
    else:
        run(args.category, args.location, args.max_pages,
            existing_lower=existing_lower, supabase=supabase)
