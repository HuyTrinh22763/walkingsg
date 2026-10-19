from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class BaseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class BaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)


def _validate_password_complexity(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not any(not c.isalnum() and not c.isspace() for c in value):
        raise ValueError("Password must contain at least one special character")
    return value


def _convert_str_id(value: Any) -> str:
    return str(value)


class SignUpRequest(BaseRequest):
    user_email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_complexity(value)


class SignUpOut(BaseResponse):
    user_id: str
    user_email: str

    @field_validator("user_id", mode="before")
    @classmethod
    def convert_user_id(cls, value: Any) -> str:
        return _convert_str_id(value)


class OtpVerifyRequest(BaseRequest):
    user_email: EmailStr
    otp_code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class OtpVerifyOut(BaseResponse):
    is_verified: bool


class ResendOtpRequest(BaseRequest):
    user_email: EmailStr


class LoginRequest(BaseRequest):
    user_email: EmailStr
    password: str


class LoginOut(BaseResponse):
    user_id: str
    user_email: str
    access_token: str
    refresh_token: str

    @field_validator("user_id", mode="before")
    @classmethod
    def convert_user_id(cls, value: Any) -> str:
        return _convert_str_id(value)


class ForgotPasswordRequest(BaseRequest):
    user_email: EmailStr


class ResetPasswordRequest(BaseRequest):
    user_email: EmailStr
    otp_code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return _validate_password_complexity(value)
