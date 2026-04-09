import api from './api';

export const generateLecture = async (topicId, topicName, contextMode = 'both', context = '') => {
  const res = await api.post('/ai/teach', { topicId, topicName, contextMode, context });
  return res.data.lecture;
};

export const sendChatMessage = async (topicId, contextMode, history, message, lectureContext) => {
  const res = await api.post('/ai/chat', { topicId, contextMode, history, message, lectureContext });
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

export const processYouTubeVideo = async (topicId, url) => {
  const res = await api.post('/ai/youtube/embed', { topicId, url });
  return res.data;
};

export const generateMindMap = async (topicId) => {
  const res = await api.post('/ai/mindmap', { topicId });
  return res.data;
};

export const generatePodcast = async (topicId) => {
  const res = await api.post('/ai/podcast', { topicId });
  return res.data.script;
};
