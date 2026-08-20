import asyncio
from app.db.database import AsyncSessionLocal
from app.domain.models.user import User
from sqlalchemy import select

async def test_db_connection():
    print("Testing Database Connection...")
    try:
        async with AsyncSessionLocal() as session:
            # Try to fetch some users
            result = await session.execute(select(User).limit(5))
            users = result.scalars().all()
            print(f"Connection Successful! Found {len(users)} users.")
            for user in users:
                print(f"- User: ID={user.id}, Username={getattr(user, 'username', 'N/A')}, Email={getattr(user, 'email', 'N/A')}")
            
            # If no users, we at least know the connection works and table exists
            if len(users) == 0:
                print("The 'users' table exists but is currently empty.")
    except Exception as e:
        print(f"Database connection or query failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_db_connection())
