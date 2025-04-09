import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Drop all tables
session.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
session.commit()
session.close()
print("Database schema reset successfully")
