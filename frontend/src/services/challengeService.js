import api from './api';

export async function fetchChallenges() {
  const res = await api.get('/challenges');
  return res.data;
}

export async function submitChallengeSolution(challengeId, githubUrl) {
  const res = await api.post('/challenges/submit', {
    challenge_id: challengeId,
    github_url: githubUrl,
  });
  return res.data;
}
