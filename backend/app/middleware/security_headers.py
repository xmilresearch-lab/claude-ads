from typing import Any

from fastapi import Request, Response
from secure import (
    ContentSecurityPolicy,
    ReferrerPolicy,
    Secure,
    StrictTransportSecurity,
    XFrameOptions,
)

secure_headers = Secure(
    csp=(
        ContentSecurityPolicy()
        .default_src("'self'")
        .script_src("'self'")
        .style_src("'self'", "'unsafe-inline'")
        .img_src("'self'", "data:")
        .connect_src("'self'")
    ),
    hsts=StrictTransportSecurity().max_age(31536000).include_subdomains(),
    referrer=ReferrerPolicy().no_referrer(),
    xfo=XFrameOptions().deny(),
)


async def add_security_headers(request: Request, call_next: Any) -> Response:
    response = await call_next(request)
    await secure_headers.set_headers_async(response)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    return response
