import base64
import hashlib
import logging
from typing import Any, Optional

import httpx
from cryptography.fernet import Fernet
from fastapi import HTTPException

from app.config import settings
from app.models.model_profile import (
    ModelProfileCreateRequest,
    ModelProfileRecord,
    ModelProfileResponse,
    ModelProfileUpdateRequest,
)

logger = logging.getLogger(__name__)


class ModelProfileRepository:
    def __init__(self):
        self._base_url = settings.supabase_url.rstrip("/")
        self._service_key = settings.supabase_service_role_key
        self._fernet: Optional[Fernet] = None
        if settings.model_profile_encryption_key:
            digest = hashlib.sha256(settings.model_profile_encryption_key.encode("utf-8")).digest()
            self._fernet = Fernet(base64.urlsafe_b64encode(digest))

    def _require_supabase(self):
        if not self._base_url or not self._service_key:
            raise HTTPException(status_code=500, detail="Supabase backend integration is not configured")

    def _require_encryption(self):
        if not self._fernet:
            raise HTTPException(status_code=500, detail="MODEL_PROFILE_ENCRYPTION_KEY is not configured")

    def _headers(self, *, prefer_representation: bool = False) -> dict[str, str]:
        headers = {
            "apikey": self._service_key,
            "Authorization": f"Bearer {self._service_key}",
            "Content-Type": "application/json",
        }
        if prefer_representation:
            headers["Prefer"] = "return=representation"
        return headers

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict[str, str]] = None,
        json_data: Any = None,
        prefer_representation: bool = False,
    ) -> Any:
        self._require_supabase()
        url = f"{self._base_url}{path}"

        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.request(
                    method,
                    url,
                    params=params,
                    json=json_data,
                    headers=self._headers(prefer_representation=prefer_representation),
                )
            if response.status_code >= 400:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            return response.json() if response.text else None
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Supabase request failed: %s %s", method, path, exc_info=True)
            raise HTTPException(status_code=502, detail="Failed to communicate with Supabase") from exc

    def _encrypt(self, value: str) -> str:
        self._require_encryption()
        return self._fernet.encrypt(value.encode("utf-8")).decode("utf-8")

    def decrypt_api_key(self, value: str) -> str:
        self._require_encryption()
        return self._fernet.decrypt(value.encode("utf-8")).decode("utf-8")

    @staticmethod
    def mask_api_key(api_key: str) -> str:
        if len(api_key) <= 8:
            return "*" * len(api_key)
        return f"{api_key[:4]}****{api_key[-4:]}"

    @staticmethod
    def to_response(record: ModelProfileRecord, api_key_hint: str) -> ModelProfileResponse:
        return ModelProfileResponse(
            id=record.id,
            name=record.name,
            provider=record.provider,
            base_url=record.base_url,
            model_name=record.model_name,
            api_key_hint=api_key_hint,
            is_default=record.is_default,
            is_active=record.is_active,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    def list_profiles(self, user_id: str) -> list[ModelProfileResponse]:
        rows = self._request(
            "GET",
            "/rest/v1/model_profiles",
            params={"select": "*", "user_id": f"eq.{user_id}", "order": "updated_at.desc"},
        ) or []
        return [
            self.to_response(record, self.mask_api_key(self.decrypt_api_key(record.api_key_encrypted)))
            for record in (ModelProfileRecord(**row) for row in rows)
        ]

    def clear_default(self, user_id: str):
        self._request(
            "PATCH",
            "/rest/v1/model_profiles",
            params={"user_id": f"eq.{user_id}", "is_default": "eq.true"},
            json_data={"is_default": False},
        )

    def create_profile(self, user_id: str, payload: ModelProfileCreateRequest) -> ModelProfileResponse:
        if payload.is_default:
            self.clear_default(user_id)

        rows = self._request(
            "POST",
            "/rest/v1/model_profiles",
            json_data={
                "user_id": user_id,
                "name": payload.name.strip(),
                "provider": payload.provider,
                "base_url": payload.base_url.strip(),
                "model_name": payload.model_name.strip(),
                "api_key_encrypted": self._encrypt(payload.api_key.strip()),
                "is_default": payload.is_default,
                "is_active": payload.is_active,
            },
            prefer_representation=True,
        ) or []
        record = ModelProfileRecord(**rows[0])
        return self.to_response(record, self.mask_api_key(payload.api_key.strip()))

    def get_profile_record(self, user_id: str, profile_id: str) -> ModelProfileRecord:
        rows = self._request(
            "GET",
            "/rest/v1/model_profiles",
            params={
                "select": "*",
                "id": f"eq.{profile_id}",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
        ) or []
        if not rows:
            raise HTTPException(status_code=404, detail="Model profile not found")
        return ModelProfileRecord(**rows[0])

    def update_profile(
        self,
        user_id: str,
        profile_id: str,
        payload: ModelProfileUpdateRequest,
    ) -> ModelProfileResponse:
        current = self.get_profile_record(user_id, profile_id)
        update_data: dict[str, Any] = {}
        if payload.name is not None:
            update_data["name"] = payload.name.strip()
        if payload.provider is not None:
            update_data["provider"] = payload.provider
        if payload.base_url is not None:
            update_data["base_url"] = payload.base_url.strip()
        if payload.model_name is not None:
            update_data["model_name"] = payload.model_name.strip()
        if payload.api_key is not None:
            update_data["api_key_encrypted"] = self._encrypt(payload.api_key.strip())
        if payload.is_default is not None:
            if payload.is_default:
                self.clear_default(user_id)
            update_data["is_default"] = payload.is_default
        if payload.is_active is not None:
            update_data["is_active"] = payload.is_active

        rows = self._request(
            "PATCH",
            "/rest/v1/model_profiles",
            params={"id": f"eq.{profile_id}", "user_id": f"eq.{user_id}"},
            json_data=update_data,
            prefer_representation=True,
        ) or []
        record = ModelProfileRecord(**rows[0]) if rows else current
        api_key = payload.api_key.strip() if payload.api_key else self.decrypt_api_key(record.api_key_encrypted)
        return self.to_response(record, self.mask_api_key(api_key))

    def delete_profile(self, user_id: str, profile_id: str) -> ModelProfileRecord:
        current = self.get_profile_record(user_id, profile_id)
        self._request(
            "DELETE",
            "/rest/v1/model_profiles",
            params={"id": f"eq.{profile_id}", "user_id": f"eq.{user_id}"},
        )
        return current

    def set_default_profile(self, user_id: str, profile_id: str) -> ModelProfileResponse:
        self.get_profile_record(user_id, profile_id)
        self.clear_default(user_id)
        rows = self._request(
            "PATCH",
            "/rest/v1/model_profiles",
            params={"id": f"eq.{profile_id}", "user_id": f"eq.{user_id}"},
            json_data={"is_default": True},
            prefer_representation=True,
        ) or []
        record = ModelProfileRecord(**rows[0])
        return self.to_response(record, self.mask_api_key(self.decrypt_api_key(record.api_key_encrypted)))

    def get_default_profile(self, user_id: str) -> Optional[ModelProfileRecord]:
        rows = self._request(
            "GET",
            "/rest/v1/model_profiles",
            params={
                "select": "*",
                "user_id": f"eq.{user_id}",
                "is_default": "eq.true",
                "is_active": "eq.true",
                "limit": "1",
            },
        ) or []
        if not rows:
            return None
        return ModelProfileRecord(**rows[0])

    def get_latest_active_profile(self, user_id: str) -> Optional[ModelProfileRecord]:
        rows = self._request(
            "GET",
            "/rest/v1/model_profiles",
            params={
                "select": "*",
                "user_id": f"eq.{user_id}",
                "is_active": "eq.true",
                "order": "updated_at.desc",
                "limit": "1",
            },
        ) or []
        if not rows:
            return None
        return ModelProfileRecord(**rows[0])
