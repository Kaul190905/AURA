from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.settings import settings

# Create async engine for high-performance PostgreSQL queries
engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=False,
    pool_pre_ping=True,  # Automatically verify connections
    pool_size=10,
    max_overflow=20
)

# Create an async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Declarative base for ORM models
Base = declarative_base()

async def get_db():
    """Dependency for injecting database sessions into routes."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
