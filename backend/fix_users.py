import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Creating sync trigger...")
        await conn.execute(text("""
        CREATE OR REPLACE FUNCTION public.handle_new_user() 
        RETURNS trigger AS $$
        BEGIN
            INSERT INTO public.users (id, email, is_active, created_at, updated_at)
            VALUES (new.id, new.email, true, now(), now())
            ON CONFLICT (id) DO NOTHING;
            RETURN new;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """))
        
        await conn.execute(text("""
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        """))

        await conn.execute(text("""
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        """))
        
        print("Inserting missing users manually to fix existing broken accounts...")
        # Insert the users we know about
        await conn.execute(text("""
        INSERT INTO public.users (id, email, is_active, created_at, updated_at)
        SELECT id, email, true, now(), now() FROM auth.users 
        ON CONFLICT (id) DO NOTHING;
        """))
        
        print("Success! All users synced and trigger created.")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
