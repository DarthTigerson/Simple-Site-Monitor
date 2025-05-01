from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base


SQLALCHEMY_DATA_URL = 'sqlite:///./data/simple_site_monitor.db'
engine = create_engine(SQLALCHEMY_DATA_URL, connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base = declarative_base()