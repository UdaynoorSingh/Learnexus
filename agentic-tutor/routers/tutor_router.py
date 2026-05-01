"""
FastAPI Router — All Agentic AI Tutor endpoints.

Endpoints:
  POST /init-course           → CourseInitFlow
  POST /prep-next-lecture     → LecturePrepFlow
  POST /ask-doubt             → DoubtResolutionFlow
  POST /submit-quiz           → QuizFlow
  POST /report-absence        → AbsenceFlow
  GET  /performance-report    → PerformanceFlow
  GET  /health                → System health check
"""

import logging
import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from state.tutor_state import (
    TutorState, StudentProfile, QuizState, QuizQuestion, SubmittedAnswer,
)
from flows.course_init_flow import CourseInitFlow
from flows.lecture_prep_flow import LecturePrepFlow
from flows.doubt_resolution_flow import DoubtResolutionFlow
from flows.quiz_flow import QuizFlow
from flows.absence_flow import AbsenceFlow
from flows.performance_flow import PerformanceFlow

logger = logging.getLogger("agentic_tutor.router")

router = APIRouter(prefix="/tutor", tags=["Agentic AI Tutor"])


sessions: dict[str, TutorState] = {}
active_flow_count: int = 0


def _get_state(student_id: str) -> TutorState:
    if student_id not in sessions:
        raise HTTPException(status_code=404, detail=f"Student session '{student_id}' not found. Call /init-course first.")
    return sessions[student_id]



class InitCourseRequest(BaseModel):
    topic: str
    depth_level: str = "intermediate"
    duration_weeks: Optional[int] = None
    duration_input: str = "4 weeks"     
    pace_speed: str = "normal"
    preferred_language: str = "English"
    learning_style: str = "visual"
    constraints: Optional[str] = None


class StudentIdRequest(BaseModel):
    student_id: str


class AskDoubtRequest(BaseModel):
    student_id: str
    question: str
    lecture_index: int = 0


class QuizAnswer(BaseModel):
    question_id: str
    selected_option: str


class SubmitQuizRequest(BaseModel):
    student_id: str
    quiz_id: str
    answers: List[QuizAnswer]


class ReportAbsenceRequest(BaseModel):
    student_id: str
    missed_dates: List[str]    



