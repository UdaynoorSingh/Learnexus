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

export const processYouTubeVideo = async (topicId, url, requestConfig = {}) => {
  const res = await api.post('/ai/youtube/embed', { topicId, url }, requestConfig);
  return res.data;
};

export const generateMindMap = async (topicId, requestConfig = {}) => {
  const res = await api.post('/ai/mindmap', { topicId }, requestConfig);
  return res.data;
};

export const generatePodcast = async (topicId, requestConfig = {}) => {
  const res = await api.post('/ai/podcast', { topicId }, requestConfig);
  return res.data.script;
};

export const sendNexGuideQuery = async (query, currentPath = '') => {
  const res = await api.post('/ai/nex-guide', { query, currentPath });
  return res.data;
};
