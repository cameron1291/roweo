#!/bin/bash
# Roweo acquisition pipeline — find, enrich, score builder prospects
#
# Sources (in order):
#   1. houzz         — Houzz "Find a Pro" directory (Playwright, name+website+suburb)
#   2. oneflare      — Oneflare builder directory (requests/Playwright, verified AU listings)
#   3. master_builders — Master Builders NSW member directory (requests, licensed members)
#   4. hipages       — hipages category listings (Selenium, already on Mac Mini)
#
# Each source passes candidates through enrich_new_candidate() which:
#   - Validates company has a real website
#   - Looks up full street address via ABR or website contact page
#   - Rejects if missing any of: name, website, full street address
#   - Extracts email, owner, phone, employees, business type
#   - Calculates completeness score (0-100%)
#
# Minimum to insert: company_name + website + full street address
# Preferred: email + owner name + phone + employee count + type of work
#
# Usage:
#   ./run_pipeline.sh                  # full pipeline
#   ./run_pipeline.sh --houzz-only     # only Houzz
#   ./run_pipeline.sh --oneflare-only  # only Oneflare
#   ./run_pipeline.sh --mb-only        # only Master Builders
#   ./run_pipeline.sh --enrich-only    # only enrich existing scraped records

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
source .venv/bin/activate 2>/dev/null || source ~/venv/bin/activate 2>/dev/null || true

MODE=${1:-"--all"}
PYTHON=python3

echo "====== Roweo Acquisition Pipeline ======"
echo "$(date): Mode: $MODE"
echo "Minimum requirement: company name + website + full street address"
echo ""

if [[ "$MODE" == "--houzz-only" ]]; then
  echo "$(date): Houzz Find a Pro scraper..."
  $PYTHON acquisition/houzz_scraper.py --pages 5

elif [[ "$MODE" == "--oneflare-only" ]]; then
  echo "$(date): Oneflare builder directory scraper..."
  $PYTHON acquisition/oneflare_scraper.py --pages 5

elif [[ "$MODE" == "--mb-only" ]]; then
  echo "$(date): Master Builders NSW member directory..."
  $PYTHON acquisition/master_builders_scraper.py --pages 30

elif [[ "$MODE" == "--enrich-only" ]]; then
  echo "$(date): Enriching existing scraped prospects..."
  $PYTHON acquisition/enricher.py --limit 300

else
  # Default: all sources
  echo "$(date): [1/4] Houzz Find a Pro (primary — always has website)..."
  $PYTHON acquisition/houzz_scraper.py --pages 5

  echo ""
  echo "$(date): [2/4] Oneflare builder directory (verified AU listings)..."
  $PYTHON acquisition/oneflare_scraper.py --pages 5

  echo ""
  echo "$(date): [3/4] Master Builders NSW (licensed members, quality signal)..."
  $PYTHON acquisition/master_builders_scraper.py --pages 30

  echo ""
  echo "$(date): [4/4] hipages (supplementary)..."
  # hipages scraper lives on Mac Mini — only run if script exists
  if [ -f ~/roweo-scraper/acquisition/hipages_scraper.py ]; then
    cd ~/roweo-scraper && source ~/venv/bin/activate 2>/dev/null || true
    $PYTHON acquisition/hipages_scraper.py
    cd "$SCRIPT_DIR/.."
  else
    echo "  hipages scraper not found at ~/roweo-scraper/ — skipping"
  fi
fi

echo ""
echo "$(date): Enriching any remaining scraped prospects (fill preferred fields)..."
$PYTHON acquisition/enricher.py --limit 300

echo ""
echo "$(date): Pipeline complete."
echo ""
echo "Check results:"
echo "  Run: supabase db query --linked --sql \"SELECT COUNT(*), AVG(completeness_score)::int FROM builder_prospects WHERE website IS NOT NULL AND postal_address IS NOT NULL\""
