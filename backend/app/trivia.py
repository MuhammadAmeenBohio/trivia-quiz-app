import html
import random
import requests
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter()

OPENTDB_URL = "https://opentdb.com/api.php"

@router.get("/questions")
def get_questions(
    amount: int = Query(10, ge=1, le=50),
    category: Optional[int] = None,
    difficulty: Optional[str] = Query(None, pattern="^(easy|medium|hard)$"),
):
    params = {"amount": amount, "type": "multiple"}
    if category is not None:
        params["category"] = category
    if difficulty is not None:
        params["difficulty"] = difficulty

    response = requests.get(OPENTDB_URL, params=params)
    response.raise_for_status()
    data = response.json()

    if data["response_code"] != 0:
        raise HTTPException(
            status_code=502,
            detail="Open Trivia DB returned no results for these parameters",
        )

    questions = []
    for item in data["results"]:
        correct = html.unescape(item["correct_answer"])
        incorrect = [html.unescape(a) for a in item["incorrect_answers"]]

        options = incorrect + [correct]
        random.shuffle(options)

        questions.append({
            "category": html.unescape(item["category"]),
            "difficulty": item["difficulty"],
            "question": html.unescape(item["question"]),
            "options": options,
            "correct_answer": correct,
        })

    return {"questions": questions}