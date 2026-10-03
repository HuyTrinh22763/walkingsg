from http import HTTPStatus


class ErrorResponse(Exception):
    status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR.value

    def __init__(
        self,
        message: str = HTTPStatus.INTERNAL_SERVER_ERROR.phrase,
        status_code: int | None = None,
    ) -> None:
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.message)


class BadRequestError(ErrorResponse):
    status_code: int = HTTPStatus.BAD_REQUEST.value

    def __init__(self, message: str = HTTPStatus.BAD_REQUEST.phrase) -> None:
        super().__init__(message=message, status_code=self.status_code)


class AuthFailureError(ErrorResponse):
    status_code: int = HTTPStatus.UNAUTHORIZED.value

    def __init__(self, message: str = HTTPStatus.UNAUTHORIZED.phrase) -> None:
        super().__init__(message=message, status_code=self.status_code)


class ForbiddenError(ErrorResponse):
    status_code: int = HTTPStatus.FORBIDDEN.value

    def __init__(self, message: str = HTTPStatus.FORBIDDEN.phrase) -> None:
        super().__init__(message=message, status_code=self.status_code)


class NotFoundError(ErrorResponse):
    status_code: int = HTTPStatus.NOT_FOUND.value

    def __init__(self, message: str = HTTPStatus.NOT_FOUND.phrase) -> None:
        super().__init__(message=message, status_code=self.status_code)


class ConflictRequestError(ErrorResponse):
    status_code: int = HTTPStatus.CONFLICT.value

    def __init__(self, message: str = HTTPStatus.CONFLICT.phrase) -> None:
        super().__init__(message=message, status_code=self.status_code)
