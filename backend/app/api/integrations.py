import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_workspace
from app.core.database import get_db
from app.core.security import decrypt_credential, encrypt_credential
from app.models.integration import Integration, IntegrationStatus, IntegrationType
from app.models.workspace import Workspace
from app.schemas.integration import ConnectIntegrationRequest, IntegrationResponse

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("", response_model=list[IntegrationResponse])
async def list_integrations(
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Integration).where(Integration.workspace_id == workspace.id)
    )
    return result.scalars().all()


@router.post("/connect", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
async def connect_integration(
    workspace_id: str,
    body: ConnectIntegrationRequest,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        itype = IntegrationType(body.type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Unknown integration type: {body.type}")

    encrypted = encrypt_credential(json.dumps(body.credentials))
    integration = Integration(
        workspace_id=workspace.id,
        type=itype,
        provider=body.provider,
        credentials=encrypted,
    )
    db.add(integration)
    await db.flush()
    return integration


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_integration(
    integration_id: str,
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.workspace_id == workspace.id,
        )
    )
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    await db.delete(integration)


@router.get("/{integration_id}/status")
async def integration_status(
    integration_id: str,
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.workspace_id == workspace.id,
        )
    )
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {"id": integration.id, "provider": integration.provider, "status": integration.status.value}
