"""
watcher.py - APScheduler daemon for DA ingestion and daily email digest.

Scheduled jobs:
  - NSW ePlanning API: 6am + 6pm AEST daily
  - VIC SPEAR portal: 6:05am + 6:05pm AEST daily
  - QLD development.i: 6:10am + 6:10pm AEST daily
  - SA PlanSA portal: 6:15am + 6:15pm AEST daily
  - WA councils: 6:20am + 6:20pm AEST daily
  - TAS councils: 6:25am + 6:25pm AEST daily
  - NT planning: 6:30am + 6:30pm AEST daily
  - ACT portal: 6:35am + 6:35pm AEST daily
  - Acquisition scraper (Google Maps → enrich → score): 7:30am AEST daily
  - Approval-stage matcher: daily at 2am AEST
  - Founder digest email: daily at 8am AEST
  - Lifecycle emails: daily at 9am AEST

Running on Mac Mini at ~/roweo-scraper/ — no paid infrastructure needed.
"""

import sys
import os
import time
import logging
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from apscheduler.schedulers.background import BackgroundScheduler

sys.path.insert(0, os.path.dirname(__file__))
from shared.supabase_client import _get_client

os.makedirs(os.path.join(os.path.dirname(__file__), "logs"), exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [watcher] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), "logs", "watcher.log")),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)


