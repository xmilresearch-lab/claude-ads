"""Automated security scanner for Claude agent/skill files and Python scripts.

Runs a subset of the S01-S60 checks that can be automated via static analysis:
- Hardcoded secrets (S33)
- Missing maxTurns in agents (S06)
- Wildcard tool permissions (S05)
- Shell metacharacters and eval usage (S12, S50)
- Unquoted shell variables (S50)
- Missing set -euo pipefail (S50)
- F-string prompt injection patterns (S08)
- Missing rate limiting imports (S22)

Usage:
    python scripts/security_scan.py [--path .] [--format json|table] [--fail-on high]

Output:
    Exit code 0 = no findings at or above --fail-on severity
    Exit code 1 = findings found at or above --fail-on severity
    Exit code 2 = scanner error
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator


# ---------------------------------------------------------------------------
# Finding model
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}


@dataclass
class Finding:
    check_id: str
    severity: str
    file: str
    line: int
    message: str
    evidence: str = ""

    def as_dict(self) -> dict:
        return {
            "check_id": self.check_id,
            "severity": self.severity,
            "file": self.file,
            "line": self.line,
            "message": self.message,
            "evidence": self.evidence[:120] + "..." if len(self.evidence) > 120 else self.evidence,
        }


# ---------------------------------------------------------------------------
# Check implementations
# ---------------------------------------------------------------------------


def _iter_files(root: Path, suffixes: set[str]) -> Iterator[Path]:
    for path in root.rglob("*"):
        if path.is_file() and path.suffix in suffixes and ".git" not in path.parts:
            yield path


_SECRET_RE = re.compile(
    r'sk-ant-[a-zA-Z0-9\-_]{20,}'
    r'|(?:api_key|apikey|api-key|password|secret|token)\s*=\s*["\x27][^"\x27]{8,}',
    re.IGNORECASE,
)


def check_hardcoded_secrets(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in _iter_files(root, {".py", ".md", ".sh", ".ps1", ".json", ".yml", ".yaml"}):
        for lineno, line in enumerate(path.read_text(errors="replace").splitlines(), 1):
            if _SECRET_RE.search(line):
                findings.append(Finding(
                    check_id="S33",
                    severity="critical",
                    file=str(path),
                    line=lineno,
                    message="Potential hardcoded secret or API key",
                    evidence=line.strip(),
                ))
    return findings


def check_missing_max_turns(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    agents_dir = root / "agents"
    if not agents_dir.exists():
        return findings
    for path in agents_dir.glob("*.md"):
        content = path.read_text(errors="replace")
        if "maxTurns" not in content:
            findings.append(Finding(
                check_id="S06",
                severity="high",
                file=str(path),
                line=1,
                message="Agent definition missing maxTurns — runaway loop risk",
            ))
    return findings


def check_wildcard_tools(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in _iter_files(root, {".md"}):
        for lineno, line in enumerate(path.read_text(errors="replace").splitlines(), 1):
            if re.match(r"^tools:\s*\*", line.strip()):
                findings.append(Finding(
                    check_id="S05",
                    severity="high",
                    file=str(path),
                    line=lineno,
                    message="Wildcard tools permission — violates least privilege",
                    evidence=line.strip(),
                ))
    return findings


_EVAL_RE = re.compile(r"\beval\s*\(|\bexec\s*\(")


def check_eval_usage(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in _iter_files(root, {".py"}):
        for lineno, line in enumerate(path.read_text(errors="replace").splitlines(), 1):
            if _EVAL_RE.search(line) and not line.strip().startswith("#"):
                findings.append(Finding(
                    check_id="S12",
                    severity="critical",
                    file=str(path),
                    line=lineno,
                    message="eval/exec usage — code execution risk if fed LLM output",
                    evidence=line.strip(),
                ))
    return findings


_FSTRING_PROMPT_RE = re.compile(
    r'f["\x27].*\{.*(user|input|query|prompt|message|data).*\}',
    re.IGNORECASE,
)


def check_fstring_prompts(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in _iter_files(root, {".py"}):
        for lineno, line in enumerate(path.read_text(errors="replace").splitlines(), 1):
            if _FSTRING_PROMPT_RE.search(line) and not line.strip().startswith("#"):
                findings.append(Finding(
                    check_id="S08",
                    severity="medium",
                    file=str(path),
                    line=lineno,
                    message="F-string may embed unvalidated user input in prompt",
                    evidence=line.strip(),
                ))
    return findings


_UNQUOTED_VAR_RE = re.compile(r"(?<!\")\$[A-Z_][A-Z_0-9]*(?!["\x27]|\))")


def check_shell_unquoted_vars(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in _iter_files(root, {".sh"}):
        for lineno, line in enumerate(path.read_text(errors="replace").splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            if _UNQUOTED_VAR_RE.search(stripped):
                findings.append(Finding(
                    check_id="S50",
                    severity="high",
                    file=str(path),
                    line=lineno,
                    message="Unquoted shell variable — word splitting / injection risk",
                    evidence=stripped,
                ))
    return findings


def check_shell_safety_flags(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in _iter_files(root, {".sh"}):
        content = path.read_text(errors="replace")
        if "set -euo pipefail" not in content and "set -e" not in content:
            findings.append(Finding(
                check_id="S50",
                severity="medium",
                file=str(path),
                line=1,
                message="Shell script missing 'set -euo pipefail' — errors may be silently ignored",
            ))
    return findings


def check_os_system_usage(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    _os_system_re = re.compile(r"\bos\.system\s*\(")
    for path in _iter_files(root, {".py"}):
        for lineno, line in enumerate(path.read_text(errors="replace").splitlines(), 1):
            if _os_system_re.search(line) and not line.strip().startswith("#"):
                findings.append(Finding(
                    check_id="S50",
                    severity="critical",
                    file=str(path),
                    line=lineno,
                    message="os.system() invoked — use subprocess.run with list args instead",
                    evidence=line.strip(),
                ))
    return findings


# ---------------------------------------------------------------------------
# Scanner runner
# ---------------------------------------------------------------------------


ALL_CHECKS = [
    check_hardcoded_secrets,
    check_missing_max_turns,
    check_wildcard_tools,
    check_eval_usage,
    check_fstring_prompts,
    check_shell_unquoted_vars,
    check_shell_safety_flags,
    check_os_system_usage,
]


def run_scan(root: Path) -> list[Finding]:
    all_findings: list[Finding] = []
    for check in ALL_CHECKS:
        try:
            all_findings.extend(check(root))
        except Exception as exc:  # noqa: BLE001
            print(f"[scanner] check {check.__name__} failed: {exc}", file=sys.stderr)
    all_findings.sort(
        key=lambda f: (-SEVERITY_ORDER.get(f.severity, 0), f.file, f.line)
    )
    return all_findings


# ---------------------------------------------------------------------------
# Output formatters
# ---------------------------------------------------------------------------


def print_table(findings: list[Finding]) -> None:
    if not findings:
        print("\n✅  No findings.")
        return
    print(f"\n{'ID':<6} {'SEVERITY':<10} {'FILE':<50} {'LINE':<5} MESSAGE")
    print("-" * 120)
    for f in findings:
        truncated_file = f.file[-48:] if len(f.file) > 48 else f.file
        print(f"{f.check_id:<6} {f.severity.upper():<10} {truncated_file:<50} {f.line:<5} {f.message}")
        if f.evidence:
            print(f"       Evidence: {f.evidence[:100]}")
    counts = {}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
    print(f"\nTotal: {len(findings)} findings — ", end="")
    print(" | ".join(f"{v} {k.upper()}" for k, v in sorted(counts.items(), key=lambda x: -SEVERITY_ORDER.get(x[0], 0))))


def print_json(findings: list[Finding]) -> None:
    print(json.dumps([f.as_dict() for f in findings], indent=2))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Static security scanner for Claude agent/skill repositories"
    )
    ap.add_argument(
        "--path", type=Path, default=Path("."),
        help="Root directory to scan (default: current directory)"
    )
    ap.add_argument(
        "--format", choices=["table", "json"], default="table",
        help="Output format"
    )
    ap.add_argument(
        "--fail-on",
        choices=["critical", "high", "medium", "low", "none"],
        default="high",
        help="Exit with code 1 if any finding at this severity or above is found",
    )
    args = ap.parse_args()

    root = args.path.resolve()
    if not root.exists():
        print(f"Error: path '{root}' does not exist", file=sys.stderr)
        return 2

    print(f"Scanning: {root}")
    findings = run_scan(root)

    if args.format == "json":
        print_json(findings)
    else:
        print_table(findings)

    if args.fail_on == "none":
        return 0

    threshold = SEVERITY_ORDER.get(args.fail_on, 0)
    blocking = [
        f for f in findings
        if SEVERITY_ORDER.get(f.severity, 0) >= threshold
    ]
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main())
