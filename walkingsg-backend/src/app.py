from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.configs.config import get_settings
from src.core.exception_handlers import register_exception_handlers
from src.dbs.init_mongodb import Database
from src.routes.index import router


async def lifespan(app: FastAPI):
    await Database.connect(get_settings())
    yield
    await Database.close()


def create_app() -> FastAPI:
    app = FastAPI(title="WalkingSG API", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    register_exception_handlers(app)
    app.include_router(router)
    return app


app = create_app()
