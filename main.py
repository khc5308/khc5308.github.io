from workers import WorkerEntrypoint
from fastapi import FastAPI, Request
from pydantic import BaseModel
import asgi

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        return await asgi.fetch(app, request, self.env)

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello, World!"}
