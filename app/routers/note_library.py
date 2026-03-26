from fastapi import APIRouter, Depends, HTTPException, status

from app.models.auth import AuthenticatedUser
from app.models.note_library import NoteCreateRequest, NoteRecordResponse, NoteUpdateRequest
from app.services.auth_service import get_current_user
from app.services.note_repository import NoteRepository

router = APIRouter(tags=["notes-library"])
_repository = NoteRepository()


@router.get("/notes", response_model=list[NoteRecordResponse])
def list_notes(user: AuthenticatedUser = Depends(get_current_user)):
    return _repository.list_notes(user.user_id)


@router.get("/notes/{note_id}", response_model=NoteRecordResponse)
def get_note(note_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    note = _repository.get_note(user.user_id, note_id)
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.post("/notes", response_model=NoteRecordResponse, status_code=status.HTTP_201_CREATED)
def create_note(payload: NoteCreateRequest, user: AuthenticatedUser = Depends(get_current_user)):
    return _repository.create_note(user.user_id, payload)


@router.patch("/notes/{note_id}", response_model=NoteRecordResponse)
def update_note(note_id: str, payload: NoteUpdateRequest, user: AuthenticatedUser = Depends(get_current_user)):
    note = _repository.update_note(user.user_id, note_id, payload)
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    deleted = _repository.delete_note(user.user_id, note_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
