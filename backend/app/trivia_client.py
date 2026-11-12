"""Thin client for the Open Trivia DB API. Knows OpenTDB's format; knows nothing about users or HTTP routes."""
import html
import random
from typing import Optional

import requests

OPENTDB_URL = "https://opentdb.com/api.php"
MAX_PER_REQUEST = 50  # OpenTDB's hard limit
COOLDOWN_SECONDS = 5.5  # OpenTDB allows 1 request per 5 seconds per IP


class TriviaError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class NoResults(TriviaError):
    """OpenTDB can't supply that many questions for these filters."""

    def __init__(self):
        super().__init__(502, "Open Trivia DB returned no results for these parameters")


def fetch_batch(amount: int, category: Optional[int] = None, difficulty: Optional[str] = None) -> list[dict]:
    """Fetch `amount` multiple-choice questions, decoded and with shuffled options."""
    params: dict = {"amount": amount, "type": "multiple"}
    if category is not None:
        params["category"] = category
    if difficulty is not None:
        params["difficulty"] = difficulty

    try:
        response = requests.get(OPENTDB_URL, params=params, timeout=10)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        raise TriviaError(504, "Open Trivia DB took too long to respond")
    except requests.exceptions.HTTPError:
        if response.status_code == 429:
            raise TriviaError(429, "Rate limited by Open Trivia DB, please wait a few seconds and try again")
        raise TriviaError(502, "Open Trivia DB returned an error")
    except requests.exceptions.RequestException:
        raise TriviaError(502, "Could not reach Open Trivia DB")

    data = response.json()
    code = data["response_code"]
    if code == 5:
        raise TriviaError(429, "Rate limited by Open Trivia DB, please wait a few seconds and try again")
    if code != 0:
        raise NoResults()

    questions = []
    for item in data["results"]:
        correct = html.unescape(item["correct_answer"])
        options = [html.unescape(a) for a in item["incorrect_answers"]] + [correct]
        random.shuffle(options)
        questions.append({
            "type": item["type"],
            "category": html.unescape(item["category"]),
            "difficulty": item["difficulty"],
            "question": html.unescape(item["question"]),
            "options": options,
            "correct_answer": correct,
        })
    return questions
