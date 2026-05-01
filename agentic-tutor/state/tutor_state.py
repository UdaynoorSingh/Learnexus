"""
Central State Management — All Pydantic models for the Agentic AI Tutor.
Every field uses Optional with sensible defaults so partial state is always valid.
"""

from __future__ import annotations
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid



class StudentProfile(BaseModel):
    """Captures the student's learning preferences and constraints."""
    topic: str = ""
    depth_level: str = "intermediate"          
    duration_weeks: int = 4                     
    duration_input: str = "4 weeks"            
    pace_speed: str = "normal"                  
    preferred_language: str = "English"
    learning_style: str = "visual"              
    constraints: Optional[str] = None            



class DayEntry(BaseModel):
    """A single day in the roadmap — can be a lecture or a quiz."""
    day: str = ""                               
    date: str = ""                              
    calendar_event_id: Optional[str] = None
    type: str = "lecture"                        
    lecture_index: Optional[int] = None
    title: str = ""
    topics: List[str] = Field(default_factory=list)
    estimated_duration_minutes: int = 45
    covers_lectures: List[int] = Field(default_factory=list)
    num_questions: Optional[int] = None


class Week(BaseModel):
    week_number: int = 1
    days: List[DayEntry] = Field(default_factory=list)


class CourseRoadmap(BaseModel):
    course_title: str = ""
    total_weeks: int = 0
    weeks: List[Week] = Field(default_factory=list)



class FetchedResources(BaseModel):
    web_results: List[dict] = Field(default_factory=list)
    library_notes: List[dict] = Field(default_factory=list)



class QuizQuestion(BaseModel):
    question_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    question: str = ""
    options: List[str] = Field(default_factory=list)
    correct_answer: str = ""


class SubmittedAnswer(BaseModel):
    question_id: str = ""
    selected_option: str = ""


class QuizState(BaseModel):
    quiz_id: Optional[str] = None
    questions: List[QuizQuestion] = Field(default_factory=list)
    submitted_answers: List[SubmittedAnswer] = Field(default_factory=list)


class QuizScore(BaseModel):
    quiz_id: str = ""
    score: int = 0
    total: int = 0
    percentage: float = 0.0
    weak_topics: List[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())



class PerformanceEntry(BaseModel):
    lecture_index: Optional[int] = None
    quiz_id: Optional[str] = None
    score: Optional[float] = None
    notes: str = ""
    weak_topics: List[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())



class CalendarEvent(BaseModel):
    event_id: str = ""
    title: str = ""
    date: str = ""
    description: str = ""
    status: str = "created"                  



class TutorState(BaseModel):
    """
    The single source of truth passed across all CrewAI Flows.
    Every field is Optional with a default so partial state is always valid.
    """
    student_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_profile: StudentProfile = Field(default_factory=StudentProfile)
    course_roadmap: CourseRoadmap = Field(default_factory=CourseRoadmap)
    current_lecture_index: int = 0
    fetched_resources: FetchedResources = Field(default_factory=FetchedResources)
    current_script: str = ""
    quiz_state: QuizState = Field(default_factory=QuizState)
    quiz_scores: List[QuizScore] = Field(default_factory=list)
    performance_log: List[PerformanceEntry] = Field(default_factory=list)
    schedule_interruptions: List[str] = Field(default_factory=list)
    calendar_events: List[CalendarEvent] = Field(default_factory=list)