@router.get("/health")
async def health_check():
    """System health and active flow count."""
    return {
        "status": "healthy",
        "active_sessions": len(sessions),
        "active_flow_count": active_flow_count,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/init-course")
async def init_course(req: InitCourseRequest):
    """
    Initialize a new course: generates roadmap + creates calendar events.
    Duration can be in weeks or months (e.g., "2 months", "8 weeks").
    """
    global active_flow_count
    logger.info(f"[API] /init-course — topic='{req.topic}'")

    duration_weeks = req.duration_weeks
    if duration_weeks is None:
        import re
        lower = req.duration_input.lower()
        match = re.search(r"(\d+)", lower)
        num = int(match.group(1)) if match else 4
        if "month" in lower:
            duration_weeks = num * 4
        else:
            duration_weeks = num

    profile = StudentProfile(
        topic=req.topic,
        depth_level=req.depth_level,
        duration_weeks=duration_weeks,
        duration_input=req.duration_input,
        pace_speed=req.pace_speed,
        preferred_language=req.preferred_language,
        learning_style=req.learning_style,
        constraints=req.constraints,
    )

    state = TutorState(student_profile=profile)

    active_flow_count += 1
    try:
        flow = CourseInitFlow()
        flow._state = state
        result = flow.kickoff()
    except Exception as e:
        logger.error(f"[API] /init-course FAILED: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        active_flow_count -= 1

    sessions[state.student_id] = flow.state

    return {
        "student_id": state.student_id,
        "roadmap": flow.state.course_roadmap.model_dump(),
        "calendar_events": [e.model_dump() for e in flow.state.calendar_events],
    }


@router.post("/prep-next-lecture")
async def prep_next_lecture(req: StudentIdRequest):
    """JIT-prepare the next lecture: fetch resources → write script → generate TTS audio."""
    global active_flow_count
    state = _get_state(req.student_id)
    logger.info(f"[API] /prep-next-lecture — student={req.student_id}, lecture_index={state.current_lecture_index}")

    active_flow_count += 1
    try:
        flow = LecturePrepFlow()
        flow._state = state
        result = flow.kickoff()
    except Exception as e:
        logger.error(f"[API] /prep-next-lecture FAILED: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        active_flow_count -= 1

    sessions[req.student_id] = flow.state

    return result


@router.post("/ask-doubt")
async def ask_doubt(req: AskDoubtRequest):
    """Resolve a student's doubt using ONLY current lecture context."""
    global active_flow_count
    state = _get_state(req.student_id)
    logger.info(f"[API] /ask-doubt — student={req.student_id}, question='{req.question[:80]}...'")

    active_flow_count += 1
    try:
        flow = DoubtResolutionFlow()
        flow._state = state
        flow.student_question = req.question
        flow.question_lecture_index = req.lecture_index
        result = flow.kickoff()
    except Exception as e:
        logger.error(f"[API] /ask-doubt FAILED: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        active_flow_count -= 1

    return result


@router.post("/submit-quiz")
async def submit_quiz(req: SubmitQuizRequest, background_tasks: BackgroundTasks):
    """Grade a quiz and conditionally inject revision lectures."""
    global active_flow_count
    state = _get_state(req.student_id)
    logger.info(f"[API] /submit-quiz — student={req.student_id}, quiz_id={req.quiz_id}")

    if not state.quiz_state.questions:
        state.quiz_state = QuizState(
            quiz_id=req.quiz_id,
            questions=[
                QuizQuestion(
                    question_id=f"q{i}",
                    question=f"Sample question {i}?",
                    options=["A", "B", "C", "D"],
                    correct_answer="A",
                ) for i in range(5)
            ],
        )

    state.quiz_state.submitted_answers = [
        SubmittedAnswer(question_id=a.question_id, selected_option=a.selected_option)
        for a in req.answers
    ]

    active_flow_count += 1
    try:
        flow = QuizFlow()
        flow._state = state
        flow.quiz_id = req.quiz_id
        flow.answers_payload = [a.model_dump() for a in req.answers]
        result = flow.kickoff()
    except Exception as e:
        logger.error(f"[API] /submit-quiz FAILED: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        active_flow_count -= 1

    sessions[req.student_id] = flow.state

    background_tasks.add_task(_run_performance_analysis, req.student_id)

    return result


async def _run_performance_analysis(student_id: str):
    """Background task: run PerformanceFlow after quiz grading."""
    global active_flow_count
    if student_id not in sessions:
        return
    state = sessions[student_id]
    logger.info(f"[BG] Running performance analysis for student={student_id}")

    active_flow_count += 1
    try:
        flow = PerformanceFlow()
        flow._state = state
        flow.kickoff()
        sessions[student_id] = flow.state
    except Exception as e:
        logger.error(f"[BG] Performance analysis failed: {e}")
    finally:
        active_flow_count -= 1


@router.post("/report-absence")
async def report_absence(req: ReportAbsenceRequest):
    """Report missed dates and reschedule the roadmap."""
    global active_flow_count
    state = _get_state(req.student_id)
    logger.info(f"[API] /report-absence — student={req.student_id}, dates={req.missed_dates}")

    active_flow_count += 1
    try:
        flow = AbsenceFlow()
        flow._state = state
        flow.missed_dates = req.missed_dates
        result = flow.kickoff()
    except Exception as e:
        logger.error(f"[API] /report-absence FAILED: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        active_flow_count -= 1

    sessions[req.student_id] = flow.state

    return result


@router.get("/performance-report")
async def performance_report(student_id: str):
    """Get the student's full performance report."""
    global active_flow_count
    state = _get_state(student_id)
    logger.info(f"[API] /performance-report — student={student_id}")

    active_flow_count += 1
    try:
        flow = PerformanceFlow()
        flow._state = state
        result = flow.kickoff()
    except Exception as e:
        logger.error(f"[API] /performance-report FAILED: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        active_flow_count -= 1

    return result



