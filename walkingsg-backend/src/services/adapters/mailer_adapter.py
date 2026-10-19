from email.message import EmailMessage
import logging

import aiosmtplib

from src.configs.config import Settings

logger = logging.getLogger(__name__)


class MailerAdapter:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings
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

        if (
            self._settings
            and self._settings.smtp_user
            and self._settings.smtp_pass
            and self._settings.smtp_pass.get_secret_value()
        ):
            try:
                message = EmailMessage()
                sender = self._settings.smtp_from or self._settings.smtp_user
                message["From"] = sender
                message["To"] = email
                message["Subject"] = f"WalkingSG - Your Verification Code: {code}"

                plain_body = (
                    f"Hello,\n\n"
                    f"Your WalkingSG verification code is: {code}\n\n"
                    f"This code will expire in 10 minutes.\n"
                    f"If you did not request this, please ignore this email.\n\n"
                    f"Best regards,\n"
                    f"WalkingSG Team"
                )

                html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f8f6; padding: 30px; margin: 0;">
    <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; padding: 32px; border: 1px solid #dde4df; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1f6f43; margin: 0; font-size: 26px;">🌿 WalkingSG</h1>
            <p style="color: #6b6451; font-size: 14px; margin-top: 6px;">Walks that stay in the shade</p>
        </div>
        <div style="text-align: center; padding: 24px 0; border-top: 1px solid #edf2ee; border-bottom: 1px solid #edf2ee;">
            <p style="color: #131b15; font-size: 15px; margin-bottom: 14px;">Here is your single-use verification code:</p>
            <div style="display: inline-block; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1f6f43; background-color: #eaf4ee; border-radius: 10px; border: 1.5px solid #c8dece;">
                {code}
            </div>
            <p style="color: #8c826c; font-size: 13px; margin-top: 14px;">Valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <p style="color: #a8a08d; font-size: 12px; text-align: center; margin-top: 24px; line-height: 18px;">
            If you did not make this request, you can safely ignore this email.
        </p>
    </div>
</body>
</html>"""

                message.set_content(plain_body)
                message.add_alternative(html_body, subtype="html")

                await aiosmtplib.send(
                    message,
                    hostname=self._settings.smtp_host,
                    port=self._settings.smtp_port,
                    start_tls=True,
                    username=self._settings.smtp_user,
                    password=self._settings.smtp_pass.get_secret_value(),
                )
                logger.info("Successfully dispatched OTP email to %s via SMTP", email)
            except Exception as err:
                logger.error("Failed to dispatch email via SMTP to %s: %s", email, err)

        return True
