import { browser } from '$app/environment';
import { container } from '$lib/shared/di/container';
import { setExamProfile } from '$lib/stores/examProfile';
import { messages } from '$modules/chat/stores';

const DEFAULT_MODE = 'practice';

export function buildExamProfile(course, mode = DEFAULT_MODE) {
  if (!course || !mode) {
    return null;
  }

  const activeMode = mode === 'exam' ? course.exam : course.practice;

  return {
    courseId: course.id,
    courseName: course.name,
    description: course.description,
    language: course.language,
    level: course.level,
    skills: course.skills ?? [],
    mode,
    practice: course.practice,
    exam: course.exam,
    activeMode,
    settings: course.settings ?? null
  };
}

export function resetLearningSession() {
  if (!browser) {
    return;
  }

  const previousSessionId = localStorage.getItem('sessionId');
  localStorage.removeItem('sessionId');

  if (previousSessionId && container.has('sessionFactory')) {
    try {
      const sessionFactory = container.resolve('sessionFactory');
      sessionFactory.removeSession(previousSessionId);
    } catch (error) {
      console.warn('[Learning] Failed to clear previous session', error);
    }
  }

  messages.set([]);
}

export function startLearningSession(course, mode = DEFAULT_MODE) {
  const profile = buildExamProfile(course, mode);
  if (!profile) {
    return;
  }

  setExamProfile(profile);
  resetLearningSession();
}
