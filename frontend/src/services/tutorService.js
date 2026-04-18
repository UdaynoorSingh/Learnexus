/**
 * Agentic AI Tutor — Service Layer
 *
 * Standalone axios instance pointing at the tutor backend (/tutor proxy → port 5002).
 * Kept separate from the main api.js interceptor since the tutor service
 * uses in-memory student_id sessions, not JWT auth.
 */

import axios from 'axios';
import { asRateLimitRejection, showApiErrorToast } from './toast';

const tutor = axios.create({
  baseURL: import.meta.env.VITE_TUTOR_API_URL || '/tutor',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000, // roadmap generation can take 30-60s
});

tutor.interceptors.response.use(
  (response) => response,
  (error) => {
    const rl = asRateLimitRejection(error);
    if (rl) return Promise.reject(rl);
    showApiErrorToast(error);
    return Promise.reject(error);
  }
);

/* ───── Course Initialization ───── */

/** Optional axios request config (e.g. `{ skipErrorToast: true }` when UI shows its own error). */

export async function initCourse(
  {
    topic,
    depth_level = 'intermediate',
    duration_input = '4 weeks',
    pace_speed = 'normal',
    preferred_language = 'English',
    learning_style = 'visual',
    constraints = null,
  },
  requestConfig = {}
) {
  const { data } = await tutor.post(
    '/init-course',
    {
      topic,
      depth_level,
      duration_input,
      pace_speed,
      preferred_language,
      learning_style,
      constraints,
    },
    requestConfig
  );
  return data; // { student_id, roadmap, calendar_events }
}

/* ───── Lecture Preparation ───── */

export async function prepNextLecture(studentId, requestConfig = {}) {
  const { data } = await tutor.post(
    '/prep-next-lecture',
    {
      student_id: studentId,
    },
    requestConfig
  );
  return data; // { lecture_index, title, topics, script, audio_url, duration_seconds }
}

/* ───── Doubt Resolution ───── */

export async function askDoubt(studentId, question, lectureIndex = 0, requestConfig = {}) {
  const { data } = await tutor.post(
    '/ask-doubt',
    {
      student_id: studentId,
      question,
      lecture_index: lectureIndex,
    },
    requestConfig
  );
  return data; // { answer, referenced_topics }
}

/* ───── Quiz Submission ───── */

export async function submitQuiz(studentId, quizId, answers, requestConfig = {}) {
  const { data } = await tutor.post(
    '/submit-quiz',
    {
      student_id: studentId,
      quiz_id: quizId,
      answers, // [{ question_id, selected_option }]
    },
    requestConfig
  );
  return data; // { score, total, percentage, weak_topics, scorecard, revision_lecture_injected }
}

/* ───── Absence Reporting ───── */

export async function reportAbsence(studentId, missedDates, requestConfig = {}) {
  const { data } = await tutor.post(
    '/report-absence',
    {
      student_id: studentId,
      missed_dates: missedDates, // ["YYYY-MM-DD", ...]
    },
    requestConfig
  );
  return data; // { updated_roadmap, rescheduled_events, changes_summary }
}

/* ───── Performance Report ───── */

export async function getPerformanceReport(studentId, requestConfig = {}) {
  const { data } = await tutor.get('/performance-report', {
    params: { student_id: studentId },
    ...requestConfig,
  });
  return data;
}

/* ───── Health Check ───── */

export async function healthCheck(requestConfig = {}) {
  const { data } = await tutor.get('/health', requestConfig);
  return data;
}
