"""
MCP Evaluation Runner

Parses eval XML files, sends each prompt to Claude with the target MCP server
configured as a tool source, and checks the response against expected tool calls
and rubric criteria.

Usage
─────
    # Run all evals
    python tests/mcp-evals/run_evals.py

    # Run a single server
    python tests/mcp-evals/run_evals.py --server social-mcp-server

    # Point at non-default MCP URLs
    SOCIAL_MCP_URL=http://localhost:3001 \
    EMAIL_MCP_URL=http://localhost:3002 \
    CRM_MCP_URL=http://localhost:3003 \
    MCP_AUTH_TOKEN=secret \
    python tests/mcp-evals/run_evals.py

Environment variables
─────────────────────
    ANTHROPIC_API_KEY   — required
    SOCIAL_MCP_URL      — default http://localhost:3001
    EMAIL_MCP_URL       — default http://localhost:3002
    CRM_MCP_URL         — default http://localhost:3003
    MCP_AUTH_TOKEN      — default empty string
    CLAUDE_MODEL        — default claude-sonnet-4-20250514
    EVAL_TIMEOUT        — per-eval timeout in seconds, default 60
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import anthropic

# ── Constants ─────────────────────────────────────────────────────────────────

EVAL_DIR = Path(__file__).parent

SERVER_CONFIG: dict[str, dict[str, str]] = {
    "social-mcp-server": {
        "eval_file": "social-mcp-eval.xml",
        "url_env": "SOCIAL_MCP_URL",
        "default_url": "http://localhost:3001",
    },
    "email-mcp-server": {
        "eval_file": "email-mcp-eval.xml",
        "url_env": "EMAIL_MCP_URL",
        "default_url": "http://localhost:3002",
    },
    "crm-mcp-server": {
        "eval_file": "crm-mcp-eval.xml",
        "url_env": "CRM_MCP_URL",
        "default_url": "http://localhost:3003",
    },
}

MCP_BETA = "mcp-client-2025-11-20"
DEFAULT_MODEL = "claude-sonnet-4-20250514"
DEFAULT_TIMEOUT = 60


# ── Data classes ──────────────────────────────────────────────────────────────


@dataclass
class ExpectedTool:
    name: str
    args: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvalCase:
    eval_id: str
    description: str
    system: str
    prompt: str
    expected_tools: list[ExpectedTool]
    rubric: list[str]


@dataclass
class EvalResult:
    eval_id: str
    description: str
    passed: bool
    failures: list[str]
    tools_called: list[str]
    tool_results: list[dict[str, Any]]


# ── XML parsing ───────────────────────────────────────────────────────────────


def _parse_arg_value(arg_el: ET.Element) -> Any:
    """Convert an <arg> element to its Python-typed value."""
    arg_type = arg_el.get("type", "string")
    text = (arg_el.text or "").strip()
    if arg_type == "int":
        return int(text)
    if arg_type in ("array", "object"):
        return json.loads(text)
    if arg_type == "bool":
        return text.lower() == "true"
    return text


def parse_eval_file(path: Path) -> list[EvalCase]:
    tree = ET.parse(path)
    root = tree.getroot()
    cases: list[EvalCase] = []

    for eval_el in root.findall("eval"):
        eval_id = eval_el.get("id", "unknown")
        description = (eval_el.findtext("description") or "").strip()
        system = (eval_el.findtext("system") or "").strip()
        prompt = (eval_el.findtext("prompt") or "").strip()

        expected_tools: list[ExpectedTool] = []
        for tool_el in eval_el.findall("./expected_tools/tool"):
            tool_name = tool_el.get("name", "")
            args = {
                arg_el.get("name", ""): _parse_arg_value(arg_el)
                for arg_el in tool_el.findall("arg")
                if arg_el.get("name")
            }
            expected_tools.append(ExpectedTool(name=tool_name, args=args))

        rubric = [
            (el.text or "").strip()
            for el in eval_el.findall("./rubric/pass_if")
        ]

        cases.append(
            EvalCase(
                eval_id=eval_id,
                description=description,
                system=system,
                prompt=prompt,
                expected_tools=expected_tools,
                rubric=rubric,
            )
        )

    return cases


# ── Claude API call ───────────────────────────────────────────────────────────


def _extract_tool_use_blocks(
    response: anthropic.types.Message,
) -> list[dict[str, Any]]:
    """Return all tool_use content blocks from a Message."""
    blocks = []
    for block in response.content:
        if block.type == "tool_use":
            blocks.append(
                {
                    "name": block.name,
                    "input": block.input,
                    "id": block.id,
                }
            )
    return blocks


def run_eval_case(
    client: anthropic.Anthropic,
    case: EvalCase,
    mcp_url: str,
    auth_token: str,
    model: str,
) -> EvalResult:
    """
    Run a single eval: send the prompt to Claude with the MCP server configured,
    collect tool-use blocks, and evaluate them against the rubric.

    Claude is allowed to call tools multiple times (multi-turn is simulated by
    continuing the conversation until stop_reason is "end_turn" or no new tool
    calls appear).
    """
    messages: list[dict[str, Any]] = [{"role": "user", "content": case.prompt}]
    mcp_server: dict[str, Any] = {
        "type": "url",
        "url": mcp_url,
        "name": "mcp",
        **({"authorization_token": auth_token} if auth_token else {}),
    }

    all_tool_calls: list[dict[str, Any]] = []
    all_tool_results: list[dict[str, Any]] = []

    max_turns = 5
    for _ in range(max_turns):
        try:
            response = client.beta.messages.create(
                model=model,
                max_tokens=4096,
                system=case.system,
                messages=messages,
                mcp_servers=[mcp_server],
                betas=[MCP_BETA],
            )
        except anthropic.APIError as exc:
            return EvalResult(
                eval_id=case.eval_id,
                description=case.description,
                passed=False,
                failures=[f"Claude API error: {exc}"],
                tools_called=[],
                tool_results=[],
            )

        tool_blocks = _extract_tool_use_blocks(response)
        all_tool_calls.extend(tool_blocks)

        if response.stop_reason == "end_turn" or not tool_blocks:
            break

        # Build tool results to continue the conversation.
        # Since the MCP server is not actually running in test environments,
        # we use stub results so the evaluation focuses on tool selection.
        tool_results_content: list[dict[str, Any]] = []
        for tb in tool_blocks:
            stub_result = json.dumps(
                {
                    "items": [],
                    "has_more": False,
                    "total_count": 0,
                    "next_offset": tb["input"].get("limit", 20)
                    + tb["input"].get("offset", 0),
                }
            )
            tool_results_content.append(
                {
                    "type": "tool_result",
                    "tool_use_id": tb["id"],
                    "content": stub_result,
                }
            )
            all_tool_results.append(
                {"tool": tb["name"], "result": json.loads(stub_result)}
            )

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results_content})

    tools_called = [tb["name"] for tb in all_tool_calls]

    # ── Evaluate ──────────────────────────────────────────────────────────────
    failures = _evaluate(case, all_tool_calls, all_tool_results, tools_called)
    return EvalResult(
        eval_id=case.eval_id,
        description=case.description,
        passed=len(failures) == 0,
        failures=failures,
        tools_called=tools_called,
        tool_results=all_tool_results,
    )


# ── Rubric evaluator ──────────────────────────────────────────────────────────


def _evaluate(
    case: EvalCase,
    tool_calls: list[dict[str, Any]],
    tool_results: list[dict[str, Any]],
    tools_called: list[str],
) -> list[str]:
    """
    Return a list of failure messages.  Empty list = all criteria passed.

    Criteria are matched by simple heuristic rules on the criterion text:
    - "tool called with <arg> == <value>" — check tool input
    - "<tool> is called" / "<tool> is called first/second"
    - "tool_result JSON contains key <key>"
    - "tool called with <arg> containing <value>"
    - "tool called with <arg> >= <value>"
    - "<tool> tool_result JSON contains key <key>"
    """
    failures: list[str] = []

    # Build an index: tool_name → list of call inputs (in order)
    calls_by_name: dict[str, list[dict[str, Any]]] = {}
    for tc in tool_calls:
        calls_by_name.setdefault(tc["name"], []).append(tc["input"])

    # Check expected tools were called (order matters for multi-tool)
    for idx, expected in enumerate(case.expected_tools):
        if expected.name not in tools_called:
            failures.append(
                f"Expected tool '{expected.name}' was not called "
                f"(tools called: {tools_called})"
            )
            continue

        # For multi-tool evals: check relative ordering
        if len(case.expected_tools) > 1 and idx > 0:
            prev = case.expected_tools[idx - 1].name
            prev_pos = next(
                (i for i, t in enumerate(tools_called) if t == prev), -1
            )
            curr_pos = next(
                (i for i, t in enumerate(tools_called) if t == expected.name), -1
            )
            if prev_pos != -1 and curr_pos != -1 and curr_pos < prev_pos:
                failures.append(
                    f"Tool '{expected.name}' was called before '{prev}' "
                    f"but expected after"
                )

        # Check required args
        actual_calls = calls_by_name.get(expected.name, [])
        for arg_name, expected_val in expected.args.items():
            matched = any(
                call.get(arg_name) == expected_val for call in actual_calls
            )
            if not matched:
                actual_vals = [call.get(arg_name) for call in actual_calls]
                failures.append(
                    f"Tool '{expected.name}': expected arg '{arg_name}' == "
                    f"{expected_val!r}, got {actual_vals!r}"
                )

    # Evaluate rubric lines
    for criterion in case.rubric:
        crit = criterion.lower()

        # "<tool> is called [first|second]"
        if " is called" in crit:
            tool_name_part = criterion.split(" is called")[0].strip()
            if tool_name_part not in tools_called:
                failures.append(f"Rubric: '{criterion}' — not satisfied")
            elif "first" in crit:
                if tools_called[0] != tool_name_part:
                    failures.append(
                        f"Rubric: '{criterion}' — called at position "
                        f"{tools_called.index(tool_name_part) + 1}, expected 1"
                    )
            elif "second" in crit:
                if len(tools_called) < 2 or tools_called[1] != tool_name_part:
                    failures.append(
                        f"Rubric: '{criterion}' — not called second"
                    )
            continue

        # "tool_result JSON contains key <key>"  or
        # "<tool> tool_result JSON contains key <key>"
        if "tool_result json contains key" in crit:
            key = criterion.split("contains key")[-1].strip().strip('"')
            # which tool to check?
            if " tool_result" in crit and crit.index(" tool_result") > 0:
                tname = criterion.split(" tool_result")[0].strip()
                relevant_results = [
                    r["result"]
                    for r in tool_results
                    if r["tool"] == tname
                ]
            else:
                # any tool result
                relevant_results = [r["result"] for r in tool_results]

            if not relevant_results:
                failures.append(
                    f"Rubric: '{criterion}' — no tool results to check"
                )
                continue

            if not any(isinstance(r, dict) and key in r for r in relevant_results):
                failures.append(
                    f"Rubric: '{criterion}' — key '{key}' not found in any result"
                )
            continue

        # "tool called with <arg> == <value>"
        if "tool called with" in crit and " == " in crit:
            after = criterion.split("tool called with")[-1].strip()
            arg_part, val_part = after.split(" == ", 1)
            arg_name = arg_part.strip()
            raw_val = val_part.strip().strip('"')
            # try numeric
            try:
                expected_val: Any = int(raw_val)
            except ValueError:
                expected_val = raw_val

            matched = False
            for tc in tool_calls:
                actual = tc["input"].get(arg_name)
                if actual == expected_val:
                    matched = True
                    break
            if not matched:
                actuals = [tc["input"].get(arg_name) for tc in tool_calls]
                failures.append(
                    f"Rubric: '{criterion}' — arg '{arg_name}' values were "
                    f"{actuals!r}"
                )
            continue

        # "tool called with <arg> containing <value>"
        if "tool called with" in crit and " containing " in crit:
            after = criterion.split("tool called with")[-1].strip()
            arg_name, val_part = after.split(" containing ", 1)
            arg_name = arg_name.strip()
            val = val_part.strip().strip('"')

            matched = False
            for tc in tool_calls:
                actual = tc["input"].get(arg_name)
                if isinstance(actual, str) and val in actual:
                    matched = True
                    break
                if isinstance(actual, list) and val in actual:
                    matched = True
                    break
            if not matched:
                actuals = [tc["input"].get(arg_name) for tc in tool_calls]
                failures.append(
                    f"Rubric: '{criterion}' — not satisfied; values: {actuals!r}"
                )
            continue

        # "tool called with <arg> >= <value>"
        if "tool called with" in crit and " >= " in crit:
            after = criterion.split("tool called with")[-1].strip()
            arg_name, val_part = after.split(" >= ", 1)
            arg_name = arg_name.strip()
            threshold = int(val_part.strip())

            matched = any(
                isinstance(tc["input"].get(arg_name), (int, float))
                and tc["input"][arg_name] >= threshold
                for tc in tool_calls
            )
            if not matched:
                actuals = [tc["input"].get(arg_name) for tc in tool_calls]
                failures.append(
                    f"Rubric: '{criterion}' — not satisfied; values: {actuals!r}"
                )
            continue

        # "tool called with <arg> starting with <value>"
        if "tool called with" in crit and " starting with " in crit:
            after = criterion.split("tool called with")[-1].strip()
            arg_name, prefix_part = after.split(" starting with ", 1)
            arg_name = arg_name.strip()
            prefix = prefix_part.strip().strip('"')

            matched = any(
                isinstance(tc["input"].get(arg_name), str)
                and tc["input"][arg_name].strip().startswith(prefix)
                for tc in tool_calls
            )
            if not matched:
                actuals = [tc["input"].get(arg_name) for tc in tool_calls]
                failures.append(
                    f"Rubric: '{criterion}' — not satisfied; values: {actuals!r}"
                )
            continue

    return failures


# ── Runner ────────────────────────────────────────────────────────────────────


def run_server_evals(
    client: anthropic.Anthropic,
    server_name: str,
    config: dict[str, str],
    model: str,
) -> list[EvalResult]:
    eval_file = EVAL_DIR / config["eval_file"]
    if not eval_file.exists():
        print(f"  [SKIP] {eval_file} not found")
        return []

    mcp_url = os.environ.get(config["url_env"], config["default_url"])
    auth_token = os.environ.get("MCP_AUTH_TOKEN", "")
    cases = parse_eval_file(eval_file)

    results: list[EvalResult] = []
    for case in cases:
        print(f"  [{server_name}] {case.eval_id}: {case.description} ...", end="", flush=True)
        result = run_eval_case(client, case, mcp_url, auth_token, model)
        status = "PASS" if result.passed else "FAIL"
        print(f" {status}")
        if not result.passed:
            for f in result.failures:
                print(f"    ✗ {f}")
        results.append(result)

    return results


def print_summary(all_results: list[EvalResult]) -> int:
    """Print final summary. Returns exit code (0 = all pass)."""
    passed = sum(1 for r in all_results if r.passed)
    total = len(all_results)
    failed = total - passed

    print("\n" + "─" * 60)
    print(f"Results: {passed}/{total} passed", end="")
    if failed:
        print(f", {failed} FAILED")
    else:
        print(" — all green ✓")
    print("─" * 60)

    if failed:
        print("\nFailed evals:")
        for r in all_results:
            if not r.passed:
                print(f"  {r.eval_id}: {r.description}")
                for f in r.failures:
                    print(f"    ✗ {f}")

    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run MCP evaluations")
    parser.add_argument(
        "--server",
        choices=list(SERVER_CONFIG.keys()),
        help="Run only a specific server's evals",
    )
    parser.add_argument(
        "--model",
        default=os.environ.get("CLAUDE_MODEL", DEFAULT_MODEL),
        help="Claude model to use",
    )
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable is not set", file=sys.stderr)
        return 1

    client = anthropic.Anthropic(api_key=api_key)
    servers = (
        {args.server: SERVER_CONFIG[args.server]}
        if args.server
        else SERVER_CONFIG
    )

    all_results: list[EvalResult] = []
    for server_name, config in servers.items():
        print(f"\n{'─' * 60}")
        print(f"Server: {server_name}  ({config['default_url']})")
        print("─" * 60)
        all_results.extend(run_server_evals(client, server_name, config, args.model))

    return print_summary(all_results)


if __name__ == "__main__":
    sys.exit(main())
