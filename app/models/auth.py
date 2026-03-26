from dataclasses import dataclass

from pydantic import BaseModel, Field


@dataclass
class AuthenticatedUser:
    user_id: str
    email: str | None = None


class AuthCredentials(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
