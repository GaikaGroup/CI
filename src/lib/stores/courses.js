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

function normaliseCourse(course) {
  if (!course || typeof course !== 'object') {
    return course;
  }

  const settings = course.settings ?? null;
  const practiceSource = course.practice ?? course.practice_mode ?? settings?.practice_mode ?? null;
  const examSource = course.exam ?? course.exam_mode ?? settings?.exam_mode ?? null;

  return {
    ...course,
    name: course.name ?? settings?.name ?? 'Untitled course',
    language: course.language ?? settings?.language ?? '',
    level: course.level ?? settings?.level ?? '',
    skills: course.skills ?? settings?.focus_skills ?? [],
    practice: normaliseMode(practiceSource),
    exam: normaliseMode(examSource),
    settings,
    // Enhanced properties for admin course management
    creatorId: course.creatorId ?? null,
    creatorRole: course.creatorRole ?? 'admin',
    status: course.status ?? 'active',
    visibility: course.visibility ?? 'draft',
    agents: course.agents ?? [],
    orchestrationAgent: course.orchestrationAgent ?? null,
    materials: course.materials ?? [],
    llmSettings: {
      allowOpenAI: course.llmSettings?.allowOpenAI ?? true,
      preferredProvider: course.llmSettings?.preferredProvider ?? 'ollama',
      fallbackEnabled: course.llmSettings?.fallbackEnabled ?? true,
      ...course.llmSettings
    },
    metadata: {
      createdAt: course.metadata?.createdAt ? new Date(course.metadata.createdAt) : new Date(),
      updatedAt: course.metadata?.updatedAt ? new Date(course.metadata.updatedAt) : new Date(),
      reportCount: course.metadata?.reportCount ?? 0,
      userCount: course.metadata?.userCount ?? 0,
      ...course.metadata
    }
  };
}

function normaliseCourses(courses) {
  return courses.map((course) => normaliseCourse(course));
}

export const DEFAULT_COURSES = normaliseCourses([]);

const STORAGE_KEY = 'learnModeCourses';

function createCoursesStore() {
  const { subscribe, set, update } = writable(DEFAULT_COURSES);
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
          set(normaliseCourses(parsed));
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COURSES));
          set(DEFAULT_COURSES);
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COURSES));
        set(DEFAULT_COURSES);
      }
    } catch (error) {
      console.warn('[Courses] Failed to read stored courses. Using defaults.', error);
      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COURSES));
      }
      set(DEFAULT_COURSES);
    }

    initialised = true;
  };

  const persist = (courses) => {
    if (!browser) {
      return;
    }
    try {
      const serialised = normaliseCourses(courses);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialised));
    } catch (error) {
      console.warn('[Courses] Failed to persist courses.', error);
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
    return `course_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  };

  return {
    subscribe,
    initialise: loadFromStorage,
    addCourse(course) {
      update((courses) => {
        const newCourse = normaliseCourse({
          ...course,
          id: course.id || generateId()
        });
        const next = [...courses, newCourse];
        persist(next);
        return next;
      });
    },
    updateCourse(id, updates) {
      update((courses) => {
        const next = courses.map((course) =>
          course.id === id ? normaliseCourse({ ...course, ...updates }) : course
        );
        persist(next);
        return next;
      });
    },
    removeCourse(id) {
      update((courses) => {
        const next = courses.filter((course) => course.id !== id);
        persist(next);
        return next;
      });
    },
    resetToDefault() {
      set(DEFAULT_COURSES);
      if (browser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COURSES));
      }
    },
    // Enhanced methods for admin course management
    addUserCourse(course, userId) {
      const userCourse = {
        ...course,
        creatorId: userId,
        creatorRole: 'user',
        status: 'active',
        visibility: course.visibility ?? 'draft',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          reportCount: 0,
          userCount: 0
        }
      };
      this.addCourse(userCourse);
    },
    updateCourseStatus(courseId, status) {
      this.updateCourse(courseId, {
        status,
        metadata: {
          updatedAt: new Date()
        }
      });
    },
    reportCourse(courseId) {
      // This would typically integrate with the moderation service
      // For now, we'll just increment the report count
      update((courses) => {
        const next = courses.map((course) => {
          if (course.id === courseId) {
            return normaliseCourse({
              ...course,
              metadata: {
                ...course.metadata,
                reportCount: (course.metadata.reportCount || 0) + 1,
                updatedAt: new Date()
              }
            });
          }
          return course;
        });
        persist(next);
        return next;
      });
    },
    getCoursesByCreator(userId) {
      let userCourses = [];
      subscribe((courses) => {
        userCourses = courses.filter((course) => course.creatorId === userId);
      })();
      return userCourses;
    },
    getReportedCourses() {
      let reportedCourses = [];
      subscribe((courses) => {
        reportedCourses = courses.filter(
          (course) => course.metadata && course.metadata.reportCount > 0
        );
      })();
      return reportedCourses;
    },
    getCoursesByStatus(status) {
      let filteredCourses = [];
      subscribe((courses) => {
        filteredCourses = courses.filter((course) => course.status === status);
      })();
      return filteredCourses;
    },
    getCoursesByRole(role) {
      let filteredCourses = [];
      subscribe((courses) => {
        filteredCourses = courses.filter((course) => course.creatorRole === role);
      })();
      return filteredCourses;
    },
    searchCourses(query) {
      let searchResults = [];
      const searchTerm = query.toLowerCase();
      subscribe((courses) => {
        searchResults = courses.filter(
          (course) =>
            course.name.toLowerCase().includes(searchTerm) ||
            course.description.toLowerCase().includes(searchTerm) ||
            course.language.toLowerCase().includes(searchTerm) ||
            course.skills.some((skill) => skill.toLowerCase().includes(searchTerm))
        );
      })();
      return searchResults;
    },
    getCourseStats() {
      let stats = {};
      subscribe((courses) => {
        stats = {
          total: courses.length,
          active: courses.filter((s) => s.status === 'active').length,
          blocked: courses.filter((s) => s.status === 'blocked').length,
          deleted: courses.filter((s) => s.status === 'deleted').length,
          adminCreated: courses.filter((s) => s.creatorRole === 'admin').length,
          userCreated: courses.filter((s) => s.creatorRole === 'user').length,
          reported: courses.filter((s) => s.metadata && s.metadata.reportCount > 0).length
        };
      })();
      return stats;
    }
  };
}

export const coursesStore = createCoursesStore();

// Legacy export for backward compatibility during transition
export const subjectsStore = coursesStore;
