from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from beanie import PydanticObjectId
from pydantic import SecretStr

from src.auth.auth_utils import AuthContext, TokenPayload
from src.configs.config import Settings
from src.core.error_response import (
    AuthFailureError,
    BadRequestError,
    ConflictRequestError,
    ForbiddenError,
    NotFoundError,
)
from src.model.key_token_model import KeyTokenModel
from src.schemas.access_schema import (
    ForgotPasswordRequest,
    LoginRequest,
    OtpVerifyRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    SignUpRequest,
)
from src.services.access_service import AccessService
from src.services.adapters.mailer_adapter import MailerAdapter
from src.utils.index import hash_password, utc_now


@pytest.fixture
def mock_dependencies():
    user_repo = AsyncMock()
    creds_repo = AsyncMock()
    otp_repo = AsyncMock()
    key_service = AsyncMock()
    mailer = MailerAdapter()
    settings = Settings(
        db_uri=SecretStr("mongodb://localhost:27017"),
        jwt_secret=SecretStr(
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        ),
        api_key=SecretStr("test-api-key"),
    )
    service = AccessService(
        user_repo=user_repo,
        credentials_repo=creds_repo,
        otp_repo=otp_repo,
        key_token_service=key_service,
        mailer_adapter=mailer,
        settings=settings,
    )
    return {
        "service": service,
        "user_repo": user_repo,
        "creds_repo": creds_repo,
        "otp_repo": otp_repo,
        "key_service": key_service,
        "mailer": mailer,
        "settings": settings,
    }


@pytest.mark.asyncio
async def test_signup_success(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]
    mailer = mock_dependencies["mailer"]

    user_repo.find_by_email.return_value = None
    mock_user = MagicMock()
    mock_user.id = PydanticObjectId()
    mock_user.user_email = "test@example.com"
    user_repo.create.return_value = mock_user

    res = await service.sign_up(
        SignUpRequest(user_email="test@example.com", password="Password@123")
    )

    assert res.user_email == "test@example.com"
    assert len(mailer.sent_emails) == 1
    assert mailer.sent_emails[0]["type"] == "otp"


@pytest.mark.asyncio
async def test_signup_duplicate_email(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]

    mock_user = MagicMock()
    user_repo.find_by_email.return_value = mock_user

    with pytest.raises(ConflictRequestError):
        await service.sign_up(
            SignUpRequest(user_email="test@example.com", password="Password@123")
        )


@pytest.mark.asyncio
async def test_verify_otp_success(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]
    otp_repo = mock_dependencies["otp_repo"]

    mock_user = MagicMock()
    mock_user.id = PydanticObjectId()
    user_repo.find_by_email.return_value = mock_user

    mock_otp = MagicMock(id=PydanticObjectId())
    otp_repo.find_active_otp.return_value = mock_otp

    res = await service.verify_otp(
        OtpVerifyRequest(user_email="test@example.com", otp_code="123456")
    )
    assert res.is_verified is True
    assert otp_repo.mark_used.called


@pytest.mark.asyncio
async def test_verify_otp_invalid(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]
    otp_repo = mock_dependencies["otp_repo"]

    mock_user = MagicMock()
    user_repo.find_by_email.return_value = mock_user
    otp_repo.find_active_otp.return_value = None

    with pytest.raises(BadRequestError):
        await service.verify_otp(
            OtpVerifyRequest(user_email="test@example.com", otp_code="123456")
        )


@pytest.mark.asyncio
async def test_resend_otp_success(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]
    otp_repo = mock_dependencies["otp_repo"]
    mailer = mock_dependencies["mailer"]

    mock_user = MagicMock(id=PydanticObjectId(), is_verified=False)
    user_repo.find_by_email.return_value = mock_user

    res = await service.resend_otp(ResendOtpRequest(user_email="test@example.com"))
    assert res is True
    assert otp_repo.delete_by_user_id.called
    assert len(mailer.sent_emails) == 1


@pytest.mark.asyncio
async def test_resend_otp_already_verified(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]

    mock_user = MagicMock(id=PydanticObjectId(), is_verified=True)
    user_repo.find_by_email.return_value = mock_user

    with pytest.raises(BadRequestError) as exc_info:
        await service.resend_otp(ResendOtpRequest(user_email="test@example.com"))
    assert "already verified" in str(exc_info.value)


@pytest.mark.asyncio
async def test_login_unverified_account(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]

    mock_user = MagicMock(
        id=PydanticObjectId(), user_email="test@example.com", is_verified=False
    )
    user_repo.find_by_email.return_value = mock_user

    with pytest.raises(ForbiddenError) as exc_info:
        await service.login(
            LoginRequest(user_email="test@example.com", password="Password@123")
        )
    assert "not verified" in str(exc_info.value)


