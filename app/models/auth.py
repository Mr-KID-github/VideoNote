from dataclasses import dataclass


@dataclass
class AuthenticatedUser:
    user_id: str
    email: str | None = None
