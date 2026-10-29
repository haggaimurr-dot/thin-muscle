import unittest
from fastapi import HTTPException
from app.api.sync import validate
from test_accounts import payload


class NutritionGoalTests(unittest.TestCase):
    def test_dates_and_values(self):
        goal = {"kcal": 1800, "protein": 120, "carb": 200, "fat": 60}
        validate({**payload(), "nutritionGoals": {"2024-02-29": goal}})
        for date, value in [
            ("2026-02-29", goal),
            ("2026-01-01", {**goal, "fat": -1}),
            ("2026-01-01", {**goal, "protein": True}),
            ("2026-01-01", {**goal, "kcal": 0}),
        ]:
            with self.assertRaises(HTTPException):
                validate({**payload(), "nutritionGoals": {date: value}})
