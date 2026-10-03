from http import HTTPStatus
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    message: str = HTTPStatus.OK.phrase
    status: int = HTTPStatus.OK.value
    metadata: T


def ok(
    metadata: T,
    message: str = "Success",
) -> SuccessResponse[T]:
    return SuccessResponse[T](
        message=message,
        status=HTTPStatus.OK.value,
        metadata=metadata,
    )


def created(
    metadata: T,
    message: str = "Created!",
) -> SuccessResponse[T]:
    return SuccessResponse[T](
        message=message,
        status=HTTPStatus.CREATED.value,
        metadata=metadata,
    )
