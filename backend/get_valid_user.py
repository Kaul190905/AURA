import asyncio
import sys
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.domain.models.user import User

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).limit(1))
        user = result.scalars().first()
        if user:
            print(f"FOUND_VALID_USER_ID={user.id}")
        else:
            print("NO_USERS_FOUND_IN_DATABASE")

if __name__ == "__main__":
    asyncio.run(main())
