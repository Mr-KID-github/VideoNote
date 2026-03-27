from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse

from app.models.auth import AuthenticatedUser
from app.models.note_library import NoteShareResponse, PublicSharedNoteResponse
from app.services.auth_service import get_current_user
from app.services.note_repository import NoteRepository
from app.services.share_service import build_share_url, render_shared_note_html

private_router = APIRouter(tags=["note-share"])
public_router = APIRouter(tags=["public-share"])
_repository = NoteRepository()


def _build_share_response(request: Request, share_record) -> NoteShareResponse:
    share_url = None
    if share_record.share_enabled and share_record.share_token:
        share_url = build_share_url(request, share_record.share_token)

    return NoteShareResponse(
        note_id=share_record.note_id,
        title=share_record.title,
        share_enabled=share_record.share_enabled,
        share_token=share_record.share_token,
        share_created_at=share_record.share_created_at,
        share_url=share_url,
    )


@private_router.get("/notes/{note_id}/share", response_model=NoteShareResponse)
def get_note_share(note_id: str, request: Request, user: AuthenticatedUser = Depends(get_current_user)):
    share_record = _repository.get_share(user.user_id, note_id)
    if not share_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return _build_share_response(request, share_record)


@private_router.post("/notes/{note_id}/share", response_model=NoteShareResponse)
def enable_note_share(note_id: str, request: Request, user: AuthenticatedUser = Depends(get_current_user)):
    share_record = _repository.enable_share(user.user_id, note_id)
    if not share_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return _build_share_response(request, share_record)


@private_router.delete("/notes/{note_id}/share", response_model=NoteShareResponse)
def disable_note_share(note_id: str, request: Request, user: AuthenticatedUser = Depends(get_current_user)):
    share_record = _repository.disable_share(user.user_id, note_id)
    if not share_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return _build_share_response(request, share_record)


@public_router.get("/api/public/notes/{share_token}", response_model=PublicSharedNoteResponse)
def get_public_note(share_token: str):
    note = _repository.get_shared_note(share_token)
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared note not found")
    return note


@public_router.get("/share/{share_token}", response_class=HTMLResponse, include_in_schema=False)
def render_shared_note(share_token: str):
    note = _repository.get_shared_note(share_token)
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared note not found")
    return HTMLResponse(render_shared_note_html(note))
