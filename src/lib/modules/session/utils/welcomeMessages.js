/**
 * Welcome Message Generator
 * Generates appropriate welcome messages based on session mode and language
 */

/**
 * Welcome messages for different modes and languages
 */
const WELCOME_MESSAGES = {
  fun: {
    en: "Hey there! 🎉 I'm your AI tutor and I'm super excited to chat with you! What would you like to explore today? We can talk about anything that interests you!",
    ru: "Привет! 🎉 Я твой AI-репетитор и очень рад пообщаться с тобой! О чём бы ты хотел поговорить сегодня? Мы можем обсудить всё, что тебе интересно!",
    es: "¡Hola! 🎉 Soy tu tutor de IA y estoy muy emocionado de charlar contigo! ¿Qué te gustaría explorar hoy? ¡Podemos hablar de cualquier cosa que te interese!",
    fr: "Salut ! 🎉 Je suis ton tuteur IA et je suis super excité de discuter avec toi ! Qu'aimerais-tu explorer aujourd'hui ? On peut parler de tout ce qui t'intéresse !",
    de: "Hallo! 🎉 Ich bin dein KI-Tutor und freue mich sehr, mit dir zu plaudern! Was möchtest du heute erkunden? Wir können über alles reden, was dich interessiert!",
    it: "Ciao! 🎉 Sono il tuo tutor AI e sono super entusiasta di chattare con te! Cosa vorresti esplorare oggi? Possiamo parlare di qualsiasi cosa ti interessi!",
    pt: "Olá! 🎉 Sou seu tutor de IA e estou super animado para conversar com você! O que você gostaria de explorar hoje? Podemos falar sobre qualquer coisa que te interesse!",
    ja: "こんにちは！🎉 私はあなたのAIチューターで、あなたとチャットできることをとても楽しみにしています！今日は何を探求したいですか？興味のあることなら何でも話せます！",
    ko: "안녕하세요! 🎉 저는 당신의 AI 튜터이고 당신과 채팅하게 되어 정말 기쁩니다! 오늘 무엇을 탐구하고 싶으신가요? 관심 있는 모든 것에 대해 이야기할 수 있습니다!",
    zh: "你好！🎉 我是你的AI导师，很高兴能和你聊天！今天你想探索什么？我们可以谈论任何你感兴趣的事情！"
  },
  learn: {
    en: "Hello! 📚 I'm your AI tutor, ready to help you learn and grow. What subject or topic would you like to study today? I'm here to guide you through your learning journey!",
    ru: "Здравствуйте! 📚 Я ваш AI-репетитор, готовый помочь вам учиться и развиваться. Какой предмет или тему вы хотели бы изучить сегодня? Я здесь, чтобы направлять вас в вашем учебном путешествии!",
    es: "¡Hola! 📚 Soy tu tutor de IA, listo para ayudarte a aprender y crecer. ¿Qué materia o tema te gustaría estudiar hoy? ¡Estoy aquí para guiarte en tu viaje de aprendizaje!",
    fr: "Bonjour ! 📚 Je suis ton tuteur IA, prêt à t'aider à apprendre et à grandir. Quelle matière ou quel sujet aimerais-tu étudier aujourd'hui ? Je suis là pour te guider dans ton parcours d'apprentissage !",
    de: "Hallo! 📚 Ich bin dein KI-Tutor, bereit dir beim Lernen und Wachsen zu helfen. Welches Fach oder Thema möchtest du heute studieren? Ich bin hier, um dich auf deiner Lernreise zu begleiten!",
    it: "Ciao! 📚 Sono il tuo tutor AI, pronto ad aiutarti a imparare e crescere. Quale materia o argomento vorresti studiare oggi? Sono qui per guidarti nel tuo percorso di apprendimento!",
    pt: "Olá! 📚 Sou seu tutor de IA, pronto para ajudá-lo a aprender e crescer. Qual matéria ou tópico você gostaria de estudar hoje? Estou aqui para guiá-lo em sua jornada de aprendizado!",
    ja: "こんにちは！📚 私はあなたのAIチューターで、あなたの学習と成長をサポートする準備ができています。今日はどの科目やトピックを勉強したいですか？あなたの学習の旅をガイドします！",
    ko: "안녕하세요! 📚 저는 당신의 AI 튜터로, 당신이 배우고 성장하도록 도울 준비가 되어 있습니다. 오늘 어떤 과목이나 주제를 공부하고 싶으신가요? 당신의 학습 여정을 안내하겠습니다!",
    zh: "你好！📚 我是你的AI导师，准备帮助你学习和成长。今天你想学习什么科目或主题？我在这里指导你的学习之旅！"
  }
};

/**
 * Default fallback message if language is not supported
 */
const DEFAULT_WELCOME = {
  fun: "Hey there! 🎉 I'm your AI tutor and I'm excited to chat with you! What would you like to explore today?",
  learn: "Hello! 📚 I'm your AI tutor, ready to help you learn. What would you like to study today?"
};

/**
 * Generate a welcome message based on session mode and language
 * @param {string} mode - Session mode ('fun' or 'learn')
 * @param {string} language - Session language code (e.g., 'en', 'es', 'ru')
 * @returns {string} Welcome message
 */
export function generateWelcomeMessage(mode = 'fun', language = 'en') {
  // Validate mode
  const validMode = ['fun', 'learn'].includes(mode) ? mode : 'fun';
  
  // Normalize language code (handle variants like 'en-US' -> 'en')
  const normalizedLanguage = language.toLowerCase().split('-')[0];
  
  // Get welcome message for the mode and language
  const modeMessages = WELCOME_MESSAGES[validMode];
  
  if (modeMessages && modeMessages[normalizedLanguage]) {
    return modeMessages[normalizedLanguage];
  }
  
  // Fallback to default message for the mode
  return DEFAULT_WELCOME[validMode];
}

