import uvicorn

from src.configs.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "src.app:app",
        host="0.0.0.0",
        port=settings.app_port,
        reload=(settings.app_env == "dev"),
    )


if __name__ == "__main__":
    main()
