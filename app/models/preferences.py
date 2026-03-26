from typing import Literal

from pydantic import BaseModel


LanguageCode = Literal["en", "zh-CN"]


class PreferenceResponse(BaseModel):
    language: LanguageCode | None = None


class PreferenceUpdateRequest(BaseModel):
    language: LanguageCode
