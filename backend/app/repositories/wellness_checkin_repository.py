import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.wellness_checkin import WellnessCheckin
from app.schemas.wellness import WellnessCheckinCreate
from app.core.encryption import encrypt_field, decrypt_field

class WellnessCheckinRepository:
    """Repository for managing WellnessCheckin persistence operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: uuid.UUID, data_in: WellnessCheckinCreate) -> WellnessCheckin:
        """Record a new self-reported wellness check-in (notes encrypted at rest)."""
        data_dict = data_in.model_dump()
        # ── AES-256 encrypt sensitive PII before persistence ────────────────
        data_dict["notes"] = encrypt_field(data_dict.get("notes"))
        data_dict["user_id"] = user_id
        new_checkin = WellnessCheckin(**data_dict)
        self.db.add(new_checkin)
        await self.db.commit()
        await self.db.refresh(new_checkin)
        # Decrypt for the response so the caller sees plaintext
        new_checkin.notes = decrypt_field(new_checkin.notes)
        return new_checkin

    async def get_recent(
        self,
        user_id: uuid.UUID,
        start_date: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[WellnessCheckin]:
        """Fetch a user's recent check-ins (notes decrypted transparently)."""
        query = select(WellnessCheckin).where(WellnessCheckin.user_id == user_id)
        if start_date:
            query = query.where(WellnessCheckin.created_at >= start_date)
        query = query.order_by(desc(WellnessCheckin.created_at)).limit(limit)

        result = await self.db.execute(query)
        rows = list(result.scalars().all())
        # Decrypt notes for each row
        for row in rows:
            row.notes = decrypt_field(row.notes)
        return rows
