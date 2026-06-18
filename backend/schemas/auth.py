"""
SmallBiz Advisor — Auth Pydantic Schemas
Request and response models for authentication endpoints.
"""
import re
from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    business_name: str = Field(min_length=1, max_length=120)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit.")
        return v

    @field_validator("business_name")
    @classmethod
    def strip_business_name(cls, v: str) -> str:
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)


class SignupResponse(BaseModel):
    user_id: str
    email: str
    message: str


class LoginUser(BaseModel):
    id: str
    email: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: LoginUser


class MeResponse(BaseModel):
    id: str
    email: str
    created_at: str


class MessageResponse(BaseModel):
    message: str
