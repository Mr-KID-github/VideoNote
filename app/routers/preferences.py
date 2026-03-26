from fastapi import APIRouter, Depends

from app.models.auth import AuthenticatedUser
from app.models.preferences import PreferenceResponse, PreferenceUpdateRequest
from app.services.auth_service import get_current_user
from app.services.preferences_repository import PreferenceRepository

router = APIRouter(tags=["preferences"])
_repository = PreferenceRepository()


@router.get("/preferences", response_model=PreferenceResponse)
def get_preferences(user: AuthenticatedUser = Depends(get_current_user)):
    return _repository.get_preferences(user.user_id)


@router.patch("/preferences", response_model=PreferenceResponse)
def update_preferences(payload: PreferenceUpdateRequest, user: AuthenticatedUser = Depends(get_current_user)):
    return _repository.set_language(user.user_id, payload.language)
