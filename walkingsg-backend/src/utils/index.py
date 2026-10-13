import secrets
from datetime import UTC, datetime

import bcrypt
from starlette.concurrency import run_in_threadpool


def utc_now() -> datetime:
    return datetime.now(UTC)


async def hash_password(password: str) -> str:
    salt = await run_in_threadpool(bcrypt.gensalt)
    hashed = await run_in_threadpool(bcrypt.hashpw, password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


async def verify_password(password: str, hashed_password: str) -> bool:
    return await run_in_threadpool(
        bcrypt.checkpw,
        password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def generate_numeric_otp(digits: int = 6) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(digits))
