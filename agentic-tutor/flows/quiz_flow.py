"""
QuizFlow — Grades quizzes and conditionally injects revision lectures.

Trigger: POST /submit-quiz
Steps:
  1. @start() grade_quiz → AssessmentAgent grades answers
  2. @router() check_revision_needed → routes based on score
  3. @listen("revision_needed") inject_revision → RoadmapAdjusterAgent injects extra lectures
  4. @listen("passed") finalize_pass → returns scorecard without adjustment
"""

import json
import logging
import uuid

from crewai import Crew, Task
from crewai.flow.flow import Flow, listen, router, start

from state.tutor_state import TutorState, QuizScore, PerformanceEntry
from agents.assessment_agent import create_assessment_agent
from agents.roadmap_adjuster_agent import create_roadmap_adjuster_agent

logger = logging.getLogger("agentic_tutor.flows.quiz")


class QuizFlow(Flow[TutorState]):
    """Orchestrates quiz grading and conditional roadmap adjustment."""

    quiz_id: str = ""
    answers_payload: list = []
    _grade_result: dict = {}

    @start()
    def grade_quiz(self):
        """Step 1: Use AssessmentAgent to grade submitted answers."""
        logger.info(f"[QuizFlow] START — grading quiz_id='{self.quiz_id}'")

        quiz_state = self.state.quiz_state
        questions_text = ""
        for q in quiz_state.questions:
            questions_text += (
                f"\nQ ({q.question_id}): {q.question}\n"
                f"  Options: {', '.join(q.options)}\n"
                f"  Correct Answer: {q.correct_answer}\n"
            )

        answers_text = ""
        for ans in self.answers_payload:
            answers_text += f"\n  {ans.get('question_id', '?')}: {ans.get('selected_option', '?')}"

        agent = create_assessment_agent()
        task = Task(
            description=(
                f"Grade the following quiz submission:\n\n"
                f"**Quiz Questions and Correct Answers**:{questions_text}\n\n"
                f"**Student's Submitted Answers**:{answers_text}\n\n"
                f"Return a JSON object with:\n"
                f'- "score": number of correct answers\n'
                f'- "total": total questions\n'
                f'- "percentage": score/total * 100\n'
                f'- "weak_topics": list of topic names the student got wrong\n'
                f'- "details": list of {{question_id, correct, student_answer, correct_answer}}'
            ),
            expected_output="A JSON object with score, total, percentage, weak_topics, and details.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=True)
        result = crew.kickoff()

        raw = str(result)
        try:
            import re
            json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
            if json_match:
                raw = json_match.group(1).strip()
            brace_start = raw.index("{")
            brace_end = raw.rindex("}") + 1
            self._grade_result = json.loads(raw[brace_start:brace_end])
        except Exception:
            self._grade_result = {
                "score": 0, "total": len(quiz_state.questions),
                "percentage": 0.0, "weak_topics": [],
            }

        quiz_score = QuizScore(
            quiz_id=self.quiz_id,
            score=self._grade_result.get("score", 0),
            total=self._grade_result.get("total", 0),
            percentage=self._grade_result.get("percentage", 0.0),
            weak_topics=self._grade_result.get("weak_topics", []),
        )
        self.state.quiz_scores.append(quiz_score)

        perf = PerformanceEntry(
            quiz_id=self.quiz_id,
            score=quiz_score.percentage,
            weak_topics=quiz_score.weak_topics,
            notes=f"Quiz {self.quiz_id}: {quiz_score.score}/{quiz_score.total}",
        )
        self.state.performance_log.append(perf)

        logger.info(f"[QuizFlow] Graded: {quiz_score.score}/{quiz_score.total} = {quiz_score.percentage}%")
        return self._grade_result

    @router(grade_quiz)
    def check_revision_needed(self):
        """Route based on score: < 60% → revision_needed, else → passed."""
        percentage = self._grade_result.get("percentage", 0)
        if percentage < 60:
            logger.info(f"[QuizFlow] Score {percentage}% < 60% — routing to revision")
            return "revision_needed"
        else:
            logger.info(f"[QuizFlow] Score {percentage}% >= 60% — passed")
            return "passed"

    @listen("revision_needed")
    def inject_revision(self):
        """Use RoadmapAdjusterAgent to inject revision lectures for weak topics."""
        logger.info("[QuizFlow] Injecting revision lectures...")

        weak_topics = self._grade_result.get("weak_topics", [])
        current_roadmap = self.state.course_roadmap.model_dump_json()

        agent = create_roadmap_adjuster_agent()
        task = Task(
            description=(
                f"The student scored below 60% on their latest quiz. "
                f"Weak topics identified: {', '.join(weak_topics)}\n\n"
                f"Current roadmap:\n{current_roadmap}\n\n"
                f"Insert 1-2 revision lectures for the weak topics into the roadmap "
                f"after the current position (lecture index {self.state.current_lecture_index}). "
                f"Shift subsequent lectures forward. Update calendar events as needed.\n\n"
                f"Return the description of what was changed."
            ),
            expected_output="A description of the revision lectures injected and schedule changes made.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=True)
        result = crew.kickoff()

        logger.info(f"[QuizFlow] SUCCESS — Revision injected: {str(result)[:200]}")

        return {
            "score": self._grade_result.get("score", 0),
            "total": self._grade_result.get("total", 0),
            "percentage": self._grade_result.get("percentage", 0.0),
            "weak_topics": self._grade_result.get("weak_topics", []),
            "scorecard": self._grade_result,
            "revision_lecture_injected": True,
        }

    @listen("passed")
    def finalize_pass(self):
        """Student passed — return scorecard without adjustment."""
        logger.info("[QuizFlow] Quiz passed — no revision needed")
        return {
            "score": self._grade_result.get("score", 0),
            "total": self._grade_result.get("total", 0),
            "percentage": self._grade_result.get("percentage", 0.0),
            "weak_topics": self._grade_result.get("weak_topics", []),
            "scorecard": self._grade_result,
            "revision_lecture_injected": False,
        }
