import api from './api';

// Instead of maintaining a separate axios instance to localhost:5001,
// we now route everything securely through our Node.js backend.
// The Node.js backend will attach internal credentials and proxy to Python.

export const generateLecture = async (topicName, context = '') => {
  const res = await api.post('/ai/teach', { topicName, context });
  return res.data.lecture;
};

export const sendChatMessage = async (topicId, history, message, lectureContext) => {
  const res = await api.post('/ai/chat', { topicId, history, message, lectureContext });
  return res.data.reply;
};

export const generateFlashcards = async (topicId) => {
  const res = await api.post('/ai/flashcards', { topicId });
  return res.data.flashcards;
};

export const generateExam = async (topicId) => {
  const res = await api.post('/ai/exam/generate', { topicId });
  return res.data.exam;
};
