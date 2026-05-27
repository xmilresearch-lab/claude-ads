from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.automations import router as automations_router
from app.api.content_queue import router as content_queue_router
from app.api.webhooks import router as webhooks_router

app = FastAPI(
    title="AI Automation Platform",
    description="Multi-tenant AI automation backend powered by Claude",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(automations_router)
app.include_router(content_queue_router)
app.include_router(webhooks_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