/**
 * Generate a continuation message when resuming a session
 * @param {string} mode - Session mode ('fun' or 'learn')
 * @param {string} language - Session language code
 * @param {string} sessionTitle - Title of the session being resumed
 * @returns {string} Continuation message
 */
export function generateContinuationMessage(mode = 'fun', language = 'en', sessionTitle = '') {
  const normalizedLanguage = language.toLowerCase().split('-')[0];
  
  const continuationMessages = {
    fun: {
      en: `Welcome back! 🎉 Let's continue our fun conversation${sessionTitle ? ` about "${sessionTitle}"` : ''}. What would you like to talk about?`,
      ru: `С возвращением! 🎉 Давай продолжим наш весёлый разговор${sessionTitle ? ` о "${sessionTitle}"` : ''}. О чём бы ты хотел поговорить?`,
      es: `¡Bienvenido de nuevo! 🎉 Continuemos nuestra divertida conversación${sessionTitle ? ` sobre "${sessionTitle}"` : ''}. ¿De qué te gustaría hablar?`,
      fr: `Bon retour ! 🎉 Continuons notre conversation amusante${sessionTitle ? ` sur "${sessionTitle}"` : ''}. De quoi aimerais-tu parler ?`,
      de: `Willkommen zurück! 🎉 Lass uns unser lustiges Gespräch${sessionTitle ? ` über "${sessionTitle}"` : ''} fortsetzen. Worüber möchtest du sprechen?`,
      it: `Bentornato! 🎉 Continuiamo la nostra divertente conversazione${sessionTitle ? ` su "${sessionTitle}"` : ''}. Di cosa vorresti parlare?`,
      pt: `Bem-vindo de volta! 🎉 Vamos continuar nossa conversa divertida${sessionTitle ? ` sobre "${sessionTitle}"` : ''}. Sobre o que você gostaria de falar?`,
      ja: `おかえりなさい！🎉 楽しい会話${sessionTitle ? `「${sessionTitle}」について` : ''}を続けましょう。何について話したいですか？`,
      ko: `다시 오신 것을 환영합니다! 🎉 재미있는 대화${sessionTitle ? ` "${sessionTitle}"에 대해` : ''}를 계속합시다. 무엇에 대해 이야기하고 싶으신가요?`,
      zh: `欢迎回来！🎉 让我们继续我们有趣的对话${sessionTitle ? `关于"${sessionTitle}"` : ''}。你想谈什么？`
    },
    learn: {
      en: `Welcome back! 📚 Let's continue your learning journey${sessionTitle ? ` with "${sessionTitle}"` : ''}. Where would you like to pick up?`,
      ru: `С возвращением! 📚 Давай продолжим ваше учебное путешествие${sessionTitle ? ` с "${sessionTitle}"` : ''}. С чего бы вы хотели продолжить?`,
      es: `¡Bienvenido de nuevo! 📚 Continuemos tu viaje de aprendizaje${sessionTitle ? ` con "${sessionTitle}"` : ''}. ¿Dónde te gustaría retomar?`,
      fr: `Bon retour ! 📚 Continuons ton parcours d'apprentissage${sessionTitle ? ` avec "${sessionTitle}"` : ''}. Où aimerais-tu reprendre ?`,
      de: `Willkommen zurück! 📚 Lass uns deine Lernreise${sessionTitle ? ` mit "${sessionTitle}"` : ''} fortsetzen. Wo möchtest du weitermachen?`,
      it: `Bentornato! 📚 Continuiamo il tuo percorso di apprendimento${sessionTitle ? ` con "${sessionTitle}"` : ''}. Da dove vorresti riprendere?`,
      pt: `Bem-vindo de volta! 📚 Vamos continuar sua jornada de aprendizado${sessionTitle ? ` com "${sessionTitle}"` : ''}. Onde você gostaria de retomar?`,
      ja: `おかえりなさい！📚 学習の旅${sessionTitle ? `「${sessionTitle}」` : ''}を続けましょう。どこから再開したいですか？`,
      ko: `다시 오신 것을 환영합니다! 📚 학습 여정${sessionTitle ? ` "${sessionTitle}"` : ''}을 계속합시다. 어디서부터 다시 시작하고 싶으신가요?`,
      zh: `欢迎回来！📚 让我们继续你的学习之旅${sessionTitle ? `"${sessionTitle}"` : ''}。你想从哪里继续？`
    }
  };
  
  const validMode = ['fun', 'learn'].includes(mode) ? mode : 'fun';
  const modeMessages = continuationMessages[validMode];
  
  if (modeMessages && modeMessages[normalizedLanguage]) {
    return modeMessages[normalizedLanguage];
  }
  
  // Fallback
  return validMode === 'fun' 
    ? `Welcome back! Let's continue our conversation. What would you like to talk about?`
    : `Welcome back! Let's continue your learning journey. Where would you like to pick up?`;
}

/**
 * Get supported languages for welcome messages
 * @returns {Array<Object>} Array of supported language objects with code and name
 */
export function getSupportedLanguages() {
  return [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' }
  ];
}

/**
 * Check if a language is supported
 * @param {string} language - Language code to check
 * @returns {boolean} True if language is supported
 */
export function isLanguageSupported(language) {
  const normalizedLanguage = language.toLowerCase().split('-')[0];
  return WELCOME_MESSAGES.fun.hasOwnProperty(normalizedLanguage);
}

export default {
  generateWelcomeMessage,
  generateContinuationMessage,
  getSupportedLanguages,
  isLanguageSupported
};