@pytest.mark.asyncio
async def test_login_success(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]
    creds_repo = mock_dependencies["creds_repo"]
    key_service = mock_dependencies["key_service"]

    pw_hash = await hash_password("Password@123")
    user_id = PydanticObjectId()
    mock_user = MagicMock(
        id=user_id, user_email="test@example.com", is_verified=True, is_locked=False
    )
    mock_creds = MagicMock(id=PydanticObjectId(), password_hash=pw_hash)

    user_repo.find_by_email.return_value = mock_user
    creds_repo.find_by_user_id.return_value = mock_creds
    key_service.create_token_pair.return_value = ("access_123", "refresh_456")

    res = await service.login(
        LoginRequest(user_email="test@example.com", password="Password@123")
    )
    assert res.access_token == "access_123"
    assert res.refresh_token == "refresh_456"
    assert creds_repo.reset_failed_attempts.called


@pytest.mark.asyncio
async def test_login_invalid_password_lockout_rule(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]
    creds_repo = mock_dependencies["creds_repo"]

    pw_hash = await hash_password("CorrectPassword@123")
    mock_user = MagicMock(
        id=PydanticObjectId(),
        is_verified=True,
        is_locked=False,
        lock_expires_at=None,
    )
    mock_creds = MagicMock(id=PydanticObjectId(), password_hash=pw_hash)

    user_repo.find_by_email.return_value = mock_user
    creds_repo.find_by_user_id.return_value = mock_creds

    # 1 to 4 failed attempts raise AuthFailureError
    for i in range(1, 5):
        creds_repo.increment_failed_attempts.return_value = MagicMock(
            failed_login_attempts=i
        )
        with pytest.raises(AuthFailureError):
            await service.login(
                LoginRequest(user_email="test@example.com", password="WrongPassword@123")
            )

    # 5th failed attempt triggers 15-minute account lockout
    creds_repo.increment_failed_attempts.return_value = MagicMock(
        failed_login_attempts=5
    )
    with pytest.raises(ForbiddenError) as exc_info:
        await service.login(
            LoginRequest(user_email="test@example.com", password="WrongPassword@123")
        )
    assert "Account locked for 15 minutes" in str(exc_info.value)
    assert user_repo.set_lockout.called


@pytest.mark.asyncio
async def test_login_locked_account(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]

    active_lock = utc_now() + timedelta(minutes=10)
    mock_user = MagicMock(
        is_verified=True, is_locked=True, lock_expires_at=active_lock
    )
    user_repo.find_by_email.return_value = mock_user

    with pytest.raises(ForbiddenError):
        await service.login(
            LoginRequest(user_email="test@example.com", password="AnyPassword@123")
        )


@pytest.mark.asyncio
async def test_forgot_and_reset_password_cycle(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]
    creds_repo = mock_dependencies["creds_repo"]
    mailer = mock_dependencies["mailer"]

    user_id = PydanticObjectId()
    mock_user = MagicMock(id=user_id, user_email="test@example.com")
    user_repo.find_by_email.return_value = mock_user

    # Request reset OTP
    await service.forgot_password(
        ForgotPasswordRequest(user_email="test@example.com")
    )
    assert len(mailer.sent_emails) == 1
    assert mailer.sent_emails[0]["type"] == "otp"
    otp_code = mailer.sent_emails[0]["code"]

    # Verify OTP at the authentication gate
    otp_repo = mock_dependencies["otp_repo"]
    mock_otp = MagicMock(id=PydanticObjectId())
    otp_repo.find_active_otp.return_value = mock_otp
    verify_res = await service.verify_otp(
        OtpVerifyRequest(user_email="test@example.com", otp_code=otp_code)
    )
    assert verify_res.is_verified is True

    # Reset password with valid OTP
    otp_repo.find_valid_otp_for_reset.return_value = mock_otp
    creds_repo.update_password.return_value = MagicMock()
    reset_res = await service.reset_password(
        ResetPasswordRequest(
            user_email="test@example.com",
            otp_code=otp_code,
            new_password="NewSecurePassword@123",
        )
    )
    assert reset_res is True
    assert creds_repo.update_password.called
    assert otp_repo.delete_by_user_id.called


@pytest.mark.asyncio
async def test_reset_password_invalid_otp(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]
    otp_repo = mock_dependencies["otp_repo"]

    mock_user = MagicMock(id=PydanticObjectId(), user_email="test@example.com")
    user_repo.find_by_email.return_value = mock_user
    otp_repo.find_valid_otp_for_reset.return_value = None

    with pytest.raises(BadRequestError):
        await service.reset_password(
            ResetPasswordRequest(
                user_email="test@example.com",
                otp_code="999999",
                new_password="NewSecurePassword@123",
            )
        )


@pytest.mark.asyncio
async def test_logout_success(mock_dependencies):
    service = mock_dependencies["service"]
    key_service = mock_dependencies["key_service"]

    key_store = MagicMock(token_id="session_token_123")
    auth_context = AuthContext(
        user=TokenPayload(user_id=PydanticObjectId(), email="test@example.com"),
        key_store=key_store,
    )

    res = await service.logout(auth_context)
    assert res is True
    assert key_service.revoke_token.called
