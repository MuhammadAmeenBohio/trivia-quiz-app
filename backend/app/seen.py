import hashlib
import re
import threading
import time
from collections import OrderedDict
from typing import Callable, Iterable

DEFAULT_CAPACITY = 50


def question_key(text: str) -> str:
    """Stable 16-hex-char hash of a question's normalized text."""
    normalized = re.sub(r"\s+", " ", text).strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]


class SeenQuestions:
    def __init__(
        self,
        capacity: int = DEFAULT_CAPACITY,
        ttl_seconds: float = 2 * 60 * 60,
        clock: Callable[[], float] = time.monotonic,
    ):
        self._capacity = capacity
        self._ttl = ttl_seconds
        self._clock = clock
        self._seen: dict[str, OrderedDict[str, None]] = {}
        self._last_active: dict[str, float] = {}
        self._lock = threading.Lock()

    def _expire(self) -> None:
        cutoff = self._clock() - self._ttl
        for user_id in [u for u, t in self._last_active.items() if t < cutoff]:
            self._seen.pop(user_id, None)
            self._last_active.pop(user_id, None)

    def has(self, user_id: str, question: str) -> bool:
        with self._lock:
            self._expire()
            return question_key(question) in self._seen.get(user_id, ())

    def mark(self, user_id: str, questions: Iterable[str]) -> None:
        with self._lock:
            self._expire()
            table = self._seen.setdefault(user_id, OrderedDict())
            for q in questions:
                key = question_key(q)
                table[key] = None
                table.move_to_end(key)  # most recently served = last to be forgotten
            while len(table) > self._capacity:
                table.popitem(last=False)  # forget the oldest
            self._last_active[user_id] = self._clock()

    def count(self, user_id: str) -> int:
        with self._lock:
            self._expire()
            return len(self._seen.get(user_id, ()))


# shared instance used by the app
seen_questions = SeenQuestions()
