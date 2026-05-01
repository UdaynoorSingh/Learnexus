

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
  return data; 
}


export async function prepNextLecture(studentId, requestConfig = {}) {
  const { data } = await tutor.post(
    '/prep-next-lecture',
    {
      student_id: studentId,
    },
    requestConfig
  );
  return data; 
}


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
  return data; 
}


export async function submitQuiz(studentId, quizId, answers, requestConfig = {}) {
  const { data } = await tutor.post(
    '/submit-quiz',
    {
      student_id: studentId,
      quiz_id: quizId,
      answers, 
    },
    requestConfig
  );
  return data; 
}


export async function reportAbsence(studentId, missedDates, requestConfig = {}) {
  const { data } = await tutor.post(
    '/report-absence',
    {
      student_id: studentId,
      missed_dates: missedDates,
    },
    requestConfig
  );
  return data; 
}


export async function getPerformanceReport(studentId, requestConfig = {}) {
  const { data } = await tutor.get('/performance-report', {
    params: { student_id: studentId },
    ...requestConfig,
  });
  return data;
}


export async function healthCheck(requestConfig = {}) {
  const { data } = await tutor.get('/health', requestConfig);
  return data;
}
