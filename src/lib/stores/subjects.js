import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const DEFAULT_SUBJECTS = [
  {
    id: 'dele-b2',
    name: 'DELE B2 Spanish',
    description:
      'Spanish proficiency exam emphasising reading, listening, writing, and speaking for upper-intermediate learners.',
    language: 'Spanish',
    level: 'B2',
    skills: ['Reading', 'Listening', 'Writing', 'Speaking'],
    practice: {
      summary: 'Guided practice with scaffolded feedback and strategy coaching.',
      instructions:
        'Act as a supportive Spanish coach. Break complex prompts into manageable steps, model high-quality responses, and highlight recurring grammar or vocabulary gaps with actionable corrections.',
      followUp: 'Suggest targeted drills or micro-practice tasks for the next study block.',
      minWords: 120,
      maxTokens: 900
    },
    exam: {
      summary: 'Full DELE B2 simulation with authentic task sequencing and scoring rubrics.',
      instructions:
        'Role-play as an official DELE examiner. Present prompts in the original Spanish, enforce time/word expectations, and evaluate answers using DELE assessment criteria with clear score rationales.',
      followUp:
        'Provide rubric-based score bands and one improvement priority for the next mock exam.',
      minWords: 250,
      maxTokens: 1400
    }
  },
  {
    id: 'toefl-ibt',
    name: 'TOEFL iBT Academic English',
    description:
      'Academic English certification covering integrated reading, listening, speaking, and writing tasks for university readiness.',
    language: 'English',
    level: 'B2-C1',
    skills: ['Reading', 'Listening', 'Speaking', 'Writing'],
    practice: {
      summary: 'Skill-specific drills with note-taking and vocabulary support.',
      instructions:
        'Coach the learner through TOEFL-style tasks. Emphasise paraphrasing, cohesive transitions, and integrated note usage while offering constructive, encouraging feedback.',
      followUp:
        'Recommend specific TOEFL sections or question types to revisit and provide quick warm-up prompts.',
      minWords: 150,
      maxTokens: 1000
    },
    exam: {
      summary: 'Timed TOEFL mock exam adhering to ETS scoring descriptors.',
      instructions:
        'Adopt the perspective of an ETS rater. Simulate timing cues, require academic tone, and deliver score estimates for delivery, language use, and topic development.',
      followUp:
        'Summarise performance strengths and give two measurable goals for the next exam attempt.',
      minWords: 300,
      maxTokens: 1600
    }
  }
];

const STORAGE_KEY = 'learnModeSubjects';

function createSubjectsStore() {
  const { subscribe, set, update } = writable(DEFAULT_SUBJECTS);
  let initialised = false;

  const loadFromStorage = () => {
    if (!browser || initialised) {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set(parsed);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUBJECTS));
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUBJECTS));
      }
    } catch (error) {
      console.warn('[Subjects] Failed to read stored subjects. Using defaults.', error);
      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUBJECTS));
      }
      set(DEFAULT_SUBJECTS);
    }

    initialised = true;
  };

  const persist = (subjects) => {
    if (!browser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
    } catch (error) {
      console.warn('[Subjects] Failed to persist subjects.', error);
    }
  };

  subscribe((value) => {
    if (!initialised) {
      return;
    }
    persist(value);
  });

  const generateId = () => {
    if (browser && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `subject_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  };

  return {
    subscribe,
    initialise: loadFromStorage,
    addSubject(subject) {
      update((subjects) => {
        const newSubject = {
          ...subject,
          id: subject.id || generateId()
        };
        const next = [...subjects, newSubject];
        persist(next);
        return next;
      });
    },
    updateSubject(id, updates) {
      update((subjects) => {
        const next = subjects.map((subject) =>
          subject.id === id ? { ...subject, ...updates } : subject
        );
        persist(next);
        return next;
      });
    },
    removeSubject(id) {
      update((subjects) => {
        const next = subjects.filter((subject) => subject.id !== id);
        persist(next);
        return next;
      });
    },
    resetToDefault() {
      set(DEFAULT_SUBJECTS);
      if (browser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUBJECTS));
      }
    }
  };
}

export const subjectsStore = createSubjectsStore();
