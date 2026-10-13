from datetime import timedelta

import jwt
from beanie import PydanticObjectId

from src.auth.auth_utils import JWT_ALGORITHM, AuthContext
from src.configs.config import Settings
from src.core.error_response import (
    AuthFailureError,
    BadRequestError,
    ConflictRequestError,
    ForbiddenError,
    NotFoundError,
)
from src.model.repository.credentials_repo import CredentialsRepository
from src.model.repository.otp_repo import OtpRepository
from src.model.repository.user_repo import UserRepository
from src.schemas.access_schema import (
    ForgotPasswordRequest,
    LoginOut,
    LoginRequest,
    OtpVerifyOut,
    OtpVerifyRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    SignUpOut,
    SignUpRequest,
)
from src.services.adapters.mailer_adapter import MailerAdapter
from src.services.key_token_service import KeyTokenService
from src.utils.index import generate_numeric_otp, hash_password, utc_now, verify_password


class AccessService:
    def __init__(
        self,
        user_repo: UserRepository,
        credentials_repo: CredentialsRepository,
        otp_repo: OtpRepository,
        key_token_service: KeyTokenService,
        mailer_adapter: MailerAdapter,
        settings: Settings,
    ) -> None:
        self._user_repo = user_repo
        self._credentials_repo = credentials_repo
        self._otp_repo = otp_repo
        self._key_token_service = key_token_service
        self._mailer_adapter = mailer_adapter
        self._settings = settings

    def _create_reset_token(self, *, user_id: PydanticObjectId, email: str) -> str:
        now = utc_now()
        exp = now + timedelta(minutes=15)
        payload = {
            "type": "reset_password",
            "user_id": str(user_id),
            "email": email,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
        }
        return jwt.encode(
            payload,
            self._settings.jwt_secret.get_secret_value(),
            algorithm=JWT_ALGORITHM,
        )

    def _verify_reset_token(self, token: str) -> PydanticObjectId:
        try:
            payload = jwt.decode(
                token,
                self._settings.jwt_secret.get_secret_value(),
                algorithms=[JWT_ALGORITHM],
            )
            if payload.get("type") != "reset_password":
                raise BadRequestError("Invalid password reset token")
            return PydanticObjectId(payload["user_id"])
        except jwt.ExpiredSignatureError as err:
            raise BadRequestError("Password reset token has expired") from err
        except (jwt.InvalidTokenError, Exception) as err:
            raise BadRequestError("Invalid password reset token") from err

    async def sign_up(self, payload: SignUpRequest) -> SignUpOut:
        existing_user = await self._user_repo.find_by_email(email=payload.user_email)
        if existing_user is not None:
            raise ConflictRequestError("Email already registered")

        hashed_pw = await hash_password(payload.password)
        user = await self._user_repo.create(user_email=payload.user_email)
        await self._credentials_repo.create(
            user_id=user.id,
            email_id=payload.user_email,
            password_hash=hashed_pw,
        )

        otp_code = generate_numeric_otp(6)
        expires_at = utc_now() + timedelta(minutes=10)
        await self._otp_repo.create(
            user_id=user.id,
            otp_code=otp_code,
            expires_at=expires_at,
        )
        await self._mailer_adapter.send_otp(email=payload.user_email, code=otp_code)

        return SignUpOut(user_id=str(user.id), user_email=user.user_email)

    async def verify_otp(self, payload: OtpVerifyRequest) -> OtpVerifyOut:
        user = await self._user_repo.find_by_email(email=payload.user_email)
        if user is None:
            raise BadRequestError("Invalid or expired code")

        otp = await self._otp_repo.find_active_otp(
            user_id=user.id, otp_code=payload.otp_code
        )
        if otp is None:
            raise BadRequestError("Invalid or expired code")

        await self._otp_repo.mark_used(otp_id=otp.id)
        return OtpVerifyOut(is_verified=True)

    async def resend_otp(self, payload: ResendOtpRequest) -> bool:
        user = await self._user_repo.find_by_email(email=payload.user_email)
        if user is None:
            raise NotFoundError("User not found")

        await self._otp_repo.delete_by_user_id(user_id=user.id)
        otp_code = generate_numeric_otp(6)
        expires_at = utc_now() + timedelta(minutes=10)
        await self._otp_repo.create(
            user_id=user.id,
            otp_code=otp_code,
            expires_at=expires_at,
        )
        await self._mailer_adapter.send_otp(email=payload.user_email, code=otp_code)
        return True

    async def login(self, payload: LoginRequest) -> LoginOut:
        user = await self._user_repo.find_by_email(email=payload.user_email)
        if user is None:
            raise AuthFailureError("Invalid email or password")

        now = utc_now()
        if user.is_locked:
            if user.lock_expires_at and user.lock_expires_at > now:
                raise ForbiddenError(
                    "Account locked for 15 minutes due to multiple failed attempts"
                )
            await self._user_repo.set_lockout(
                user_id=user.id, is_locked=False, lock_expires_at=None
            )

        creds = await self._credentials_repo.find_by_user_id(user_id=user.id)
        if creds is None:
            raise AuthFailureError("Invalid email or password")

        is_valid = await verify_password(payload.password, creds.password_hash)
        if not is_valid:
            updated_creds = await self._credentials_repo.increment_failed_attempts(
                credentials_id=creds.id
            )
            failed_count = (
                updated_creds.failed_login_attempts
                if updated_creds
                else creds.failed_login_attempts + 1
            )
            if failed_count >= 5:
                lock_exp = now + timedelta(minutes=15)
                await self._user_repo.set_lockout(
                    user_id=user.id, is_locked=True, lock_expires_at=lock_exp
                )
                raise ForbiddenError(
                    "Account locked for 15 minutes due to multiple failed attempts"
                )
            raise AuthFailureError("Invalid email or password")

        await self._credentials_repo.reset_failed_attempts(credentials_id=creds.id)
        access_token, refresh_token = (
            await self._key_token_service.create_token_pair(
                user_id=user.id, email=payload.user_email
            )
        )
        return LoginOut(
            user_id=str(user.id),
            user_email=user.user_email,
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def forgot_password(self, payload: ForgotPasswordRequest) -> bool:
        user = await self._user_repo.find_by_email(email=payload.user_email)
        if user is None:
            raise NotFoundError("User not found")

        reset_token = self._create_reset_token(
            user_id=user.id, email=payload.user_email
        )
        await self._mailer_adapter.send_reset_link(
            email=payload.user_email, token=reset_token
        )
        return True

    async def reset_password(self, payload: ResetPasswordRequest) -> bool:
        user_id = self._verify_reset_token(payload.token)
        new_hash = await hash_password(payload.new_password)
        creds = await self._credentials_repo.update_password(
            user_id=user_id, password_hash=new_hash
        )
        if creds is None:
            raise NotFoundError("Credentials not found")

        await self._user_repo.set_lockout(
            user_id=user_id, is_locked=False, lock_expires_at=None
        )
        await self._key_token_service.delete_by_user_id(user_id=user_id)
        return True

    async def logout(self, auth_context: AuthContext) -> bool:
        await self._key_token_service.revoke_token(
            token_id=auth_context.key_store.token_id
        )
        return True
