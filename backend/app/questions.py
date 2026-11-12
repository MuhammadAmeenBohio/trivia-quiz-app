"""Question selection: over-fetch, discard anything this user has already seen, top up if short.

Pure business logic (no FastAPI, no direct network): the fetcher, sleeper and history store are
injected so it can be unit-tested without OpenTDB.
"""
import math
import time
from typing import Callable, Optional

from app.seen import SeenQuestions, question_key, seen_questions
from app.trivia_client import (
    COOLDOWN_SECONDS,
    MAX_PER_REQUEST,
    NoResults,
    TriviaError,
    fetch_batch,
)

FETCH_MULTIPLIER = 1.5  # first ask: 15 when we need 10, so discarded repeats don't force a refetch
MAX_ATTEMPTS = 3
RETRY_PADDING = 1.2     # on retries, size the request from the observed fraction of new questions
MIN_NEW_RATE = 0.1      # never assume fewer than 10% of a batch is new


def collect_unseen(
    user_id: str,
    amount: int,
    category: Optional[int] = None,
    difficulty: Optional[str] = None,
    *,
    fetch: Callable = fetch_batch,
    sleep: Callable[[float], None] = time.sleep,
    seen: SeenQuestions = seen_questions,
) -> tuple[list[dict], int]:
    """Return (`amount` questions, number of them that are repeats).

    Normally repeats is 0. Repeats only appear when the user's remembered history covers so
    much of the available pool that fewer than `amount` new questions could be found.
    """
    fresh: dict[str, dict] = {}    # hash -> question, new to this user (keeps arrival order)
    repeats: dict[str, dict] = {}  # hash -> question, already served earlier

    def fetch_some(ask: int, need: int) -> list[dict]:
        try:
            return fetch(ask, category, difficulty)
        except NoResults:
            # the pool is smaller than our over-fetch; retry asking for exactly what we need
            if ask <= need:
                raise
            sleep(COOLDOWN_SECONDS)
            return fetch(need, category, difficulty)

    new_rate = None  # fraction of the previous batch that was new to this user
    for attempt in range(MAX_ATTEMPTS):
        need = amount - len(fresh)
        if new_rate is None:
            ask = math.ceil(need * FETCH_MULTIPLIER)
        else:
            ask = math.ceil(need / max(new_rate, MIN_NEW_RATE) * RETRY_PADDING)
        ask = max(need, min(MAX_PER_REQUEST, ask))
        if attempt:
            sleep(COOLDOWN_SECONDS)  # respect OpenTDB's 1 request / 5 s limit
        try:
            batch = fetch_some(ask, need)
        except TriviaError:
            if fresh or repeats:
                break  # use what we have rather than failing the whole request
            raise

        new_in_batch = 0
        for q in batch:
            key = question_key(q["question"])
            if key in fresh:
                continue  # duplicate inside the same batch
            if seen.has(user_id, q["question"]):
                repeats[key] = q  # discard: user has already played this one
            else:
                fresh[key] = q
                new_in_batch += 1
        new_rate = new_in_batch / len(batch) if batch else 0
        if len(fresh) >= amount:
            break

    chosen = list(fresh.values())[:amount]
    repeated = 0

    if len(chosen) < amount and repeats:
        # Remembered history covers most of the available pool. Top up with repeats rather than
        # hand back a short quiz. The oldest-remembered ones are fine to repeat; marking them
        # below refreshes them, and the 50-slot table keeps rolling.
        extra = list(repeats.values())[: amount - len(chosen)]
        repeated = len(extra)
        chosen += extra

    if not chosen:
        raise TriviaError(502, "Open Trivia DB returned no results for these parameters")

    seen.mark(user_id, (q["question"] for q in chosen))
    return chosen, repeated
