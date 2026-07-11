# claude-ads

Paid-advertising audit & optimization skill for Claude Code. The full project
source lives in a private, access-controlled location; this repo is kept for
reference. The policy below is binding for any work in this repository.

## SECRET HANDLING — NEVER BREAK THESE

- Never write a real credential value into ANY file in this repo: not code, not `.env.example`, not docs, not context handoffs, not audit reports, not commit messages, not PR descriptions.
- Documentation and handoff docs reference env var NAMES only (e.g. "set `VAPID_PRIVATE_KEY` in Railway") — never values, never "temporary" pastes, never truncated/partial values.
- Real values live ONLY in untracked `.env` files locally and in Railway/Vercel secret managers in deployment.
- When generating a new credential, output it to the terminal or directly into the untracked `.env` — never into a file that could be committed, never into a summary document.
- Before any commit that touches `.md` files, re-read this section.
- If a secret is ever committed: rotate FIRST, then rewrite history.

**Enforcement (do not disable).** This repo has a local pre-commit secret tripwire (gitleaks) and a GitHub Actions secret-scan backstop. Do NOT bypass the hook with `git commit --no-verify`. After cloning, enable the hook once:

```bash
git config core.hooksPath .githooks   # requires gitleaks installed locally
```

Known non-secret test fixtures and local-dev placeholders are allowlisted in `.gitleaks.toml`; everything else is blocked.
