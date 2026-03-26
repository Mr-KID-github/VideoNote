from sqlalchemy import select

from app.db import session_scope
from app.db_models import UserPreferenceDB
from app.models.preferences import LanguageCode, PreferenceResponse


class PreferenceRepository:
    def get_preferences(self, user_id: str) -> PreferenceResponse:
        with session_scope() as db:
            record = db.get(UserPreferenceDB, user_id)
            return PreferenceResponse(language=record.language if record else None)

    def set_language(self, user_id: str, language: LanguageCode) -> PreferenceResponse:
        with session_scope() as db:
            record = db.get(UserPreferenceDB, user_id)
            if not record:
                record = UserPreferenceDB(user_id=user_id, language=language)
                db.add(record)
            else:
                record.language = language
            db.flush()
            return PreferenceResponse(language=record.language)
