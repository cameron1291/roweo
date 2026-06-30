"""
watcher.py - APScheduler daemon for DA ingestion and daily email digest.

Scheduled jobs:
  - council-da.com API (all Australian states): every 6 hours
  - Approval-stage matcher: daily at 2am AEST
  - Founder digest email: daily at 8am AEST
  - Lifecycle emails: daily at 9am AEST

Deploy to Railway as a background worker service.
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


def run_da_ingestion():
    """Ingest all Australian states via council-da.com API."""
    log.info("Scheduled: council-da.com Australia-wide ingestion starting")
    try:
        from sources.council_da_api import run
        result = run(days_back=1)
        log.info(f"Ingestion done: {result['das_new']} new DAs across all states, {result['matches_created']} matches, {len(result['errors'])} errors")
    except Exception as e:
        log.error(f"DA ingestion error: {e}")


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


def main():
    log.info("Roweo watcher started — all AU states via council-da.com (6h), approval matcher (2am), digest (8am AEST)")

    scheduler = BackgroundScheduler(timezone="Australia/Sydney")
    scheduler.add_job(run_da_ingestion, "interval", hours=6, id="da_ingestion")
    scheduler.add_job(run_approval_matcher, "cron", hour=2, minute=0, id="approval_matcher")
    scheduler.add_job(run_daily_digest, "cron", hour=8, minute=0, id="daily_digest")
    scheduler.add_job(run_lifecycle_emails, "cron", hour=9, minute=0, id="lifecycle_emails")
    scheduler.start()

    log.info("Scheduler started. Running initial Australia-wide ingestion now...")
    run_da_ingestion()

    while True:
        time.sleep(60)


if __name__ == "__main__":
    main()
