import uuid
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

if TYPE_CHECKING:
    from app.domain.models.sensor_data import SensorData
    from app.domain.models.alert import Alert
    from app.domain.models.recommendation import Recommendation
    from app.domain.models.overload_event import OverloadEvent
    from app.domain.models.user_preference import UserPreference
    from app.domain.models.wellness_checkin import WellnessCheckin
    from app.domain.models.strategy import Strategy
    from app.domain.models.accommodation import Accommodation
    from app.domain.models.speech_diary import SpeechDiaryEntry
    from app.domain.models.routine import Routine

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    preferences: Mapped[Optional["UserPreference"]] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)
    sensor_data: Mapped[List["SensorData"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    recommendations: Mapped[List["Recommendation"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    overload_events: Mapped[List["OverloadEvent"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    wellness_checkins: Mapped[List["WellnessCheckin"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    strategies: Mapped[List["Strategy"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    accommodations: Mapped[List["Accommodation"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    speech_diary_entries: Mapped[List["SpeechDiaryEntry"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    routines: Mapped[List["Routine"]] = relationship(back_populates="user", cascade="all, delete-orphan")
