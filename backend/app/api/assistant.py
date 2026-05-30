import uuid
from typing import Annotated, AsyncGenerator, Literal

import anthropic
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.middleware.dlp_scanner import redact_output
from app.middleware.injection_scanner import require_clean
from app.middleware.rate_limiter import limiter
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.workspace import Workspace

router = APIRouter(tags=["assistant"])

_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AssistantRequest(BaseModel):
    messages: list[AssistantMessage]
    page_context: str


def _build_system_prompt(workspace: Workspace, page_context: str) -> str:
    brand_voice = workspace.brand_voice or {}
    tone = brand_voice.get("tone", "professional")
    return (
        f"You are an AI assistant embedded in {workspace.name}'s automation dashboard.\n"
        "You help users configure automations, understand analytics, manage their content queue,\n"
        "and troubleshoot integrations.\n\n"
        f"Current page: {page_context}\n"
        f"Brand voice: {tone}\n\n"
        "You are concise, direct, and action-oriented. You suggest specific next steps.\n"
        "You NEVER reveal internal credentials, tokens, or system architecture.\n"
        "When you don't know something, say so clearly rather than fabricating."
    )


async def _stream_with_dlp(
    stream: anthropic.AsyncMessageStream,
) -> AsyncGenerator[str, None]:
    async with stream as s:
        async for text in s.text_stream:
            # Architecture Rule #2 — DLP scan output before streaming to client
            clean = redact_output(text)
            yield f"data: {clean}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/chat")
@limiter.limit("30/minute")
async def chat(
    request: Request,
    body: AssistantRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    # Architecture Rule #1 — injection scan all user messages before Claude
    cleaned: list[dict] = []
    for msg in body.messages:
        content = msg.content
        if msg.role == "user":
            content = require_clean(content)
        cleaned.append({"role": msg.role, "content": content})

    system = _build_system_prompt(workspace, body.page_context)

    # Architecture Rule #4 — every assistant chat writes to audit_logs
    db.add(
        AuditLog(
            id=uuid.uuid4(),
            workspace_id=workspace.id,
            action="assistant.chat",
            actor=current_user.email,
            log_metadata={
                "page": body.page_context,
                "message_count": len(body.messages),
            },
        )
    )
    await db.commit()

    stream = _client.messages.stream(
        model=settings.CLAUDE_MODEL,
        system=system,
        messages=cleaned,
        max_tokens=1000,
    )

    return StreamingResponse(
        _stream_with_dlp(stream),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
