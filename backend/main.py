from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
db = []


class Item(BaseModel):
    id: int
    name: str
    description: str


@app.get("/")
async def root():
    return {"message": "Hello World!"}


@app.post("/items/")
def create_item(item: Item):
    db.append(item)
    return item


@app.get("/items/")
async def read_item(item: Item):
    return db
