from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# SQLite works locally, swap to postgresql:// for production
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Lightweight migrations for existing SQLite DBs (create_all does not alter tables).
_COLUMN_PATCHES = [
    ("resource_alerts", "forwarded_to_reb", "BOOLEAN DEFAULT 0"),
    ("resource_alerts", "forwarded_at", "DATETIME"),
    ("feedback", "forwarded_to_reb", "BOOLEAN DEFAULT 0"),
    ("feedback", "forwarded_at", "DATETIME"),
    ("chat_messages", "reply_to_id", "INTEGER"),
]


def ensure_schema():
    Base.metadata.create_all(bind=engine)
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    with engine.begin() as conn:
        for table, column, col_type in _COLUMN_PATCHES:
            if table not in tables:
                continue
            cols = {c["name"] for c in insp.get_columns(table)}
            if column not in cols:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
