from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Literal

from app.auth import get_current_user_id
from app.db import get_service_client

router = APIRouter()

FAST_THRESHOLD_SECONDS = 10


def get_high_score(user_id: str) -> int:
    supabase = get_service_client()
    result = (
        supabase.table("user_scores")
        .select("highest_score")
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]["highest_score"] if result.data else 0


def upsert_high_score(user_id: str, new_score: int) -> dict:
    supabase = get_service_client()
    current = get_high_score(user_id)

    if new_score <= current:
        return {"updated": False, "highest_score": current}

    supabase.table("user_scores").upsert({
        "user_id": user_id,
        "highest_score": new_score,
    }).execute()

    return {"updated": True, "highest_score": new_score}


@router.get("/scores/me")
def read_my_score(user_id: str = Depends(get_current_user_id)):
    return {"highest_score": get_high_score(user_id)}


class QuestionResult(BaseModel):
    question_type: Literal["multiple", "boolean"]
    is_correct: bool
    time_taken_seconds: float


class SubmitScoreRequest(BaseModel):
    answers: List[QuestionResult]


def score_question(q: QuestionResult) -> int:
    if not q.is_correct:
        return 0
    if q.question_type == "boolean":
        return 10
    return 10 if q.time_taken_seconds <= FAST_THRESHOLD_SECONDS else 5


@router.post("/submit-score")
def submit_score(
    payload: SubmitScoreRequest,
    user_id: str = Depends(get_current_user_id),
):
    total_score = sum(score_question(q) for q in payload.answers)
    result = upsert_high_score(user_id, total_score)

    return {
        "score": total_score,
        "highest_score": result["highest_score"],
        "new_high_score": result["updated"],
    }