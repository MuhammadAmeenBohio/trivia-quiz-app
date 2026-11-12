from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.trivia import router as trivia_router
from app.scores import router as scores_router

app = FastAPI(title="Trivia Quiz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trivia_router)
app.include_router(scores_router)

@app.get("/")
def root():
    return {"status": "ok"}