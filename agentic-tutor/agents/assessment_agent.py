"""AssessmentAgent — Grades quiz answers and identifies weak topics."""

from crewai import Agent
from utils.llm_fallback import assessment_llm


def create_assessment_agent() -> Agent:
    return Agent(
        role="Assessment & Grading Specialist",
        goal=(
            "Grade the student's submitted quiz answers against the correct answers. "
            "Calculate the score, identify which topics the student is weak in, "
            "and return a structured scorecard in JSON format."
        ),
        backstory=(
            "You are a meticulous academic evaluator who has graded thousands of "
            "assessments. You provide fair, accurate scoring and can pinpoint exactly "
            "which conceptual areas need reinforcement based on incorrect answers."
        ),
        llm=assessment_llm(),
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=10,
        respect_context_window=True,
    )
