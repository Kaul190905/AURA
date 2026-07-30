import uuid
from datetime import datetime, timezone
from typing import Optional, Any, Dict, List, TYPE_CHECKING
from sqlalchemy import ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

if TYPE_CHECKING:
    from app.domain.models.user import User

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Numeric scalar values
    preferred_noise: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    preferred_temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # JSONB for flexible collections and future AI context
    preferred_places: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True)
    trigger_foods: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True)
    notification_settings: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    ai_settings: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # 1-to-1 Relationship
    user: Mapped["User"] = relationship(back_populates="preferences")
