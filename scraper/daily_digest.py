"""
daily_digest.py - Sends the 8am founder summary email via Resend.
Called by watcher.py's APScheduler job at 8:00am AEST.

Includes:
- Letters awaiting print (status='letter_approved')
- New DAs since yesterday
- QR scans since yesterday
- New customers (subscription activated in last 24h)
- Failed payment alerts
"""

import os
import resend
from datetime import datetime, timedelta, timezone

from shared.supabase_client import _get_client

resend.api_key = os.environ.get("RESEND_API_KEY", "")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "cameron.drayton@hotmail.co.uk")
FROM_EMAIL = "Roweo <hello@roweo.com.au>"


def send_digest():
    client = _get_client()
    now = datetime.now(timezone.utc)
    yesterday = (now - timedelta(hours=24)).isoformat()

    # Letters awaiting print
    letters_result = (
        client.table("lead_matches")
        .select("id, batch_date, development_applications(suburb, state), builder_profiles(company_name)")
        .eq("status", "letter_approved")
        .execute()
    )
    letters_pending = letters_result.data or []

    # New DAs since yesterday
    das_result = (
        client.table("development_applications")
        .select("suburb, state, project_type")
        .gte("ingested_at", yesterday)
        .execute()
    )
    new_das = das_result.data or []

    # QR scans since yesterday
    scans_result = (
        client.table("lead_matches")
        .select("id, development_applications(suburb)")
        .gt("scan_count", 0)
        .gte("scanned_at", yesterday)
        .execute()
    )
    new_scans = scans_result.data or []

    # New customers
    customers_result = (
        client.table("profiles")
        .select("id")
        .eq("subscription_status", "active")
        .gte("updated_at", yesterday)
        .execute()
    )
    new_customers = customers_result.data or []

    # Build email HTML
    html = _build_html(
        letters_pending=letters_pending,
        new_das=new_das,
        new_scans=new_scans,
        new_customers=new_customers,
        date_str=now.strftime("%A %d %B %Y"),
    )

    subject = (
        f"Daily update — "
        f"{len(letters_pending)} to print, "
        f"{len(new_das)} new DAs, "
        f"{len(new_scans)} scans overnight"
    )

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": ADMIN_EMAIL,
        "subject": subject,
        "html": html,
    })
    print(f"[Digest] Sent daily digest: {subject}")


def _build_html(letters_pending, new_das, new_scans, new_customers, date_str) -> str:
    def row(label, value, highlight=False):
        color = "#1B2A4A" if highlight else "#111"
        return f'<tr><td style="padding:6px 12px;color:#666">{label}</td><td style="padding:6px 12px;font-weight:600;color:{color}">{value}</td></tr>'

    letter_rows = ""
    for m in letters_pending[:20]:
        da = (m.get("development_applications") or {})
        builder = (m.get("builder_profiles") or {})
        suburb = f"{da.get('suburb', '?')}, {da.get('state', '')}"
        company = builder.get("company_name", "?")
        letter_rows += f"<li>{company} → {suburb} (batch: {m.get('batch_date', 'today')})</li>"

    da_state = {}
    for da in new_das:
        state = da.get("state", "?")
        da_state[state] = da_state.get(state, 0) + 1
    da_breakdown = ", ".join(f"{s}: {n}" for s, n in da_state.items()) or "—"

    scan_suburbs = [
        (s.get("development_applications") or {}).get("suburb", "?")
        for s in new_scans
    ]
    scans_str = ", ".join(scan_suburbs[:10]) or "None"

    return f"""
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1B2A4A;border-bottom:2px solid #3B6FDB;padding-bottom:8px">
    Roweo Daily Update — {date_str}
  </h2>

  <h3>Operations</h3>
  <table style="width:100%;border-collapse:collapse">
    {row('Letters awaiting print', len(letters_pending), highlight=len(letters_pending) > 0)}
    {row('New DAs overnight', len(new_das))}
    {row('DA breakdown', da_breakdown)}
    {row('QR scans overnight', len(new_scans), highlight=len(new_scans) > 0)}
    {row('Scanned suburbs', scans_str)}
    {row('New customers', len(new_customers), highlight=len(new_customers) > 0)}
  </table>

  {'<h3>Letters to Print</h3><ul>' + letter_rows + '</ul>' if letter_rows else ''}

  <p style="margin-top:24px">
    <a href="https://roweo.com.au/admin/print-queue"
       style="background:#3B6FDB;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px">
      Open Print Queue
    </a>
  </p>

  <hr style="margin-top:32px;border:none;border-top:1px solid #eee">
  <p style="color:#999;font-size:12px">Roweo daily digest • roweo.com.au</p>
</body></html>
"""


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    send_digest()
