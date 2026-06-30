"""
lifecycle_emails.py - Scheduled lifecycle email sender for Roweo.
Runs daily via watcher.py APScheduler at 9am AEST.

Handles:
  - Onboarding reminder: 24h after signup if onboarding not completed
  - 7-day check-in: 7 days after subscription_status became 'active'
  - Grace period warning: 4 days after payment failed if still past_due
"""

import os
import logging
from datetime import datetime, timedelta, timezone
import resend

log = logging.getLogger(__name__)

resend.api_key = os.environ.get("RESEND_API_KEY", "")

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "hello@roweo.com.au")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "Roweo <hello@roweo.com.au>")
APP_URL = os.environ.get("NEXT_PUBLIC_APP_URL", "https://roweo.com.au")


def _get_client():
    from supabase import create_client
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _send(to: str, subject: str, html: str):
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as e:
        log.error(f"Resend send error ({to}): {e}")
        return False


def _wrap(body: str) -> str:
    footer = f"""
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #27272a;color:#52525b;font-size:12px">
      <p>Roweo · Sydney NSW, Australia · <a href="{APP_URL}/legal/privacy" style="color:#52525b">Privacy</a> · <a href="{APP_URL}/legal/spam" style="color:#52525b">Unsubscribe</a></p>
    </div>
    """
    return f'<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#e4e4e7;background:#09090b;border-radius:8px">{body}{footer}</div>'


def _btn(text: str, href: str) -> str:
    return f'<a href="{href}" style="display:inline-block;background:#3B6FDB;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:500;font-size:14px">{text}</a>'


def send_onboarding_reminders(supabase):
    """Send onboarding reminder to users who signed up 24h ago but haven't completed onboarding."""
    cutoff_start = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
    cutoff_end = (datetime.now(timezone.utc) - timedelta(hours=23)).isoformat()

    result = supabase.table("profiles") \
        .select("id, email, created_at") \
        .eq("onboarding_completed", False) \
        .gte("created_at", cutoff_start) \
        .lte("created_at", cutoff_end) \
        .execute()

    profiles = result.data or []
    log.info(f"Onboarding reminders: {len(profiles)} candidates")

    for p in profiles:
        if not p.get("email"):
            continue
        html = _wrap(f"""
          <h2 style="color:#fff;margin-top:0">You're almost there</h2>
          <p>You started setting up your Roweo account but didn't finish. It only takes 5 more minutes.</p>
          <p>Once you approve your letter template, we'll match you to every development application that comes in for your service area — automatically.</p>
          <p>{_btn('Finish setup', f'{APP_URL}/onboarding')}</p>
          <p style="color:#52525b;font-size:13px">Questions? Reply to this email and we'll help.</p>
        """)
        if _send(p["email"], "Your Roweo setup isn't finished yet", html):
            log.info(f"Onboarding reminder sent to {p['email']}")


def send_7_day_checkins(supabase):
    """Send 7-day check-in to active subscribers who activated exactly 7 days ago."""
    cutoff_start = (datetime.now(timezone.utc) - timedelta(days=7, hours=1)).isoformat()
    cutoff_end = (datetime.now(timezone.utc) - timedelta(days=6, hours=23)).isoformat()

    # Find users who subscribed ~7 days ago (first 'subscribed' event)
    result = supabase.table("subscription_events") \
        .select("user_id, occurred_at") \
        .eq("event_type", "subscribed") \
        .gte("occurred_at", cutoff_start) \
        .lte("occurred_at", cutoff_end) \
        .execute()

    events = result.data or []
    log.info(f"7-day check-ins: {len(events)} candidates")

    for ev in events:
        user_id = ev["user_id"]
        profile_res = supabase.table("profiles").select("email, subscription_status").eq("id", user_id).single().execute()
        profile = profile_res.data
        if not profile or not profile.get("email") or profile.get("subscription_status") != "active":
            continue

        # Fetch stats
        letters_res = supabase.table("lead_matches").select("id", count="exact").eq("user_id", user_id).in_("status", ["printed", "posted", "scanned"]).execute()
        scans_res = supabase.table("lead_matches").select("scan_count").eq("user_id", user_id).gt("scan_count", 0).execute()
        new_leads_res = supabase.table("lead_matches").select("id", count="exact").eq("user_id", user_id).execute()

        letters = letters_res.count or 0
        scans = sum(r.get("scan_count", 0) for r in (scans_res.data or []))
        new_leads = new_leads_res.count or 0

        html = _wrap(f"""
          <h2 style="color:#fff;margin-top:0">One week in</h2>
          <p>Here's what's happened in your first week on Roweo:</p>
          <div style="background:#18181b;border-radius:6px;padding:16px;margin:16px 0">
            <p style="margin:0 0 8px"><strong>{letters}</strong> letters sent</p>
            <p style="margin:0 0 8px"><strong>{scans}</strong> QR scans from homeowners</p>
            <p style="margin:0"><strong>{new_leads}</strong> total leads matched</p>
          </div>
          <p>{_btn('View full dashboard', f'{APP_URL}/dashboard')}</p>
          <p style="color:#52525b;font-size:13px">Have feedback on your first week? Reply to this email — we read every response.</p>
        """)
        if _send(profile["email"], "One week with Roweo — here's your progress", html):
            log.info(f"7-day check-in sent to {profile['email']}")


def send_grace_period_warnings(supabase):
    """Send grace period warning to users who failed payment 4 days ago and are still past_due."""
    cutoff_start = (datetime.now(timezone.utc) - timedelta(days=4, hours=1)).isoformat()
    cutoff_end = (datetime.now(timezone.utc) - timedelta(days=3, hours=23)).isoformat()

    result = supabase.table("subscription_events") \
        .select("user_id, occurred_at") \
        .eq("event_type", "payment_failed") \
        .gte("occurred_at", cutoff_start) \
        .lte("occurred_at", cutoff_end) \
        .execute()

    events = result.data or []
    log.info(f"Grace period warnings: {len(events)} candidates")

    for ev in events:
        user_id = ev["user_id"]
        profile_res = supabase.table("profiles").select("email, subscription_status").eq("id", user_id).single().execute()
        profile = profile_res.data
        if not profile or not profile.get("email") or profile.get("subscription_status") != "past_due":
            continue

        access_until = (datetime.fromisoformat(ev["occurred_at"]) + timedelta(days=7)).strftime("%-d %B %Y")
        html = _wrap(f"""
          <h2 style="color:#fff;margin-top:0">Account pausing soon</h2>
          <p>We've been unable to process your payment. Your access is expected to end around <strong>{access_until}</strong> unless payment is updated.</p>
          <p>{_btn('Update payment method', f'{APP_URL}/dashboard/settings/billing')}</p>
        """)
        if _send(profile["email"], "Your Roweo account will pause in 3 days", html):
            log.info(f"Grace period warning sent to {profile['email']}")


def send_lifecycle_emails():
    supabase = _get_client()
    send_onboarding_reminders(supabase)
    send_7_day_checkins(supabase)
    send_grace_period_warnings(supabase)
    log.info("Lifecycle emails run complete")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    send_lifecycle_emails()
