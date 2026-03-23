import unittest
from datetime import datetime, timezone

from app.models.model_profile import ModelProfileRecord, ModelProfileTestRequest, ModelProfileTestResponse
from app.services.model_profile_service import ModelProfileService


def make_record(
    *,
    profile_id: str = "profile-1",
    is_default: bool = True,
    is_active: bool = True,
) -> ModelProfileRecord:
    return ModelProfileRecord(
        id=profile_id,
        user_id="user-1",
        name="Primary",
        provider="openai-compatible",
        base_url="https://api.openai.com/v1",
        model_name="gpt-4o-mini",
        api_key_encrypted="encrypted-key",
        is_default=is_default,
        is_active=is_active,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


class FakeRepository:
    def __init__(self):
        self.deleted_profile = make_record()
        self.latest_active_profile = make_record(profile_id="profile-2", is_default=False)
        self.default_profile = make_record()
        self.profile_record = make_record()
        self.default_set_calls: list[tuple[str, str]] = []

    def list_profiles(self, user_id: str):
        return []

    def create_profile(self, user_id: str, payload):
        raise NotImplementedError

    def update_profile(self, user_id: str, profile_id: str, payload):
        raise NotImplementedError

    def delete_profile(self, user_id: str, profile_id: str):
        return self.deleted_profile

    def get_latest_active_profile(self, user_id: str):
        return self.latest_active_profile

    def set_default_profile(self, user_id: str, profile_id: str):
        self.default_set_calls.append((user_id, profile_id))
        return self.latest_active_profile

    def get_profile_record(self, user_id: str, profile_id: str):
        return self.profile_record

    def get_default_profile(self, user_id: str):
        return self.default_profile

    def decrypt_api_key(self, value: str):
        return "plain-secret"


class FakeConnectionService:
    def __init__(self):
        self.requests: list[ModelProfileTestRequest] = []

    def test_connection(self, payload: ModelProfileTestRequest):
        self.requests.append(payload)
        return ModelProfileTestResponse(
            ok=True,
            provider=payload.provider,
            model=payload.model_name,
            latency_ms=1,
            error_message="",
        )


class ModelProfileServiceTest(unittest.TestCase):
    def test_delete_profile_promotes_latest_active_profile(self):
        repository = FakeRepository()
        service = ModelProfileService(repository=repository, connection_service=FakeConnectionService())

        service.delete_profile("user-1", "profile-1")

        self.assertEqual(repository.default_set_calls, [("user-1", "profile-2")])

    def test_resolve_llm_config_prefers_selected_profile(self):
        repository = FakeRepository()
        service = ModelProfileService(repository=repository, connection_service=FakeConnectionService())

        resolved = service.resolve_llm_config(
            user_id="user-1",
            model_profile_id="profile-1",
            model_name=None,
            api_key=None,
            base_url=None,
        )

        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.model_name, "gpt-4o-mini")
        self.assertEqual(resolved.api_key, "plain-secret")

    def test_test_saved_profile_uses_decrypted_key(self):
        repository = FakeRepository()
        connection_service = FakeConnectionService()
        service = ModelProfileService(repository=repository, connection_service=connection_service)

        service.test_saved_profile("user-1", "profile-1")

        self.assertEqual(len(connection_service.requests), 1)
        self.assertEqual(connection_service.requests[0].api_key, "plain-secret")


if __name__ == "__main__":
    unittest.main()
