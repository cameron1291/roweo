#!/bin/bash
# Roweo acquisition pipeline — scrape, enrich, score
# Usage: ./run_pipeline.sh [--all-regions] [--max 25]
# Default: runs all NSW regions (Sydney, Newcastle, Central Coast, Northern Beaches)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
source .venv/bin/activate

MAX=${2:-25}
REGIONS=${1:---all-regions}

echo "====== Roweo Acquisition Pipeline ======"
echo "$(date): Starting scraper ($REGIONS, max=$MAX per query)"
python3 acquisition/google_maps_scraper.py $REGIONS --max $MAX

echo ""
echo "$(date): Starting enricher (websites + emails)"
python3 acquisition/enricher.py --limit 200

echo ""
echo "$(date): Starting scorer"
python3 acquisition/scorer.py --limit 200

echo ""
echo "$(date): Pipeline complete."
