import logging
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.core.error_response import ErrorResponse

logger = logging.getLogger(__name__)


def _error_body(
    code: int,
    message: str,
    errors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "status": "error",
        "code": code,
        "message": message,
    }
    if errors:
        body["errors"] = errors
    return body


async def handle_error_response(request: Request, exc: ErrorResponse) -> JSONResponse:
    if exc.status_code >= HTTPStatus.INTERNAL_SERVER_ERROR.value:
        logger.error("%s %s failed: %s", request.method, request.url.path, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.status_code, exc.message),
    )


async def handle_http_exception(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.status_code, str(exc.detail)),
        headers=exc.headers,
    )


async def handle_validation_error(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    errors = [
        {"loc": e["loc"], "msg": e["msg"], "type": e["type"]}
        for e in exc.errors()
    ]
    code = HTTPStatus.UNPROCESSABLE_ENTITY.value
    return JSONResponse(
        status_code=code,
        content=_error_body(code, "Validation failed", errors),
    )


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    code = HTTPStatus.INTERNAL_SERVER_ERROR.value
    return JSONResponse(
        status_code=code,
        content=_error_body(code, HTTPStatus.INTERNAL_SERVER_ERROR.phrase),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ErrorResponse, handle_error_response)
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
