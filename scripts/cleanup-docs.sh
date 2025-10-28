#!/bin/bash

# Documentation Cleanup Script
# This script organizes markdown files into proper directories

set -e

echo "🧹 Starting documentation cleanup..."

# Create archive directories if they don't exist
mkdir -p docs/archive/status
mkdir -p docs/archive/implementations
mkdir -p docs/archive/fixes

echo "📦 Moving temporary status files to archive..."

# Move root-level status and temporary files to archive
mv -v BUGFIX_MESSAGE_DUPLICATION.md docs/archive/status/ 2>/dev/null || true
mv -v CHANGES_VERIFICATION.md docs/archive/status/ 2>/dev/null || true
mv -v CLEANUP_COMPLETE.md docs/archive/status/ 2>/dev/null || true
mv -v COMMAND_MENU_FIX.md docs/archive/status/ 2>/dev/null || true
mv -v COMMAND_PARAMETERS_FIX.md docs/archive/status/ 2>/dev/null || true
mv -v COMMAND_TEMPERATURES_IMPLEMENTATION.md docs/archive/status/ 2>/dev/null || true
mv -v DOCUMENTATION_ORGANIZED.md docs/archive/status/ 2>/dev/null || true
mv -v FAILED_TESTS_ANALYSIS.md docs/archive/status/ 2>/dev/null || true
mv -v FINAL_CHECKLIST.md docs/archive/status/ 2>/dev/null || true
mv -v FINAL_TESTS_DECISION.md docs/archive/status/ 2>/dev/null || true
mv -v IMAGE_CHAT_FIX.md docs/archive/status/ 2>/dev/null || true
mv -v IMPLEMENTATION_CHECKLIST.md docs/archive/status/ 2>/dev/null || true
mv -v IMPLEMENTATION_SUMMARY.md docs/archive/status/ 2>/dev/null || true
mv -v INSTRUCTIONS_FOR_PROMPT_REPLACEMENT.md docs/archive/status/ 2>/dev/null || true
mv -v LATEX_RENDERING_FIX.md docs/archive/status/ 2>/dev/null || true
mv -v LLM_PROVIDER_TRACKING_IMPLEMENTATION.md docs/archive/status/ 2>/dev/null || true
mv -v LOCALIZATION_100_PERCENT_COMPLETE.md docs/archive/status/ 2>/dev/null || true
mv -v LOCALIZATION_AUDIT.md docs/archive/status/ 2>/dev/null || true
mv -v LOCALIZATION_COMPLETE_FINAL.md docs/archive/status/ 2>/dev/null || true
mv -v LOCALIZATION_COMPLETE_SUMMARY.md docs/archive/status/ 2>/dev/null || true
mv -v LOCALIZATION_PLAN.md docs/archive/status/ 2>/dev/null || true
mv -v LOCALIZATION_STATUS.md docs/archive/status/ 2>/dev/null || true
mv -v LONG_TEXT_TTS_FIX.md docs/archive/status/ 2>/dev/null || true
mv -v MANUAL_TEST_SECOND_OPINION.md docs/archive/status/ 2>/dev/null || true
mv -v MATH_MODEL_OVERRIDE_FIX.md docs/archive/status/ 2>/dev/null || true
mv -v MATH_SUPPORT.md docs/archive/status/ 2>/dev/null || true
mv -v MODEL_UPGRADE_SUMMARY.md docs/archive/status/ 2>/dev/null || true
mv -v OLLAMA_FINAL_CONFIG.md docs/archive/status/ 2>/dev/null || true
mv -v QUICK_FIX_DB_CONNECTIONS.md docs/archive/status/ 2>/dev/null || true
mv -v QUICK_SUMMARY.md docs/archive/status/ 2>/dev/null || true
mv -v SECOND_OPINION_FIX.md docs/archive/status/ 2>/dev/null || true
mv -v SECOND_OPINION_QUICK_TEST.md docs/archive/status/ 2>/dev/null || true
mv -v SPEED_COMPARISON.md docs/archive/status/ 2>/dev/null || true
mv -v STATS_PAGE_IMPROVEMENTS.md docs/archive/status/ 2>/dev/null || true
mv -v SYSTEM_PROMPT_FINAL_IMPROVEMENTS.md docs/archive/status/ 2>/dev/null || true
mv -v SYSTEM_PROMPT_IMPROVEMENTS.md docs/archive/status/ 2>/dev/null || true
mv -v TEST_NOW.md docs/archive/status/ 2>/dev/null || true
mv -v TEST_SECOND_OPINION_NOW.md docs/archive/status/ 2>/dev/null || true
mv -v TESTS_ANALYSIS_FINAL.md docs/archive/status/ 2>/dev/null || true
mv -v TESTS_CLEANUP_PLAN.md docs/archive/status/ 2>/dev/null || true
mv -v VOICE_MODE_PDF_FIX.md docs/archive/status/ 2>/dev/null || true

echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  Root directory cleaned"
echo "  Status files moved to docs/archive/status/"
echo ""
echo "📝 Remaining root-level docs:"
ls -1 *.md 2>/dev/null || echo "  (none)"
echo ""
echo "💡 Next steps:"
echo "  1. Review docs/archive/status/ to ensure nothing important was moved"
echo "  2. Update README.md if needed"
echo "  3. Commit changes"
