from sqlalchemy import desc, select

from app.db import session_scope
from app.db_models import NoteDB
from app.models.note_library import NoteCreateRequest, NoteRecordResponse, NoteUpdateRequest


class NoteRepository:
    @staticmethod
    def _to_response(record: NoteDB) -> NoteRecordResponse:
        return NoteRecordResponse(
            id=record.id,
            title=record.title,
            content=record.content,
            video_url=record.video_url,
            source_type=record.source_type,
            task_id=record.task_id,
            status=record.status,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    def list_notes(self, user_id: str) -> list[NoteRecordResponse]:
        with session_scope() as db:
            rows = db.scalars(
                select(NoteDB).where(NoteDB.created_by == user_id).order_by(desc(NoteDB.created_at))
            ).all()
            return [self._to_response(row) for row in rows]

    def get_note(self, user_id: str, note_id: str) -> NoteRecordResponse | None:
        with session_scope() as db:
            row = db.scalar(select(NoteDB).where(NoteDB.id == note_id, NoteDB.created_by == user_id))
            return self._to_response(row) if row else None

    def create_note(self, user_id: str, payload: NoteCreateRequest) -> NoteRecordResponse:
        with session_scope() as db:
            record = NoteDB(
                title=payload.title.strip(),
                content=payload.content,
                video_url=payload.video_url,
                source_type=payload.source_type,
                task_id=payload.task_id,
                status=payload.status,
                created_by=user_id,
            )
            db.add(record)
            db.flush()
            return self._to_response(record)

    def update_note(self, user_id: str, note_id: str, payload: NoteUpdateRequest) -> NoteRecordResponse | None:
        with session_scope() as db:
            record = db.scalar(select(NoteDB).where(NoteDB.id == note_id, NoteDB.created_by == user_id))
            if not record:
                return None
            record.title = payload.title.strip()
            record.content = payload.content
            db.flush()
            return self._to_response(record)

    def delete_note(self, user_id: str, note_id: str) -> bool:
        with session_scope() as db:
            record = db.scalar(select(NoteDB).where(NoteDB.id == note_id, NoteDB.created_by == user_id))
            if not record:
                return False
            db.delete(record)
            return True
