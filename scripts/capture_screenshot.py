#!/usr/bin/env python3
"""
Capture screenshots of ad landing pages for creative audit.

Usage:
    python capture_screenshot.py https://example.com/landing
    python capture_screenshot.py https://example.com/landing --mobile
    python capture_screenshot.py https://example.com/landing --all
"""

import argparse
import ipaddress
import os
import socket
import sys
from urllib.parse import urlparse

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("Error: playwright required. Install with: pip install -r requirements.txt && playwright install chromium")
    sys.exit(1)


_BLOCKED_NETS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
]


def _validate_url(url: str) -> str:
    """Validate URL scheme and block private/internal IPs (SSRF protection)."""
    parsed = urlparse(url)
    if not parsed.scheme:
        url = f"https://{url}"
        parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Invalid URL scheme: {parsed.scheme}. Only http/https allowed.")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL has no hostname.")
    try:
        resolved = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for _, _, _, _, addr in resolved:
            ip = ipaddress.ip_address(addr[0])
            for net in _BLOCKED_NETS:
                if ip in net:
                    raise ValueError(f"URL resolves to blocked private/internal IP: {ip}")
    except socket.gaierror:
        pass
    return url


VIEWPORTS = {
    "desktop": {"width": 1920, "height": 1080},
    "tablet": {"width": 768, "height": 1024},
    "mobile": {"width": 375, "height": 812},
}


def capture_screenshot(
    url: str,
    output_path: str,
    viewport: str = "desktop",
    full_page: bool = False,
    timeout: int = 30000,
) -> dict:
    """
    Capture a screenshot of an ad landing page.

    Returns:
        Dictionary with url, output, viewport, success, error
    """
    result = {
        "url": url,
        "output": output_path,
        "viewport": viewport,
        "success": False,
        "error": None,
    }

    if viewport not in VIEWPORTS:
        result["error"] = f"Invalid viewport: {viewport}. Choose from: {list(VIEWPORTS.keys())}"
        return result

    vp = VIEWPORTS[viewport]

    try:
        url = _validate_url(url)
    except ValueError as e:
        result["error"] = str(e)
        return result

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                device_scale_factor=2 if viewport == "mobile" else 1,
            )
            page = context.new_page()
            page.goto(url, wait_until="networkidle", timeout=timeout)
            page.wait_for_timeout(1000)
            page.screenshot(path=output_path, full_page=full_page)
            result["success"] = True
            browser.close()

    except PlaywrightTimeout:
        result["error"] = f"Page load timed out after {timeout}ms"
    except Exception as e:
        result["error"] = str(e)

    return result


def main():
    parser = argparse.ArgumentParser(description="Capture ad landing page screenshots")
    parser.add_argument("url", help="URL to capture")
    parser.add_argument("--output", "-o", default="screenshots", help="Output directory")
    parser.add_argument("--viewport", "-v", default="desktop", choices=VIEWPORTS.keys())
    parser.add_argument("--all", "-a", action="store_true", help="Capture all viewports")
    parser.add_argument("--full", "-f", action="store_true", help="Capture full page")
    parser.add_argument("--timeout", "-t", type=int, default=30000, help="Timeout in ms")

    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    parsed = urlparse(args.url)
    base_name = parsed.netloc.replace(".", "_")

    viewports = VIEWPORTS.keys() if args.all else [args.viewport]

    for viewport in viewports:
        filename = f"{base_name}_{viewport}.png"
        output_path = os.path.join(args.output, filename)

        print(f"Capturing {viewport} screenshot...")
        result = capture_screenshot(
            args.url,
            output_path,
            viewport=viewport,
            full_page=args.full,
            timeout=args.timeout,
        )

        if result["success"]:
            print(f"  Saved to {output_path}")
        else:
            print(f"  Failed: {result['error']}")


if __name__ == "__main__":
    main()
