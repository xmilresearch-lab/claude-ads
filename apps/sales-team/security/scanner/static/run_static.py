#!/usr/bin/env python3
"""
Static code analysis scanner for AI security anti-patterns.
Uses Semgrep + custom rules + npm audit. Requires no running server.
"""
import subprocess
import json
import sys
import os
from datetime import datetime
from colorama import Fore, Style, init

init(autoreset=True)

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '../../..'))
RULES_FILE   = os.path.join(SCRIPT_DIR, 'semgrep-ai-security.yml')
REPORTS_DIR  = os.path.join(SCRIPT_DIR, '../reports')

# Resolve venv-local binaries (semgrep lives next to the Python being used)
VENV_BIN = os.path.dirname(sys.executable)
SEMGREP  = os.path.join(VENV_BIN, 'semgrep')


def run_semgrep():
    """Run Semgrep with custom AI security rules."""
    print(f"{Fore.CYAN}[STATIC] Running Semgrep AI security rules...{Style.RESET_ALL}")
    if not os.path.exists(SEMGREP):
        return {"results": [], "error": "semgrep not found in venv — run npm run scan:setup"}
    result = subprocess.run(
        [
            SEMGREP, '--config', RULES_FILE,
            '--json', '--quiet',
            '--exclude-dir', 'node_modules',
            '--exclude-dir', '.next',
            '--exclude-dir', 'venv',
            PROJECT_ROOT,
        ],
        capture_output=True, text=True
    )
    try:
        return json.loads(result.stdout) if result.stdout.strip() else {"results": []}
    except json.JSONDecodeError:
        return {"results": [], "error": result.stderr[:500]}


def run_trivy():
    """Run Trivy dependency vulnerability scan (optional — requires trivy CLI)."""
    print(f"{Fore.CYAN}[STATIC] Running Trivy dependency scan...{Style.RESET_ALL}")
    result = subprocess.run(
        ['trivy', 'fs', '--security-checks', 'vuln', '--format', 'json', '--quiet', PROJECT_ROOT],
        capture_output=True, text=True
    )
    try:
        return json.loads(result.stdout) if result.stdout.strip() else {"Results": []}
    except json.JSONDecodeError:
        return {"Results": [], "error": "Trivy not installed. Run: brew install trivy"}


def run_npm_audit():
    """Run npm audit for Node.js dependency vulnerabilities."""
    print(f"{Fore.CYAN}[STATIC] Running npm audit...{Style.RESET_ALL}")
    result = subprocess.run(
        ['npm', 'audit', '--json'],
        capture_output=True, text=True, cwd=PROJECT_ROOT
    )
    try:
        data = json.loads(result.stdout) if result.stdout.strip() else {}
        # npm v7+ uses top-level "vulnerabilities" dict; v6 uses "metadata.vulnerabilities"
        if 'vulnerabilities' in data and isinstance(data['vulnerabilities'], dict):
            counts = {'critical': 0, 'high': 0, 'moderate': 0, 'low': 0}
            for v in data['vulnerabilities'].values():
                sev = v.get('severity', 'low')
                counts[sev] = counts.get(sev, 0) + 1
            data.setdefault('metadata', {})['vulnerabilities'] = counts
        return data
    except json.JSONDecodeError:
        return {}


def check_env_file_security():
    """Verify .env.local is gitignored and no secrets in tracked files."""
    print(f"{Fore.CYAN}[STATIC] Checking environment variable security...{Style.RESET_ALL}")
    issues = []

    gitignore_path = os.path.join(PROJECT_ROOT, '.gitignore')
    if os.path.exists(gitignore_path):
        with open(gitignore_path) as f:
            content = f.read()
        if '.env.local' not in content:
            issues.append({'severity': 'CRITICAL', 'message': '.env.local is not in .gitignore'})
    else:
        issues.append({'severity': 'CRITICAL', 'message': '.gitignore not found'})

    secret_patterns = ['sk-ant-', 'sk_live_', 'whsec_', 'rk_live_']
    for pattern in secret_patterns:
        result = subprocess.run(
            ['git', 'grep', '-r', pattern, '--', '*.ts', '*.tsx', '*.js'],
            capture_output=True, text=True, cwd=PROJECT_ROOT
        )
        if result.stdout.strip():
            issues.append({
                'severity': 'CRITICAL',
                'message': f'Possible hardcoded secret matching "{pattern}" found in tracked files',
                'detail': result.stdout[:200],
            })

    return issues


