from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.models.auth import AuthenticatedUser

_bearer = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _get_jwks_client() -> jwt.PyJWKClient:
    if not settings.supabase_url:
        raise HTTPException(status_code=500, detail="SUPABASE_URL is not configured")
    return jwt.PyJWKClient(f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json")


def _decode_hmac_token(token: str) -> dict:
    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET is not configured")

    return jwt.decode(
        token,
        settings.supabase_jwt_secret,
        algorithms=["HS256"],
        options={"verify_aud": False},
    )


def _decode_asymmetric_token(token: str) -> dict:
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256"],
        options={"verify_aud": False},
    )


def _decode_token(token: str) -> AuthenticatedUser:
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg", "")

        if algorithm == "HS256":
            payload = _decode_hmac_token(token)
        else:
            payload = _decode_asymmetric_token(token)
    except HTTPException:
        raise
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token payload")

    return AuthenticatedUser(user_id=user_id, email=payload.get("email"))


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> AuthenticatedUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return _decode_token(credentials.credentials)


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthenticatedUser | None:
    if not credentials:
        return None
    return _decode_token(credentials.credentials)
