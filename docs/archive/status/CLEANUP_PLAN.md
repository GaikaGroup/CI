# Documentation Cleanup Plan

## Analysis

After reviewing the markdown files, I've identified several categories:

### ✅ Keep (Core Documentation)

- `README.md` - Main project documentation
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines
- `QUICK_START_FAST_OLLAMA.md` - Useful quick start guide
- `OLLAMA_MODELS_GUIDE.md` - Comprehensive model guide

### 📦 Archive (Temporary Status Files)

These are implementation status files that should be moved to `docs/archive/`:

**Root Level:**

- `BUGFIX_MESSAGE_DUPLICATION.md`
- `CHANGES_VERIFICATION.md`
- `CLEANUP_COMPLETE.md`
- `COMMAND_MENU_FIX.md`
- `COMMAND_PARAMETERS_FIX.md`
- `COMMAND_TEMPERATURES_IMPLEMENTATION.md`
- `DOCUMENTATION_ORGANIZED.md`
- `FAILED_TESTS_ANALYSIS.md`
- `FINAL_CHECKLIST.md`
- `FINAL_TESTS_DECISION.md`
- `IMAGE_CHAT_FIX.md`
- `IMPLEMENTATION_CHECKLIST.md`
- `IMPLEMENTATION_SUMMARY.md`
- `INSTRUCTIONS_FOR_PROMPT_REPLACEMENT.md`
- `LATEX_RENDERING_FIX.md`
- `LLM_PROVIDER_TRACKING_IMPLEMENTATION.md`
- `LOCALIZATION_100_PERCENT_COMPLETE.md`
- `LOCALIZATION_AUDIT.md`
- `LOCALIZATION_COMPLETE_FINAL.md`
- `LOCALIZATION_COMPLETE_SUMMARY.md`
- `LOCALIZATION_PLAN.md`
- `LOCALIZATION_STATUS.md`
- `LONG_TEXT_TTS_FIX.md`
- `MANUAL_TEST_SECOND_OPINION.md`
- `MATH_MODEL_OVERRIDE_FIX.md`
- `MATH_SUPPORT.md`
- `MODEL_UPGRADE_SUMMARY.md`
- `OLLAMA_FINAL_CONFIG.md`
- `QUICK_FIX_DB_CONNECTIONS.md`
- `QUICK_SUMMARY.md`
- `SECOND_OPINION_FIX.md`
- `SECOND_OPINION_QUICK_TEST.md`
- `SPEED_COMPARISON.md`
- `STATS_PAGE_IMPROVEMENTS.md`
- `SYSTEM_PROMPT_FINAL_IMPROVEMENTS.md`
- `SYSTEM_PROMPT_IMPROVEMENTS.md`
- `TEST_NOW.md`
- `TEST_SECOND_OPINION_NOW.md`
- `TESTS_ANALYSIS_FINAL.md`
- `TESTS_CLEANUP_PLAN.md`
- `VOICE_MODE_PDF_FIX.md`

### 🗑️ Delete (Redundant/Outdated)

Files that are duplicates or no longer relevant:

- Multiple `LOCALIZATION_*` files (keep only the final one in archive)
- Multiple `FINAL_*` files (consolidate)
- `TEST_NOW.md` and similar temporary test files

## Recommended Actions

### Option 1: Archive Everything (Safe)

Move all temporary files to `docs/archive/status/`:

```bash
mkdir -p docs/archive/status
mv BUGFIX_*.md CHANGES_*.md CLEANUP_*.md COMMAND_*.md docs/archive/status/
mv DOCUMENTATION_*.md FAILED_*.md FINAL_*.md IMAGE_*.md docs/archive/status/
mv IMPLEMENTATION_*.md INSTRUCTIONS_*.md LATEX_*.md LLM_*.md docs/archive/status/
mv LOCALIZATION_*.md LONG_*.md MANUAL_*.md MATH_*.md docs/archive/status/
mv MODEL_*.md OLLAMA_FINAL_CONFIG.md QUICK_FIX_*.md QUICK_SUMMARY.md docs/archive/status/
mv SECOND_*.md SPEED_*.md STATS_*.md SYSTEM_*.md docs/archive/status/
mv TEST_*.md TESTS_*.md VOICE_*.md docs/archive/status/
```

### Option 2: Delete Temporary Files (Aggressive)

Delete files that are purely temporary status updates:

```bash
rm -f TEST_NOW.md TEST_SECOND_OPINION_NOW.md
rm -f QUICK_SUMMARY.md FINAL_CHECKLIST.md
rm -f CLEANUP_COMPLETE.md DOCUMENTATION_ORGANIZED.md
# etc.
```

### Option 3: Selective Cleanup (Recommended)

1. Keep useful guides in root
2. Move completed implementation docs to `docs/archive/implementations/`
3. Move fix documentation to `docs/archive/fixes/`
4. Delete purely temporary files

## Clean Root Directory Structure

After cleanup, root should only have:

```
├── README.md                      # Main documentation
├── CHANGELOG.md                   # Version history
├── CONTRIBUTING.md                # Contribution guide
├── QUICK_START_FAST_OLLAMA.md    # Quick start guide
├── OLLAMA_MODELS_GUIDE.md        # Model guide
├── docs/                          # All other documentation
├── src/                           # Source code
├── tests/                         # Tests
└── [other project files]
```

## Next Steps

1. Review this plan
2. Choose cleanup strategy (Option 1, 2, or 3)
3. Execute cleanup
4. Update README.md with clean documentation structure
5. Add note in docs/archive/README.md explaining archived files
