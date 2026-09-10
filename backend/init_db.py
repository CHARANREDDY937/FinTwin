import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db
from config import settings

async def main():
    print(f"Initializing database with connection: {settings.db_connection_string}")
    try:
        await init_db()
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error initializing database: {e}")
        print("\nMake sure PostgreSQL is running and the database 'fintwin' exists.")
        print("You can create it with:")
        print("  createdb -U postgres fintwin")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())