def print_summary(semgrep_results, npm_audit, env_issues):
    """Print formatted scan summary and return exit code."""
    findings = semgrep_results.get('results', [])
    total_errors   = sum(1 for r in findings if r.get('extra', {}).get('severity') == 'ERROR')
    total_warnings = sum(1 for r in findings if r.get('extra', {}).get('severity') == 'WARNING')
    total_info     = sum(1 for r in findings if r.get('extra', {}).get('severity') == 'INFO')

    vuln_meta  = npm_audit.get('metadata', {}).get('vulnerabilities', {})
    npm_high     = vuln_meta.get('high', 0)
    npm_critical = vuln_meta.get('critical', 0)
    env_critical = sum(1 for i in env_issues if i.get('severity') == 'CRITICAL')

    print(f"\n{'='*60}")
    print(f"  AI SECURITY STATIC SCAN RESULTS")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    if not findings and not env_issues and npm_high + npm_critical == 0:
        print(f"{Fore.GREEN}  No findings.{Style.RESET_ALL}")
    else:
        for finding in findings:
            sev   = finding.get('extra', {}).get('severity', 'INFO')
            color = Fore.RED if sev == 'ERROR' else Fore.YELLOW if sev == 'WARNING' else Fore.BLUE
            path  = finding.get('path', '').replace(PROJECT_ROOT + os.sep, '')
            line  = finding.get('start', {}).get('line', 0)
            msg   = finding.get('extra', {}).get('message', '')
            rule  = finding.get('check_id', '').split('.')[-1]
            print(f"{color}[{sev}] {path}:{line}  ({rule})")
            print(f"       {msg}{Style.RESET_ALL}")

        for issue in env_issues:
            print(f"{Fore.RED}[CRITICAL] ENV: {issue['message']}{Style.RESET_ALL}")
            if 'detail' in issue:
                print(f"           {issue['detail'][:100]}")

        if npm_high + npm_critical > 0:
            print(f"{Fore.RED}[DEPENDENCY] npm audit: {npm_critical} critical, {npm_high} high{Style.RESET_ALL}")

    print(f"\n  Semgrep: {total_errors} errors, {total_warnings} warnings, {total_info} info")
    print(f"  npm audit: {npm_critical} critical, {npm_high} high")
    print(f"  Env checks: {env_critical} critical issues")

    total_critical = total_errors + env_critical + npm_critical
    if total_critical > 0:
        print(f"\n{Fore.RED}RESULT: FAIL — {total_critical} critical issues require immediate fix{Style.RESET_ALL}")
        return 1
    elif total_warnings > 0:
        print(f"\n{Fore.YELLOW}RESULT: WARN — {total_warnings} warnings should be reviewed{Style.RESET_ALL}")
        return 0
    else:
        print(f"\n{Fore.GREEN}RESULT: PASS — No critical security issues found{Style.RESET_ALL}")
        return 0


def main():
    os.makedirs(REPORTS_DIR, exist_ok=True)

    semgrep = run_semgrep()
    npm     = run_npm_audit()
    env     = check_env_file_security()

    report = {
        'timestamp': datetime.now().isoformat(),
        'mode': 'static',
        'project_root': PROJECT_ROOT,
        'semgrep': semgrep,
        'npm_audit': npm,
        'env_issues': env,
    }
    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    report_path = os.path.join(REPORTS_DIR, f'static-{ts}.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report saved: {report_path}")

    sys.exit(print_summary(semgrep, npm, env))


if __name__ == '__main__':
    main()
