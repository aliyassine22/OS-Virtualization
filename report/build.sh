#!/usr/bin/env bash
# Rebuild the IEEE report (DOCX + PDF). Run from the repository root: bash report/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."
python3 report/src/make_demo_figure.py
node report/src/build_report.js
zip -qd report/output/IEEE_Report_Virtualization_in_OS.docx "*/" 2>/dev/null || true   # strip folder entries (Word/cloud compatibility)
cd report/output
soffice --headless --convert-to pdf IEEE_Report_Virtualization_in_OS.docx >/dev/null
echo "PDF: report/output/IEEE_Report_Virtualization_in_OS.pdf ($(pdfinfo IEEE_Report_Virtualization_in_OS.pdf 2>/dev/null | awk '/Pages/{print $2}') pages)"
