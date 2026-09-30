from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine
)
from sqlalchemy.orm import DeclarativeBase
from .config import settings

class Base(DeclarativeBase):
    pass

engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def init_db() -> None:
    """Initialize database tables and set SQLite WAL mode for high concurrency."""
    async with engine.begin() as conn:
        # Enable Write-Ahead Logging to prevent database write locks
        await conn.execute(text("PRAGMA journal_mode=WAL;"))
        await conn.execute(text("PRAGMA busy_timeout=5000;"))
        
        # Create all tables declared in models
        from . import models  # Ensure all models are imported before create_all
        await conn.run_sync(Base.metadata.create_all)

        # Migrate existing meetings table if needed (safely add missing columns)
        try:
            col_info = await conn.execute(text("PRAGMA table_info(meetings);"))
            existing_cols = {row[1] for row in col_info.fetchall()}
            if "meeting_code" not in existing_cols and "meeting_id" in existing_cols:
                await conn.execute(text("ALTER TABLE meetings ADD COLUMN meeting_code VARCHAR(32);"))
                await conn.execute(text("UPDATE meetings SET meeting_code = meeting_id WHERE meeting_code IS NULL;"))
            if "host_id" not in existing_cols:
                await conn.execute(text("ALTER TABLE meetings ADD COLUMN host_id INTEGER;"))
            if "meeting_type" not in existing_cols:
                await conn.execute(text("ALTER TABLE meetings ADD COLUMN meeting_type VARCHAR(20) DEFAULT 'instant';"))
                if "is_instant" in existing_cols:
                    await conn.execute(text("UPDATE meetings SET meeting_type = CASE WHEN is_instant = 1 THEN 'instant' ELSE 'scheduled' END WHERE meeting_type IS NULL;"))
            if "started_at" not in existing_cols:
                await conn.execute(text("ALTER TABLE meetings ADD COLUMN started_at DATETIME;"))
            if "ended_at" not in existing_cols:
                await conn.execute(text("ALTER TABLE meetings ADD COLUMN ended_at DATETIME;"))
        except Exception:
            pass

        # Migrate existing meeting_participants table if needed
        try:
            p_info = await conn.execute(text("PRAGMA table_info(meeting_participants);"))
            p_cols = {row[1] for row in p_info.fetchall()}
            if "meeting_code" not in p_cols:
                await conn.execute(text("ALTER TABLE meeting_participants ADD COLUMN meeting_code VARCHAR(32);"))
            if "user_id" not in p_cols:
                await conn.execute(text("ALTER TABLE meeting_participants ADD COLUMN user_id INTEGER;"))
            if "role" not in p_cols:
                await conn.execute(text("ALTER TABLE meeting_participants ADD COLUMN role VARCHAR(20) DEFAULT 'attendee';"))
                if "is_host" in p_cols:
                    await conn.execute(text("UPDATE meeting_participants SET role = CASE WHEN is_host = 1 THEN 'host' ELSE 'attendee' END WHERE role IS NULL;"))
            if "is_muted" not in p_cols:
                await conn.execute(text("ALTER TABLE meeting_participants ADD COLUMN is_muted BOOLEAN DEFAULT 0;"))
            
            # Create participants view matching Section 6.2 table name requirement
            await conn.execute(text("CREATE VIEW IF NOT EXISTS participants AS SELECT * FROM meeting_participants;"))
        except Exception:
            pass

        # Ensure default user (Alex Rivera) exists in users table
        try:
            user_check = await conn.execute(text("SELECT id FROM users WHERE id = 1;"))
            if not user_check.fetchone():
                await conn.execute(text(
                    "INSERT INTO users (id, name, email, avatar_url, created_at) "
                    "VALUES (1, 'Alex Rivera', 'alex.rivera@zoomclone.local', "
                    "'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80', "
                    "datetime('now'));"
                ))
        except Exception:
            pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
