
export const PAGE_MASCOTS = {
  dashboard: { src: '/joyfull.png', alt: 'LearnNexus mascot welcoming you to your workspace' },
  explorer: { src: '/focused.png', alt: 'LearnNexus mascot focused on your course catalog' },
  topic: { src: '/focused.png', alt: 'LearnNexus mascot ready to study this topic with you' },
  upload: { src: '/encouraging-making-progress.png', alt: 'LearnNexus mascot encouraging your upload progress' },
  videoLearn: { src: '/surprised.png', alt: 'LearnNexus mascot excited about what you will learn from the video' },
  aiTutor: { src: '/getting-a-hint.png', alt: 'LearnNexus mascot offering tutoring hints' },
  nexusBoard: { src: '/joyfull.png', alt: 'LearnNexus mascot for Nexus Board community' },
  nexusLibrary: { src: '/focused.png', alt: 'LearnNexus mascot focused on your library' },
  challenges: { src: '/achievement-proud.png', alt: 'LearnNexus mascot proud of your challenge progress' },
  profile: { src: '/achievement-proud.png', alt: 'LearnNexus mascot celebrating your profile and progress' },
  bookmarks: { src: '/focused.png', alt: 'LearnNexus mascot with your bookmarked threads' },
  login: { src: '/joyfull.png', alt: 'LearnNexus mascot inviting you to sign in' },
};

export const MOOD_MASCOTS = {
  wrongAnswer: { src: '/wrong-answer.png', alt: 'LearnNexus mascot after a tough question' },
  frustrated: { src: '/frustrated-repetitive-mistakes.png', alt: 'LearnNexus mascot encouraging you to try again' },
  proud: { src: '/achievement-proud.png', alt: 'LearnNexus mascot celebrating a strong result' },
  encouraging: { src: '/encouraging-making-progress.png', alt: 'LearnNexus mascot cheering your progress' },
};

/**
 * @param {keyof typeof PAGE_MASCOTS} role
 * @returns {{ src: string, alt: string }}
 */
export function getPageMascot(role) {
  return PAGE_MASCOTS[role] ?? PAGE_MASCOTS.dashboard;
}
