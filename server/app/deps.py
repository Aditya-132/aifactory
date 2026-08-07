from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .config import Settings
from .database import get_db
from .orm import UserRecord
from .security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


async def _resolve_user(
    credentials: HTTPAuthorizationCredentials | None,
    settings: Settings,
    db: AsyncSession,
) -> UserRecord | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    user_id = decode_access_token(credentials.credentials, settings.jwt_secret, settings.jwt_algorithm)
    if user_id is None:
        return None
    return await db.get(UserRecord, user_id)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> UserRecord:
    user = await _resolve_user(credentials, settings, db)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> UserRecord | None:
    return await _resolve_user(credentials, settings, db)
