import logging

logger = logging.getLogger(__name__)


class MailerAdapter:
    def __init__(self) -> None:
        self.sent_emails: list[dict[str, str]] = []

    async def send_otp(self, *, email: str, code: str) -> bool:
        print(f"\n[MailerAdapter] OTP for {email}: {code}\n", flush=True)
        logger.info("Sending OTP verification email to %s", email)
        self.sent_emails.append(
            {
                "type": "otp",
                "email": email,
                "code": code,
            }
        )
        return True

    async def send_reset_link(self, *, email: str, token: str) -> bool:
        print(f"\n[MailerAdapter] Reset JWT for {email}: {token}\n", flush=True)
        logger.info("Sending password reset email to %s", email)
        self.sent_emails.append(
            {
                "type": "reset_link",
                "email": email,
                "token": token,
            }
        )
        return True