def run_nsw_ingestion():
    log.info("Scheduled: NSW ePlanning ingestion starting")
    try:
        from sources.nsw_eplanning import run
        result = run(days_back=1)
        log.info(f"NSW done: {result['das_new']} new, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"NSW ingestion error: {e}")


def run_vic_ingestion():
    log.info("Scheduled: VIC SPEAR ingestion starting")
    try:
        from sources.vic_spear import run
        result = run(days_back=1)
        log.info(f"VIC done: {result['das_new']} new, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"VIC ingestion error: {e}")


def run_qld_ingestion():
    log.info("Scheduled: QLD development.i ingestion starting")
    try:
        from sources.qld_development_i import run
        result = run(days_back=1)
        log.info(f"QLD done: {result['das_new']} new, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"QLD ingestion error: {e}")


def run_sa_ingestion():
    log.info("Scheduled: SA PlanSA ingestion starting")
    try:
        from sources.sa_planssa import run
        result = run(days_back=1)
        log.info(f"SA done: {result['das_new']} new, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"SA ingestion error: {e}")


def run_wa_ingestion():
    log.info("Scheduled: WA councils ingestion starting")
    try:
        from sources.wa_councils import run
        result = run(days_back=1)
        log.info(f"WA done: {result['das_new']} new, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"WA ingestion error: {e}")


def run_tas_ingestion():
    log.info("Scheduled: TAS councils ingestion starting")
    try:
        from sources.tas_councils import run
        result = run(days_back=1)
        log.info(f"TAS done: {result['das_new']} new, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"TAS ingestion error: {e}")


def run_nt_ingestion():
    log.info("Scheduled: NT planning ingestion starting")
    try:
        from sources.nt_planning import run
        result = run(days_back=1)
        log.info(f"NT done: {result['das_new']} new, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"NT ingestion error: {e}")


def run_act_ingestion():
    log.info("Scheduled: ACT portal ingestion starting")
    try:
        from sources.act_portal import run
        result = run(days_back=1)
        log.info(f"ACT done: {result['das_new']} new, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"ACT ingestion error: {e}")


def run_da_ingestion():
    """Legacy council-da.com fallback — kept for supplementary coverage."""
    log.info("Scheduled: council-da.com supplementary ingestion starting")
    try:
        from sources.council_da_api import run
        result = run(days_back=1)
        log.info(f"council_da done: {result['das_new']} new DAs, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"council_da ingestion error: {e}")


def run_approval_matcher():
    """Check for DAs that moved from lodged to approved since yesterday — fire second-stage matches."""
    log.info("Scheduled: Approval-stage matcher running")
    try:
        from datetime import timedelta
        since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        from shared.matcher import process_approval_stage_matches
        created = process_approval_stage_matches("council_da", since)
        if created:
            log.info(f"Approval matcher: {created} second-stage matches created")
    except Exception as e:
        log.error(f"Approval matcher error: {e}")


def run_daily_digest():
    """Send the 8am founder digest email via Resend."""
    log.info("Scheduled: Daily founder digest")
    try:
        from daily_digest import send_digest
        send_digest()
    except Exception as e:
        log.error(f"Daily digest error: {e}")


def run_lifecycle_emails():
    """Send automated lifecycle emails: onboarding reminders, 7-day check-ins, grace period warnings."""
    log.info("Scheduled: Lifecycle emails")
    try:
        from lifecycle_emails import send_lifecycle_emails
        send_lifecycle_emails()
    except Exception as e:
        log.error(f"Lifecycle emails error: {e}")


# Search queries covering Sydney, Newcastle, Central Coast, Wollongong.
# Target company-sounding names — SKIP_WORDS in the scraper filters obvious sole traders.
ACQUISITION_QUERIES = [
    "building company Sydney NSW",
    "renovation company Sydney NSW",
    "home extension company Sydney NSW",
    "residential builder Parramatta NSW",
    "residential builder Western Sydney NSW",
    "custom home builder Sydney NSW",
    "building company Newcastle NSW",
    "residential builder Newcastle NSW",
    "renovation company Newcastle NSW",
    "building company Central Coast NSW",
    "residential builder Gosford NSW",
    "home builder Wollongong NSW",
]


def run_acquisition_scraper():
    """Scrape new builder prospects from Google Maps, enrich via DeepSeek, then score."""
    log.info("Scheduled: Acquisition scraper starting")
    try:
        import asyncio
        from acquisition.google_maps_scraper import run as maps_run
        from acquisition.enricher import run as enricher_run
        from acquisition.scorer import run as scorer_run

        total_inserted = 0
        for q in ACQUISITION_QUERIES:
            try:
                result = asyncio.run(maps_run(q, max_results=20))
                inserted = result.get('inserted', 0)
                total_inserted += inserted
                log.info(f"  Maps '{q}': +{inserted} new ({result.get('skipped', 0)} skipped)")
            except Exception as e:
                log.warning(f"  Maps query failed '{q}': {e}")

        log.info(f"Maps scraper done: {total_inserted} new prospects total")

        enricher_result = enricher_run(limit=60)
        log.info(f"Enrichment done: {enricher_result}")

        scorer_result = scorer_run(limit=60)
        log.info(f"Scoring done: {scorer_result}")

    except Exception as e:
        log.error(f"Acquisition scraper error: {e}")


def main():
    log.info("Roweo watcher started — all-state DA ingestion 6am/6pm AEST, acquisition 7:30am, digest 8am, lifecycle 9am")

    scheduler = BackgroundScheduler(timezone="Australia/Sydney")

    # State scrapers staggered 5 minutes apart to avoid hammering portals
    scheduler.add_job(run_nsw_ingestion, "cron", hour="6,18", minute=0,  id="nsw_ingestion")
    scheduler.add_job(run_vic_ingestion, "cron", hour="6,18", minute=5,  id="vic_ingestion")
    scheduler.add_job(run_qld_ingestion, "cron", hour="6,18", minute=10, id="qld_ingestion")
    scheduler.add_job(run_sa_ingestion,  "cron", hour="6,18", minute=15, id="sa_ingestion")
    scheduler.add_job(run_wa_ingestion,  "cron", hour="6,18", minute=20, id="wa_ingestion")
    scheduler.add_job(run_tas_ingestion, "cron", hour="6,18", minute=25, id="tas_ingestion")
    scheduler.add_job(run_nt_ingestion,  "cron", hour="6,18", minute=30, id="nt_ingestion")
    scheduler.add_job(run_act_ingestion, "cron", hour="6,18", minute=35, id="act_ingestion")
    # council-da.com as supplementary at :45 (handles any councils missed by direct scrapers)
    scheduler.add_job(run_da_ingestion,  "cron", hour="6,18", minute=45, id="da_ingestion")

    # Acquisition: scrape Google Maps → enrich → score, once daily at 7:30am
    scheduler.add_job(run_acquisition_scraper, "cron", hour=7, minute=30, id="acquisition_scraper")
    # Other jobs
    scheduler.add_job(run_approval_matcher, "cron", hour=2, minute=0, id="approval_matcher")
    scheduler.add_job(run_daily_digest,    "cron", hour=8, minute=0, id="daily_digest")
    scheduler.add_job(run_lifecycle_emails,"cron", hour=9, minute=0, id="lifecycle_emails")
    scheduler.start()

    log.info("Scheduler started. Running initial NSW + VIC + QLD ingestion now...")
    run_nsw_ingestion()
    run_vic_ingestion()
    run_qld_ingestion()

    while True:
        time.sleep(60)


if __name__ == "__main__":
    main()
