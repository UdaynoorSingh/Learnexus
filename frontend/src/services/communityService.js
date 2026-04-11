import api from './api';

export async function fetchPublicColleges() {
  const res = await api.get('/colleges/public');
  return res.data;
}

export async function fetchForumTags(params = {}) {
  const res = await api.get('/community/tags', { params });
  return res.data;
}

export async function fetchTrendingRooms(params = {}) {
  const res = await api.get('/community/rooms', { params });
  return res.data;
}

export async function fetchPosts({ tag, scope, collegeId } = {}) {
  const params = {};
  if (tag && tag !== '#All' && tag !== 'All') {
    params.tag = tag;
  }
  if (scope != null && scope !== '') {
    params.scope = scope;
  }
  if (collegeId != null && collegeId !== '') {
    params.collegeId = collegeId;
  }
  const res = await api.get('/community/posts', { params });
  return res.data;
}

export async function fetchBookmarkedPosts() {
  const res = await api.get('/community/posts/bookmarks');
  return res.data;
}

export async function createPost(payload) {
  const res = await api.post('/community/posts', payload);
  return res.data;
}

export async function uploadCommunityImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post('/community/upload-image', formData);
  return res.data.imageUrl;
}

export async function fetchComments(postId) {
  const res = await api.get(`/community/posts/${postId}/comments`);
  return res.data;
}

export async function addComment(postId, content, { is_anonymous = false, parent_comment_id = null } = {}) {
  const body = {
    content,
    is_anonymous: is_anonymous === true
  };
  if (parent_comment_id != null) {
    body.parent_comment_id = parent_comment_id;
  }
  const res = await api.post(`/community/posts/${postId}/comments`, body);
  return res.data;
}

export async function toggleCommentUpvote(postId, commentId) {
  const res = await api.post(`/community/posts/${postId}/comments/${commentId}/upvote`);
  return res.data;
}

export async function toggleUpvote(postId) {
  const res = await api.post(`/community/posts/${postId}/upvote`);
  return res.data;
}

export async function toggleBookmark(postId) {
  const res = await api.post(`/community/posts/${postId}/bookmark`);
  return res.data;
}

export async function resolvePost(postId, commentId) {
  const res = await api.post(`/community/posts/${postId}/resolve`, { commentId });
  return res.data;
}

export async function deletePost(postId) {
  const res = await api.delete(`/community/posts/${postId}`);
  return res.data;
}

export async function mascotChat(tag, query) {
  const res = await api.post('/community/mascot-chat', { tag, query });
  return res.data;
}
