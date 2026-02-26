from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World!"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, item_name: str):
    return {"item_id": item_id, "item_name": item_name}
