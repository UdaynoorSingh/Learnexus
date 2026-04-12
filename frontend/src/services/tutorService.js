/**
 * Agentic AI Tutor — Service Layer
 *
 * Standalone axios instance pointing at the tutor backend (/tutor proxy → port 5002).
 * Kept separate from the main api.js interceptor since the tutor service
 * uses in-memory student_id sessions, not JWT auth.
 */

import axios from 'axios';

const tutor = axios.create({
  baseURL: '/tutor',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000, // roadmap generation can take 30-60s
});

/* ───── Course Initialization ───── */

export async function initCourse({
  topic,
  depth_level = 'intermediate',
  duration_input = '4 weeks',
  pace_speed = 'normal',
  preferred_language = 'English',
  learning_style = 'visual',
  constraints = null,
}) {
  const { data } = await tutor.post('/init-course', {
    topic,
    depth_level,
    duration_input,
    pace_speed,
    preferred_language,
    learning_style,
    constraints,
  });
  return data; // { student_id, roadmap, calendar_events }
}

/* ───── Lecture Preparation ───── */

export async function prepNextLecture(studentId) {
  const { data } = await tutor.post('/prep-next-lecture', {
    student_id: studentId,
  });
  return data; // { lecture_index, title, topics, script, audio_url, duration_seconds }
}

/* ───── Doubt Resolution ───── */

export async function askDoubt(studentId, question, lectureIndex = 0) {
  const { data } = await tutor.post('/ask-doubt', {
    student_id: studentId,
    question,
    lecture_index: lectureIndex,
  });
  return data; // { answer, referenced_topics }
}

/* ───── Quiz Submission ───── */

export async function submitQuiz(studentId, quizId, answers) {
  const { data } = await tutor.post('/submit-quiz', {
    student_id: studentId,
    quiz_id: quizId,
    answers, // [{ question_id, selected_option }]
  });
  return data; // { score, total, percentage, weak_topics, scorecard, revision_lecture_injected }
}

/* ───── Absence Reporting ───── */

export async function reportAbsence(studentId, missedDates) {
  const { data } = await tutor.post('/report-absence', {
    student_id: studentId,
    missed_dates: missedDates, // ["YYYY-MM-DD", ...]
  });
  return data; // { updated_roadmap, rescheduled_events, changes_summary }
}

/* ───── Performance Report ───── */

export async function getPerformanceReport(studentId) {
  const { data } = await tutor.get('/performance-report', {
    params: { student_id: studentId },
  });
  return data;
}

/* ───── Health Check ───── */

export async function healthCheck() {
  const { data } = await tutor.get('/health');
  return data;
}
