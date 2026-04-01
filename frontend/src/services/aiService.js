import axios from 'axios';

const aiApi = axios.create({
  baseURL: 'http://localhost:5001/api/ai',
  headers: { 'Content-Type': 'application/json' }
});

export const generateLecture = async (topicName, context = '') => {
  const res = await aiApi.post('/teach', { topicName, context });
  return res.data.lecture;
};

export const sendChatMessage = async (history, message, lectureContext) => {
  const res = await aiApi.post('/chat', { history, message, lectureContext });
  return res.data.reply;
};

export default aiApi;
