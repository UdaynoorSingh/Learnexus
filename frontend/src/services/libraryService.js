import api from './api';

export async function fetchLibraryPosts(params = {}) {
  const res = await api.get('/library/posts', { params });
  return res.data;
}

export async function fetchLibraryPost(id) {
  const res = await api.get(`/library/posts/${id}`);
  return res.data;
}

export async function createLibraryPost(payload) {
  const res = await api.post('/library/posts', payload);
  return res.data;
}

export async function voteLibraryPost(postId, type) {
  const res = await api.post(`/library/posts/${postId}/vote`, { type });
  return res.data;
}

export async function deleteLibraryPost(postId) {
  const res = await api.delete(`/library/posts/${postId}`);
  return res.data;
}
