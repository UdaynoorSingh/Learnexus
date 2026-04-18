/**
 * Public mascot assets (/public/*.png) mapped by app area.
 * Filenames match files the product ships under `frontend/public/`.
 */
export const PAGE_MASCOTS = {
  /** Home / overview — welcoming energy */
  dashboard: { src: '/joyfull.png', alt: 'LearnNexus mascot welcoming you to your workspace' },
  /** Catalog navigation — steady, academic focus */
  explorer: { src: '/focused.png', alt: 'LearnNexus mascot focused on your course catalog' },
  /** Single topic study hub */
  topic: { src: '/focused.png', alt: 'LearnNexus mascot ready to study this topic with you' },
  /** Notes & PDF upload flow */
  upload: { src: '/encouraging-making-progress.png', alt: 'LearnNexus mascot encouraging your upload progress' },
  /** YouTube fast-learn — discovery reaction */
  videoLearn: { src: '/surprised.png', alt: 'LearnNexus mascot excited about what you will learn from the video' },
  /** AI Tutor — guidance & hints */
  aiTutor: { src: '/getting-a-hint.png', alt: 'LearnNexus mascot offering tutoring hints' },
  /** Community board + room assistant */
  nexusBoard: { src: '/joyfull.png', alt: 'LearnNexus mascot for Nexus Board community' },
  /** Library & long-form reads */
  nexusLibrary: { src: '/focused.png', alt: 'LearnNexus mascot focused on your library' },
  /** Company challenges & bounties */
  challenges: { src: '/achievement-proud.png', alt: 'LearnNexus mascot proud of your challenge progress' },
  /** Account & credits */
  profile: { src: '/achievement-proud.png', alt: 'LearnNexus mascot celebrating your profile and progress' },
  /** Saved Nexus threads */
  bookmarks: { src: '/focused.png', alt: 'LearnNexus mascot with your bookmarked threads' },
  /** Marketing / sign-in */
  login: { src: '/joyfull.png', alt: 'LearnNexus mascot inviting you to sign in' },
};

/** Moods for inline use (exam results, errors) — not full page headers */
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
