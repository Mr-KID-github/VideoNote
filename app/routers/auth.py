from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.models.auth import AuthCredentials, UserResponse
from app.services.auth_service import (
    authenticate_user,
    clear_auth_cookie,
    create_access_token,
    create_user,
    get_current_user,
    get_user_by_id,
    set_auth_cookie,
)

router = APIRouter(tags=["auth"])


@router.post("/auth/sign-up", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def sign_up(payload: AuthCredentials, response: Response):
    user = create_user(payload)
    set_auth_cookie(response, create_access_token(user))
    return user


@router.post("/auth/sign-in", response_model=UserResponse)
def sign_in(payload: AuthCredentials, response: Response):
    user = authenticate_user(payload)
    set_auth_cookie(response, create_access_token(user))
    return user


@router.post("/auth/sign-out", status_code=status.HTTP_204_NO_CONTENT)
def sign_out(response: Response):
    clear_auth_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT


@router.get("/auth/me", response_model=UserResponse)
def me(user=Depends(get_current_user)):
    current = get_user_by_id(user.user_id)
    if not current:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return current
