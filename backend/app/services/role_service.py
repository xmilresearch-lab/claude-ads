import uuid

from app.models.role import DEFAULT_ROLE_PERMISSIONS, Role


def build_default_roles(workspace_id: uuid.UUID) -> list[Role]:
    """Build the 4 default roles (admin, staff, caregiver, patient) for a new workspace."""
    return [
        Role(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            name=name,
            permissions=list(permissions),
        )
        for name, permissions in DEFAULT_ROLE_PERMISSIONS.items()
    ]
