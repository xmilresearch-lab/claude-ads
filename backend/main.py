from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, auth, automations, content, integrations
from app.core.database import Base, engine
from app.middleware.dlp import DLPMiddleware
from app.middleware.injection_guard import InjectionGuardMiddleware
from app.middleware.rate_limiter import setup_rate_limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="AI Automation Platform API",
    description="Automate Everything: Social Media · Email & Support · CRM",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(InjectionGuardMiddleware)
app.add_middleware(DLPMiddleware)
setup_rate_limiter(app)

app.include_router(auth.router, prefix="/api")
app.include_router(automations.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")
app.include_router(content.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/health", tags=["infra"])
async def health():
    return {"status": "ok"}
