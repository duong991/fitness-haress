#!/usr/bin/env bash
# Auto-commit pending changes under data/ (only that folder).
# Runs as a Claude Code PostToolUse hook; safe to run by hand too.
# Skips silently when nothing changed, and refuses to commit JSON that
# fails scripts/validate-data.mjs so the Web UI never loads a broken store.

set -u
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Don't interfere with an in-progress merge or rebase.
if [ -e .git/MERGE_HEAD ] || [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
  exit 0
fi

# Nothing changed under data/ (tracked or untracked)? Done.
[ -z "$(git status --porcelain -- data/)" ] && exit 0

log=$(mktemp)
if ! node scripts/validate-data.mjs >"$log" 2>&1; then
  echo "autocommit-data: validation failed, data/ NOT committed:" >&2
  cat "$log" >&2
  rm -f "$log"
  exit 0
fi
rm -f "$log"

# Every changed JSON file must at least parse (validate-data only knows the core files).
bad=0
while IFS= read -r f; do
  case "$f" in
    *.json)
      [ -f "$f" ] || continue # deleted files have nothing to parse
      if ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$f" 2>/dev/null; then
        echo "autocommit-data: invalid JSON in $f, data/ NOT committed" >&2
        bad=1
      fi ;;
  esac
done < <(git status --porcelain -- data/ | sed 's/^...//')
[ "$bad" -eq 0 ] || exit 0

git add -A -- data/

# Pathspec commit: only data/ goes in, even if other files are staged.
files=$(git diff --cached --name-only -- data/ | sed 's|^data/||')
[ -z "$files" ] && exit 0

summary=$(printf '%s\n' "$files" | paste -sd ', ' -)
git commit -q -m "data: update $(date +%Y-%m-%d)" -m "Files: ${summary}" \
  -m "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>" -- data/ \
  && echo "autocommit-data: committed data/ ($summary)" >&2

exit 0
