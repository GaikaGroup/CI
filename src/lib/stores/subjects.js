import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function normaliseMode(mode = null) {
  if (!mode) {
    return null;
  }

  const followUp =
    mode.followUp ?? mode.follow_up ?? mode.follow_up_guidance ?? mode.followUpGuidance ?? '';

  return {
    summary: mode.summary ?? '',
    instructions: mode.instructions ?? '',
    followUp,
    minWords: mode.minWords ?? mode.min_words ?? null,
    maxTokens: mode.maxTokens ?? mode.max_tokens ?? null
  };
}

function normaliseSubject(subject) {
  if (!subject || typeof subject !== 'object') {
    return subject;
  }

  const settings = subject.settings ?? null;
  const practiceSource =
    subject.practice ?? subject.practice_mode ?? settings?.practice_mode ?? null;
  const examSource = subject.exam ?? subject.exam_mode ?? settings?.exam_mode ?? null;

  return {
    ...subject,
    name: subject.name ?? settings?.name ?? 'Untitled subject',
    language: subject.language ?? settings?.language ?? '',
    level: subject.level ?? settings?.level ?? '',
    skills: subject.skills ?? settings?.focus_skills ?? [],
    practice: normaliseMode(practiceSource),
    exam: normaliseMode(examSource),
    settings,
    // Enhanced properties for admin subject management
    creatorId: subject.creatorId ?? null,
    creatorRole: subject.creatorRole ?? 'admin',
    status: subject.status ?? 'active',
    agents: subject.agents ?? [],
    orchestrationAgent: subject.orchestrationAgent ?? null,
    materials: subject.materials ?? [],
    llmSettings: {
      allowOpenAI: subject.llmSettings?.allowOpenAI ?? true,
      preferredProvider: subject.llmSettings?.preferredProvider ?? 'ollama',
      fallbackEnabled: subject.llmSettings?.fallbackEnabled ?? true,
      ...subject.llmSettings
    },
    metadata: {
      createdAt: subject.metadata?.createdAt ? new Date(subject.metadata.createdAt) : new Date(),
      updatedAt: subject.metadata?.updatedAt ? new Date(subject.metadata.updatedAt) : new Date(),
      reportCount: subject.metadata?.reportCount ?? 0,
      userCount: subject.metadata?.userCount ?? 0,
      ...subject.metadata
    }
  };
}

function normaliseSubjects(subjects) {
  return subjects.map((subject) => normaliseSubject(subject));
}

export const DEFAULT_SUBJECTS = normaliseSubjects([]);

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
          set(normaliseSubjects(parsed));
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUBJECTS));
          set(DEFAULT_SUBJECTS);
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUBJECTS));
        set(DEFAULT_SUBJECTS);
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
      const serialised = normaliseSubjects(subjects);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialised));
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
        const newSubject = normaliseSubject({
          ...subject,
          id: subject.id || generateId()
        });
        const next = [...subjects, newSubject];
        persist(next);
        return next;
      });
    },
    updateSubject(id, updates) {
      update((subjects) => {
        const next = subjects.map((subject) =>
          subject.id === id ? normaliseSubject({ ...subject, ...updates }) : subject
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
    },
    // Enhanced methods for admin subject management
    addUserSubject(subject, userId) {
      const userSubject = {
        ...subject,
        creatorId: userId,
        creatorRole: 'user',
        status: 'active',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          reportCount: 0,
          userCount: 0
        }
      };
      this.addSubject(userSubject);
    },
    updateSubjectStatus(subjectId, status) {
      this.updateSubject(subjectId, {
        status,
        metadata: {
          updatedAt: new Date()
        }
      });
    },
    reportSubject(subjectId) {
      // This would typically integrate with the moderation service
      // For now, we'll just increment the report count
      update((subjects) => {
        const next = subjects.map((subject) => {
          if (subject.id === subjectId) {
            return normaliseSubject({
              ...subject,
              metadata: {
                ...subject.metadata,
                reportCount: (subject.metadata.reportCount || 0) + 1,
                updatedAt: new Date()
              }
            });
          }
          return subject;
        });
        persist(next);
        return next;
      });
    },
    getSubjectsByCreator(userId) {
      let userSubjects = [];
      subscribe((subjects) => {
        userSubjects = subjects.filter((subject) => subject.creatorId === userId);
      })();
      return userSubjects;
    },
    getReportedSubjects() {
      let reportedSubjects = [];
      subscribe((subjects) => {
        reportedSubjects = subjects.filter(
          (subject) => subject.metadata && subject.metadata.reportCount > 0
        );
      })();
      return reportedSubjects;
    },
    getSubjectsByStatus(status) {
      let filteredSubjects = [];
      subscribe((subjects) => {
        filteredSubjects = subjects.filter((subject) => subject.status === status);
      })();
      return filteredSubjects;
    },
    getSubjectsByRole(role) {
      let filteredSubjects = [];
      subscribe((subjects) => {
        filteredSubjects = subjects.filter((subject) => subject.creatorRole === role);
      })();
      return filteredSubjects;
    },
    searchSubjects(query) {
      let searchResults = [];
      const searchTerm = query.toLowerCase();
      subscribe((subjects) => {
        searchResults = subjects.filter(
          (subject) =>
            subject.name.toLowerCase().includes(searchTerm) ||
            subject.description.toLowerCase().includes(searchTerm) ||
            subject.language.toLowerCase().includes(searchTerm) ||
            subject.skills.some((skill) => skill.toLowerCase().includes(searchTerm))
        );
      })();
      return searchResults;
    },
    getSubjectStats() {
      let stats = {};
      subscribe((subjects) => {
        stats = {
          total: subjects.length,
          active: subjects.filter((s) => s.status === 'active').length,
          blocked: subjects.filter((s) => s.status === 'blocked').length,
          deleted: subjects.filter((s) => s.status === 'deleted').length,
          adminCreated: subjects.filter((s) => s.creatorRole === 'admin').length,
          userCreated: subjects.filter((s) => s.creatorRole === 'user').length,
          reported: subjects.filter((s) => s.metadata && s.metadata.reportCount > 0).length
        };
      })();
      return stats;
    }
  };
}

export const subjectsStore = createSubjectsStore();
