// Application-wide constants

// Chat message types
export const MESSAGE_TYPES = {
  USER: 'user',
  TUTOR: 'tutor',
  SYSTEM: 'system'
};

// Chat modes
export const CHAT_MODES = {
  TEXT: 'text',
  VOICE: 'voice'
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student'
};

// API endpoints (for future implementation)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout'
  },
  USERS: {
    BASE: '/api/v1/users',
    PROFILE: '/api/v1/users/profile',
    PROGRESS: '/api/v1/users/progress'
  },
  CHAT: {
    MESSAGE: '/api/v1/chat/message',
    HISTORY: '/api/v1/chat/history',
    VOICE: '/api/v1/chat/voice'
  },
  MATERIALS: {
    BASE: '/api/v1/materials',
    SEARCH: '/api/v1/materials/search'
  }
};

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  LANGUAGE: 'language',
  USER: 'user',
  AUTH_TOKEN: 'auth_token'
};