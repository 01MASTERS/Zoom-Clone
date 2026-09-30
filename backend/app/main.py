from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from .config import settings
from .database import init_db, get_db
from .routes.meetings import router as meetings_router
from .websocket.endpoint import router as websocket_router
from .services.meeting_service import get_default_user
from .schemas import UserResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager initializing database schema."""
    # Initialize SQLite schema in WAL mode and run migrations
    await init_db()
    yield

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Full-stack Zoom Clone REST API & WebSockets Signaling Hub",
    lifespan=lifespan
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API & WebSocket routers
app.include_router(meetings_router)
app.include_router(websocket_router)

@app.get("/api/me", response_model=UserResponse, tags=["Users"])
async def get_current_user(db: AsyncSession = Depends(get_db)):
    """Return the default logged-in user profile as specified in Section 7."""
    return await get_default_user(db)

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "app": settings.app_name,
        "version": settings.app_version,
        "docs_url": "/docs"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
