"""
FastAPI application factory.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


def create_app() -> FastAPI:
    from app.routers import model_profiles, note

    app = FastAPI(
        title="VINote",
        description="Video-to-markdown note generation API.",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz", tags=["health"])
    def healthz():
        return {"status": "ok"}

    app.include_router(note.router, prefix="/api")
    app.include_router(model_profiles.router, prefix="/api")
    return app
