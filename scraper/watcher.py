"""
watcher.py - APScheduler daemon for DA scraping and daily email digest.
Adapted from ~/launchpad/crawler/watcher.py.

Runs two scheduled jobs:
  - NSW ePlanning scraper: every 6 hours (main volume source)
  - ACT portal scraper: every 12 hours (smaller volume, slower site)
  - Daily founder digest: 8am AEST every day

Deploy to Railway as a background worker service with the same environment variables.
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


def run_nsw_scraper():
    log.info("Scheduled: NSW ePlanning scraper starting")
    try:
        from sources.nsw_eplanning import run
        result = run(days_back=1)
        log.info(f"NSW done: {result['das_new']} new DAs, {result['matches_created']} matches")
    except Exception as e:
        log.error(f"NSW scraper error: {e}")


def run_act_scraper():
    log.info("Scheduled: ACT portal scraper starting")
    try:
        from sources.act_portal import run
        result = run(days_back=1)
        log.info(f"ACT done: {result['das_new']} new DAs, {result['matches_created']} matches")
    except Exception as e:
        log.error(f"ACT scraper error: {e}")


def run_approval_matcher():
    """Check for DAs that moved from lodged to approved since yesterday — fire second-stage matches."""
    log.info("Scheduled: Approval-stage matcher running")
    try:
        from datetime import timedelta
        since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        from shared.matcher import process_approval_stage_matches
        for source in ("nsw_eplanning", "act_portal"):
            created = process_approval_stage_matches(source, since)
            if created:
                log.info(f"Approval matcher ({source}): {created} second-stage matches created")
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


def main():
    log.info("Roweo watcher started — NSW (6h), ACT (12h), approval matcher (daily 2am), digest (daily 8am AEST)")

    scheduler = BackgroundScheduler(timezone="Australia/Sydney")
    scheduler.add_job(run_nsw_scraper, "interval", hours=6, id="nsw_scraper")
    scheduler.add_job(run_act_scraper, "interval", hours=12, id="act_scraper")
    scheduler.add_job(run_approval_matcher, "cron", hour=2, minute=0, id="approval_matcher")
    scheduler.add_job(run_daily_digest, "cron", hour=8, minute=0, id="daily_digest")
    scheduler.add_job(run_lifecycle_emails, "cron", hour=9, minute=0, id="lifecycle_emails")
    scheduler.start()

    log.info("Scheduler started. Running initial NSW scrape now...")
    run_nsw_scraper()

    while True:
        time.sleep(60)


if __name__ == "__main__":
    main()
