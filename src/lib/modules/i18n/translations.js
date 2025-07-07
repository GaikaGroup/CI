// Translations for the application
export const translations = {
  en: {
    title: "AI Tutor",
    about: "About",
    contacts: "Contacts",
    signIn: "Sign In",
    textChat: "Text Chat",
    voiceChat: "Voice Chat",
    voiceChatMode: "Voice Chat Mode",
    talkToTutor: "Talk to your AI tutor",
    recording: "Recording...",
    processing: "Processing...",
    holdToRecord: "Hold to record",
    selectLanguage: "Select Language",
    changeLanguage: "Change Language",
    languageChanged: "Language has been changed. Starting fresh conversation...",
    welcomeMessage: "Hello! I'm your AI tutor. How can I help you learn today?",
    placeholder: "Type your message..."
  },
  ru: {
    title: "ИИ Преподаватель",
    about: "О нас",
    contacts: "Контакты",
    signIn: "Войти",
    textChat: "Текстовый чат",
    voiceChat: "Голосовой чат",
    voiceChatMode: "Режим голосового чата",
    talkToTutor: "Поговорите с вашим ИИ-преподавателем",
    recording: "Запись...",
    processing: "Обработка...",
    holdToRecord: "Удерживайте для записи",
    selectLanguage: "Выберите язык",
    changeLanguage: "Изменить язык",
    languageChanged: "Язык был изменён. Начинаем новый разговор...",
    welcomeMessage: "Привет! Я ваш ИИ-преподаватель. Как я могу помочь вам в обучении сегодня?",
    placeholder: "Введите ваше сообщение..."
  },
  es: {
    title: "Tutor IA",
    about: "Acerca de",
    contacts: "Contactos",
    signIn: "Iniciar sesión",
    textChat: "Chat de texto",
    voiceChat: "Chat de voz",
    voiceChatMode: "Modo de chat de voz",
    talkToTutor: "Habla con tu tutor de IA",
    recording: "Grabando...",
    processing: "Procesando...",
    holdToRecord: "Mantén presionado para grabar",
    selectLanguage: "Seleccionar idioma",
    changeLanguage: "Cambiar idioma",
    languageChanged: "El idioma ha sido cambiado. Iniciando conversación nueva...",
    welcomeMessage: "¡Hola! Soy tu tutor de IA. ¿Cómo puedo ayudarte a aprender hoy?",
    placeholder: "Escribe tu mensaje..."
  }
};

// Helper function to get translations for the current language
export function getTranslation(lang, key) {
  if (!translations[lang]) {
    return translations.en[key] || key;
  }
  return translations[lang][key] || translations.en[key] || key;
}
