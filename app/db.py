from contextlib import contextmanager

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def _create_engine():
    connect_args: dict[str, object] = {}
    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    return create_engine(
        settings.database_url,
        future=True,
        pool_pre_ping=True,
        connect_args=connect_args,
    )


engine = _create_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)


def init_db():
    from app import db_models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_note_share_columns()


def _ensure_note_share_columns():
    inspector = inspect(engine)
    if "notes" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("notes")}
    statements: list[str] = []

    if "share_token" not in columns:
        statements.append("ALTER TABLE notes ADD COLUMN share_token VARCHAR(64)")
    if "share_enabled" not in columns:
        statements.append("ALTER TABLE notes ADD COLUMN share_enabled BOOLEAN NOT NULL DEFAULT 0")
    if "share_created_at" not in columns:
        statements.append("ALTER TABLE notes ADD COLUMN share_created_at TIMESTAMP")

    with engine.begin() as connection:
        for statement in statements:
            connection.exec_driver_sql(statement)
        connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_notes_share_token ON notes (share_token)"
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
