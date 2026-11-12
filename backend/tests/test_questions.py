import random
import unittest

from app.questions import collect_unseen
from app.seen import SeenQuestions, question_key
from app.trivia_client import NoResults


def make_pool(n):
    return [
        {"type": "multiple", "category": "C", "difficulty": "easy",
         "question": f"Question number {i}?", "options": ["a", "b", "c", "d"], "correct_answer": "a"}
        for i in range(n)
    ]


def fake_fetch(pool, seed=1):
    """Behaves like OpenTDB: random sample, and NoResults if asked for more than exist."""
    rng = random.Random(seed)
    calls = []

    def fetch(amount, category=None, difficulty=None):
        calls.append(amount)
        if amount > len(pool):
            raise NoResults()
        return [dict(q) for q in rng.sample(pool, amount)]

    fetch.calls = calls
    return fetch


def keys(questions):
    return [question_key(q["question"]) for q in questions]


class SeenQuestionsTests(unittest.TestCase):
    def test_key_ignores_case_and_whitespace(self):
        self.assertEqual(question_key("What  is   2+2?"), question_key("  what is 2+2? "))

    def test_mark_and_has(self):
        s = SeenQuestions()
        s.mark("u1", ["Who?"])
        self.assertTrue(s.has("u1", "who?"))
        self.assertFalse(s.has("u1", "What?"))
        self.assertFalse(s.has("u2", "Who?"))  # users are isolated

    def test_history_expires_when_idle(self):
        now = [0.0]
        s = SeenQuestions(ttl_seconds=100, clock=lambda: now[0])
        s.mark("u1", ["Who?"])
        now[0] = 99
        self.assertTrue(s.has("u1", "Who?"))
        now[0] = 500
        self.assertFalse(s.has("u1", "Who?"))


class CapacityTests(unittest.TestCase):
    def test_holds_at_most_50_and_forgets_the_oldest(self):
        s = SeenQuestions()  # default capacity 50
        questions = [f"Question {i}?" for i in range(60)]
        s.mark("u1", questions)
        self.assertEqual(s.count("u1"), 50)
        self.assertFalse(s.has("u1", questions[0]))   # oldest 10 were evicted...
        self.assertFalse(s.has("u1", questions[9]))
        self.assertTrue(s.has("u1", questions[10]))   # ...the most recent 50 are kept
        self.assertTrue(s.has("u1", questions[59]))

    def test_replaying_a_question_refreshes_it(self):
        s = SeenQuestions(capacity=3)
        s.mark("u1", ["a", "b", "c"])
        s.mark("u1", ["a"])  # a is now the newest
        s.mark("u1", ["d"])  # evicts b, the oldest
        self.assertTrue(s.has("u1", "a"))
        self.assertFalse(s.has("u1", "b"))


class CollectUnseenTests(unittest.TestCase):
    def setUp(self):
        self.seen = SeenQuestions()
        self.sleeps = []

    def run_collect(self, fetch, user="u1", amount=10):
        return collect_unseen(user, amount, fetch=fetch, sleep=self.sleeps.append, seen=self.seen)

    def test_over_fetches_by_half(self):
        fetch = fake_fetch(make_pool(100))
        questions, repeats = self.run_collect(fetch)
        self.assertEqual(len(questions), 10)
        self.assertEqual(fetch.calls[0], 15)
        self.assertEqual(repeats, 0)

    def test_no_repeats_across_consecutive_quizzes(self):
        fetch = fake_fetch(make_pool(100))
        played = []
        for _ in range(5):
            questions, repeats = self.run_collect(fetch)
            self.assertEqual(repeats, 0)
            played += keys(questions)
        self.assertEqual(len(played), 50)
        self.assertEqual(len(set(played)), 50)  # 50 questions, all distinct

    def test_duplicates_within_one_batch_are_dropped(self):
        pool = make_pool(5)
        dupes = pool + pool  # OpenTDB occasionally repeats inside a batch

        def fetch(amount, category=None, difficulty=None):
            return [dict(q) for q in dupes[:amount]]

        questions, _ = self.run_collect(fetch, amount=5)
        self.assertEqual(len(set(keys(questions))), len(questions))

    def test_seen_questions_are_discarded_and_refetched(self):
        pool = make_pool(40)
        self.seen.mark("u1", [q["question"] for q in pool[:20]])  # half the pool already played
        fetch = fake_fetch(pool, seed=3)
        questions, repeats = self.run_collect(fetch)
        self.assertEqual(len(questions), 10)
        self.assertEqual(repeats, 0)
        for q in questions:
            self.assertGreaterEqual(int(q["question"].split()[2].rstrip("?")), 20)

    def test_no_repeat_within_any_window_of_50_questions(self):
        fetch = fake_fetch(make_pool(100), seed=7)
        served = []
        for _ in range(12):  # 120 questions served, well past the 50-slot table
            questions, repeats = self.run_collect(fetch)
            self.assertEqual(repeats, 0)  # plenty of unseen questions left, so no repeats
            self.assertEqual(len(questions), 10)
            served += keys(questions)
            self.assertLessEqual(self.seen.count("u1"), 50)
        # the guarantee: any 50 consecutive questions are all different
        for start in range(len(served) - 49):
            window = served[start:start + 50]
            self.assertEqual(len(set(window)), 50, f"repeat inside window starting at {start}")

    def test_users_have_independent_history(self):
        fetch = fake_fetch(make_pool(15), seed=2)
        a, _ = self.run_collect(fetch, user="alice")
        b, repeats = self.run_collect(fetch, user="bob")
        self.assertEqual(repeats, 0)  # bob has seen nothing, so alice's quiz doesn't affect him
        self.assertEqual(len(b), 10)

    def test_small_pool_falls_back_to_exact_amount(self):
        fetch = fake_fetch(make_pool(12))  # 15 > 12 -> NoResults, then retry with 10
        questions, _ = self.run_collect(fetch)
        self.assertEqual(len(questions), 10)
        self.assertEqual(fetch.calls[:2], [15, 10])

    def test_tiny_pool_tops_up_with_repeats_instead_of_a_short_quiz(self):
        fetch = fake_fetch(make_pool(12))
        self.run_collect(fetch)  # first quiz uses 10 of the 12 questions
        questions, repeats = self.run_collect(fetch)  # only 2 unseen left in the whole pool
        self.assertEqual(len(questions), 10)
        self.assertEqual(repeats, 8)
        self.assertEqual(len(set(keys(questions))), 10)  # still no duplicates within the quiz
        self.assertLessEqual(self.seen.count("u1"), 12)

    def test_waits_between_retries(self):
        pool = make_pool(40)
        self.seen.mark("u1", [q["question"] for q in pool[:35]])  # 5 unseen: needs several fetches
        self.run_collect(fake_fetch(pool, seed=5))
        self.assertTrue(all(s >= 5 for s in self.sleeps))


if __name__ == "__main__":
    unittest.main()
