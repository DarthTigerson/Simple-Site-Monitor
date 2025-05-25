from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routes import home
from database import engine
import models.models as models

app = FastAPI(
    title="Simple Site Monitor",
    description="A simple site monitor for monitoring website availability and performance",
    version="0.1.6"
)

models.Base.metadata.create_all(bind=engine)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(home.router)