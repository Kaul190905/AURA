import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import ForeignKey, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

if TYPE_CHECKING:
    from app.domain.models.user import User

class WellnessCheckin(Base):
    """
    A user's self-reported wellness at a point in time. This is the
    subjective ground truth the WellnessEngine's ML model is trained
    against — objective sensor/risk/pattern signals alone can't tell you
    how someone actually feels.
    """
    __tablename__ = "wellness_checkins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    mood_score: Mapped[float] = mapped_column(Float, nullable=False)  # self-reported, 0-100
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship
    user: Mapped["User"] = relationship(back_populates="wellness_checkins")
