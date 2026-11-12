from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user_id
from app.questions import collect_unseen
from app.trivia_client import TriviaError

router = APIRouter()


@router.get("/questions")
def get_questions(
    amount: int = Query(10, ge=1, le=50),
    category: Optional[int] = None,
    difficulty: Optional[str] = Query(None, pattern="^(easy|medium|hard)$"),
    user_id: str = Depends(get_current_user_id),
):
    try:
        questions, repeats = collect_unseen(user_id, amount, category, difficulty)
    except TriviaError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    return {"questions": questions, "repeats": repeats}
