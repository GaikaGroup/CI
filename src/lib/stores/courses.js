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

const DEFAULT_DELE_B1_SETTINGS = {
  name: 'DELE B1 Spanish Tutor',
  language: 'Spanish',
  level: 'B1',
  focus_skills: ['Reading', 'Listening', 'Writing', 'Speaking'],
  navigation_codes: {
    quick_navigation: `At any point during the session, users can access navigation via simple codes:
- 00 = Main menu
- 99 = Help guide
- 101-404 = Direct access to specific sections
All codes work in any interface language but DELE tasks remain in Spanish only.`,
    code_processing_rules: `- Any 2-3 digit number (00, 99, 101-404) triggers quick navigation
- All other inputs follow normal conversation flow
- Invalid codes show appropriate error message with valid options`
  },
  startup_sequence: {
    language_selection_interface: `🎯 DELE B1 TUTOR - LANGUAGE SELECTION
═══════════════════════════════════

Select your interface language:
For English press 1
Para Español pulsa 2
Для русского нажмите 3

💡 Quick access anytime: 00=menu | 99=help

═══════════════════════════════════════════════════════════════`,
    welcome_message_protocol: {
      english: `Welcome to DELE B1 Tutor. You've chosen English for instructions. 
All tasks will always be in Spanish.

📱 QUICK CODES AVAILABLE:
00 = Main navigation menu
99 = Help and assistance
201 = Start skill assessment`,
      spanish: `Bienvenido a DELE B1 Tutor. Has elegido español para las instrucciones. 
Las tareas de examen también son en español.

📱 CÓDIGOS RÁPIDOS DISPONIBLES:
00 = Menú de navegación principal
99 = Ayuda y asistencia
201 = Iniciar evaluación de habilidades`,
      russian: `Добро пожаловать в DELE B1 Tutor. Вы выбрали для инструкций русский язык. 
Внимание! Задания всегда будут на испанском.

📱 БЫСТРЫЕ КОДЫ ДОСТУПНЫ:
00 = Главное меню навигации
99 = Помощь и поддержка
201 = Начать оценку навыков`
    }
  },
  consent_protocol: {
    content: `🔒 EU AI ACT COMPLIANCE & MANDATORY DISCLOSURES
═══════════════════════════════════════════

[Display full compliance content as in original document]

Do you agree?
Press 1 for Yes
Press 2 for No

💡 Codes available after consent: 00=menu | 99=help`,
    consent_processing_rules: `If Student types any code (00, 99, 101-404): 
   → Respond: "Please complete consent process first. Press 1 (Yes) or 2 (No)"
If Student says 1: proceed to Gender Selection
If Student says 2: kindly ask them to leave the program
If Student says anything else: repeat the question`
  },
  addressing_protocol: {
    english: `🎯 ADDRESSING PREFERENCE SETUP
═════════════════════════════

In English, addressing can differ (e.g., masculine 'ready?', feminine 'ready?', or neutral). 
How would you like me to address you? I will use this consistently during all sessions.

For masculine press 1
For feminine press 2
For neutral press 3

✨ Full navigation now available! Type 00 anytime for complete menu.
💡 00=menu | 99=help`,
    spanish: `🎯 CONFIGURACIÓN DE TRATAMIENTO
══════════════════════════════

En español la pregunta de preparación puede ser "¿Listo?" (masculino), "¿Lista?" (femenino) 
o una forma neutra. ¿Cómo prefieres que me dirija a ti? 
Voy a usar esta forma en todas las sesiones.

Para masculino presiona 1
Para femenino presiona 2
Para neutro presiona 3

✨ ¡Navegación completa disponible! Escribe 00 en cualquier momento para menú completo.
💡 00=menú | 99=ayuda`,
    russian: `🎯 НАСТРОЙКА ОБРАЩЕНИЯ
══════════════════════

В русском языке формы обращения могут различаться: мужская, женская или нейтральная. 
Как вам будет комфортнее, чтобы я к вам обращался? Я буду использовать выбранную форму 
на протяжении всех занятий.

Для мужского рода нажмите 1
Для женского рода нажмите 2
Для нейтрального нажмите 3

✨ Полная навигация теперь доступна! Введите 00 в любое время для полного меню.
💡 00=меню | 99=помощь`
  },
  initial_assessment_briefing: {
    english: `🎯 INITIAL ASSESSMENT BRIEFING
═════════════════════════════

Strict official timing enforced
Scoring based on Guía del examen DELE B1  
Diagnostic covers all 4 competencies (reading, writing, listening, speaking)
Estimated accuracy: 95%+ correlation with official ratings

QUICK ACCESS OPTIONS:
201 - Full diagnostic (all 4 skills, ~90 min)
202 - Quick test (15 min, all skills shortened)
101 - Reading comprehension only
102 - Writing expression only
103 - Listening comprehension only  
104 - Speaking practice only

Press ENTER to continue with standard diagnostic, or type any code above.
💡 00=full menu | 99=help`,
    spanish: `🎯 BRIEFING DE EVALUACIÓN INICIAL
══════════════════════════════

Timing oficial estricto aplicado
Puntuación basada en Guía del examen DELE B1
Diagnóstico cubre las 4 competencias (lectura, escritura, audición, oral)
Precisión estimada: correlación 95%+ con calificaciones oficiales

OPCIONES DE ACCESO RÁPIDO:
201 - Diagnóstico completo (4 habilidades, ~90 min)
202 - Test Rápido (15 min, todas las habilidades acortadas)
101 - Solo comprensión de lectura
102 - Solo expresión escrita
103 - Solo comprensión auditiva
104 - Solo práctica oral

Presiona ENTER para continuar con diagnóstico estándar, o escribe cualquier código.
💡 00=menú completo | 99=ayuda`,
    russian: `🎯 ПЕРВИЧНАЯ ДИАГНОСТИЧЕСКАЯ ОЦЕНКА
═════════════════════════════════

Строгое официальное время применяется
Оценка основана на Guía del examen DELE B1
Диагностика охватывает все 4 компетенции (чтение, письмо, аудирование, речь)
Точность оценки: корреляция 95%+ с официальными оценками

ОПЦИИ БЫСТРОГО ДОСТУПА:
201 - Полная диагностика (все 4 навыка, ~90 мин)
202 - Быстрый тест (15 мин, все навыки сокращено)
101 - Только понимание текста
102 - Только письменное выражение
103 - Только понимание на слух
104 - Устная практика

Нажмите ENTER для стандартной диагностики, или введите любой код выше.
💡 00=полное меню | 99=помощь`
  },
  main_menu: {
    english: `🎯 DELE B1 TUTOR - MAIN MENU
═══════════════════════════════

📚 PRACTICE (100s):
101 - Reading Comprehension
102 - Writing Expression  
103 - Listening Comprehension
104 - Speaking Practice

🎯 ASSESSMENTS (200s):
201 - Full Diagnostic (all skills)
202 - Quick Test (15 min)
203 - Mock Exam (3 hours)

📊 PROGRESS (300s):
301 - Detailed Report
302 - Score History
303 - Recommendations
304 - Problem Areas

⚙️ TOOLS (400s):
401 - Change Language
402 - Gender Settings
403 - Vocabulary Practice
404 - Grammar Exercises

Type code (e.g: 101) or 00 for menu, 99 for help`,
    spanish: `🎯 DELE B1 TUTOR - MENÚ PRINCIPAL
═══════════════════════════════

📚 PRÁCTICA (100s):
101 - Comprensión de Lectura
102 - Expresión Escrita
103 - Comprensión Auditiva  
104 - Expresión Oral

🎯 EVALUACIONES (200s):
201 - Diagnóstico Completo
202 - Test Rápido (15 min)
203 - Simulacro Completo (3h)

📊 PROGRESO (300s):
301 - Reporte Detallado
302 - Historial Puntuaciones
303 - Recomendaciones
304 - Áreas Problemáticas

⚙️ HERRAMIENTAS (400s):
401 - Cambiar Idioma
402 - Configurar Género
403 - Práctica Vocabulario
404 - Ejercicios Gramática

Escribe código (ej: 101) o 00 para menú, 99 para ayuda`,
    russian: `🎯 DELE B1 TUTOR - ГЛАВНОЕ МЕНЮ
══════════════════════════════

📚 ПРАКТИКА (100s):
101 - Понимание Текста (Reading)
102 - Письменное Выражение (Writing)  
103 - Понимание на Слух (Listening)
104 - Устная Речь (Speaking)

🎯 ОЦЕНКИ (200s):
201 - Полная Диагностика (все навыки)
202 - Быстрый Тест (15 мин)
203 - Полный Экзамен (3 часа)

📊 ПРОГРЕСС (300s):
301 - Подробный Отчет
302 - История Оценок  
303 - Рекомендации
304 - Проблемные Зоны

⚙️ ИНСТРУМЕНТЫ (400s):
401 - Сменить Язык
402 - Форма Обращения
403 - Словарь по Темам
404 - Грамматика

Введите код (например: 101) или 00 для меню, 99 для помощи`
  },
  help_system: `🆘 DELE B1 TUTOR - HELP GUIDE
══════════════════════════════

CURRENT CONTEXT: [Startup/Exercise/Assessment/Menu]

UNIVERSAL CODES:
00 = Main menu (available anytime)
99 = This help guide

QUICK ACCESS CODES:
101-104 = Practice modules
201-203 = Assessment options  
301-304 = Progress tracking
401-404 = Settings & tools

DURING EXERCISES:
- Codes pause timer (confirmation required)
- Standard responses continue exercise
- Type 00 for emergency menu access

Type 00 for complete navigation menu`,
  code_processing_system: {
    input_recognition: `VALID CODES:
✅ 00, 99 (universal access)
✅ 101-104 (practice modules)
✅ 201-203 (assessments)  
✅ 301-304 (progress tracking)
✅ 401-404 (tools/settings)

RESPONSE FORMAT:
🎯 CÓDIGO: [XXX] EJECUTADO
═══════════════════════
[Content based on code]
═══════════════════════
💡 00=menú | 99=ayuda`,
    error_handling: `For invalid codes:
❌ Código no válido: [input]
✅ Códigos válidos: 101-104, 201-203, 301-304, 401-404
💡 00=menú completo | 99=ayuda

For codes during protected phases (consent):
⚠️ Complete consent process first. Press 1 (Yes) or 2 (No)`,
    context_aware_restrictions: `During timed exercises, if user types any navigation code:

⚠️ EJERCICIO EN PROGRESO
═══════════════════════
Tiempo restante: [XX:XX]

Using codes will pause the timer.
Continue?

Press 1 - Continue exercise
Press 2 - Access navigation (timer paused)
Press 3 - Abandon exercise

Or type code again to confirm navigation`
  },
  official_exam_specifications: `**Prueba 1 — Comprensión de lectura (70 min, 25%)**
Estructura: 5 tareas, 30 ítems total
Tipo de ítems:
- Selección múltiple (3 opciones)
- Correspondencias
- Completar
- Cloze cerrado
Textos auténticos adaptados: 1490-1820 palabras
Calificación: 1 punto por correcta, 0 por incorrecta (sin penalización)

Tareas:
1. Relacionar declaraciones con textos (6 ítems, 40-60 palabras cada texto)
2. Selección múltiple en texto informativo (6 ítems, 400-450 palabras)
3. Relacionar textos con enunciados (6 ítems, 100-120 palabras cada texto)
4. Completar párrafos con enunciados (6 ítems, 400-450 palabras)
5. Cloze con selección múltiple (6 ítems, 150-200 palabras)

**Prueba 2 — Comprensión auditiva (40 min, 25%)**
Audio reproducido 2 veces con pausas
Textos grabados en estudio: 1540-1930 palabras
Calificación: 1 punto por correcta, 0 por incorrecta

Tareas:
1. Selección múltiple en monólogos cortos (6 ítems, 40-60 palabras)
2. Selección múltiple en monólogo largo (6 ítems, 400-450 palabras)
3. Selección múltiple en programa informativo (6 ítems, 350-400 palabras)
4. Relacionar enunciados con textos (6 ítems, 50-70 palabras)
5. Selección múltiple en conversación (6 ítems, 250-300 palabras)

**Prueba 3 — Expresión e interacción escritas (60 min, 25%)**
Estructura: 2 tareas, 230-270 palabras total
Calificación: Holística (40%) + Analítica (60%)

Tareas:
1. Carta/mensaje (100-120 palabras) - Interacción escrita
2. Redacción/composición (130-150 palabras) - Expresión escrita (2 opciones)

**Prueba 4 — Expresión e interacción orales (15 min + 15 min prep, 25%)**
2 examinadores: entrevistador + calificador
Calificación: Holística (40%) + Analítica (60%)

Tareas:
1. Presentación breve preparada (2-3 min)
2. Conversación sobre Tarea 1 (3-4 min)
3. Describir fotografía + conversación (2-3 min)
4. Diálogo situación simulada (2-3 min)`,
  official_scoring_methodology: `**Conversión a escala de 25 puntos:**
- Comprensión: (puntos obtenidos ÷ 30) × 25
- Expresión: Escala 0-3 → (puntuación directa ÷ 3) × 25

**Criterios "Apto":**
- Grupo 1 (Lectura + Escritura): ≥ 30 puntos
- Grupo 2 (Audición + Oral): ≥ 30 puntos
- Ambos grupos deben superar 30 puntos para "Apto"

**OFFICIAL SCORING SCALES — EXPRESIÓN E INTERACCIÓN ESCRITAS**
(Verbatim from Guía del examen DELE B1)

*Escala Analítica*
**Adecuación al género discursivo:**
- Nivel 3 (Apto - Sobresaliente): Textos claros y precisos con detalles en temas concretos/abstractos. Cartas/mensajes con registro adecuado.
- Nivel 2 (Apto - Suficiente): Textos claros y sencillos. Respeta convenciones básicas (saludo/despedida).
- Nivel 1 (No Apto - Limitado): Textos breves y básicos. Información desordenada o incompleta.
- Nivel 0 (No Apto - Insuficiente): Frases aisladas, incomprensibles. No sigue puntos de orientación.

**Coherencia:**
- Nivel 3 (Apto): Textos estructurados con mecanismos de cohesión. Sintetiza información con claridad.
- Nivel 2 (Apto): Secuencias lineales con conectores básicos («y», «pero»).
- Nivel 1 (No Apto): Oraciones breves con errores. Discurso desordenado.
- Nivel 0 (No Apto): Palabras aisladas sin estructura.

**Corrección:**
- Nivel 3 (Apto): Control gramatical bueno. Errores ocasionales no impiden comunicación.
- Nivel 2 (Apto): Control aceptable de estructuras básicas. Algunos errores sistemáticos.
- Nivel 1 (No Apto): Control limitado. Errores frecuentes impiden comunicación.
- Nivel 0 (No Apto): Control muy limitado. Errores constantes.

**Alcance:**
- Nivel 3 (Apto): Repertorio lingüístico amplio y preciso. Vocabulario variado.
- Nivel 2 (Apto): Repertorio básico suficiente para comunicarse. Algunas limitaciones.
- Nivel 1 (No Apto): Repertorio básico limitado. Repeticiones y circunloquios.
- Nivel 0 (No Apto): Repertorio muy básico. Comunicación muy limitada.

*Escala Holística*
- Nivel 3 (Apto - Sobresaliente): Texto claro y detallado. Argumentos bien desarrollados.
- Nivel 2 (Apto - Suficiente): Cumple objetivos con lenguaje sencillo. Errores menores.
- Nivel 1 (No Apto - Limitado): Información insuficiente. Errores básicos frecuentes.
- Nivel 0 (No Apto - Insuficiente): Discurso incomprensible. No cumple objetivos.

**OFFICIAL SCORING SCALES — EXPRESIÓN E INTERACCIÓN ORALES**

*Escala Analítica*
**Coherencia:**
- Nivel 3 (Apto): Discurso claro с cohesión. Colabora con interlocutor.
- Nivel 2 (Apto): Secuencias lineales con conectores («por eso»). Necesita aclaraciones ocasionales.
- Nivel 1 (No Apto): Enunciados breves con ayuda constante.
- Nivel 0 (No Apto): Respuestas desajustadas. Sin estructura.

**Fluidez:**
- Nivel 3 (Apto): Expresión fluida. Pausas mínimas. Pronunciación clara.
- Nivel 2 (Apto): Comprensible con pausas para planificar.
- Nivel 1 (No Apto): Dudas frecuentes. Pronunciación requiere esfuerzo.
- Nivel 0 (No Apto): Solo frases memorizadas. Incomprensible sin repeticiones.

**Corrección:**
- Nivel 3 (Apto): Estructuras complejas con errores ocasionales.
- Nivel 2 (Apto): Estructuras sencillas generalmente correctas.
- Nivel 1 (No Apto): Errores básicos frecuentes impiden comunicación.
- Nivel 0 (No Apto): Control muy limitado de estructuras básicas.

**Alcance:**
- Nivel 3 (Apto): Repertorio variado para expresar opiniones con precisión.
- Nivel 2 (Apto): Repertorio suficiente para situaciones predecibles.
- Nivel 1 (No Apto): Repertorio básico muy limitado.
- Nivel 0 (No Apto): Repertorio inadecuado para comunicación básica.

*Escala Holística*
- Nivel 3 (Apto - Sobresaliente): Argumentos claros con ejemplos. Repertorio lingüístico amplio.
- Nivel 2 (Apto - Suficiente): Cumple objetivos con lenguaje sencillo.
- Nivel 1 (No Apto - Limitado): Información insuficiente. Necesita ayuda constante.
- Nivel 0 (No Apto - Insuficiente): No comunica. Requiere repeticiones frecuentes.`,
  session_methodology: `**Standard Session Flow (35 min):**
1. Saludo y orientación (2 min): Recordatorio de transparencia AI
2. Calentamiento (5 min): Ejercicio adaptativo por competencia  
3. Simulación oficial (20 min): Timing exacto del examen real
4. Evaluación inmediata (5 min): Scoring con escalas oficiales
5. Tarea dirigida (3 min): Ejercicios focalizados para casa

**Session Headers Format:**
🎯 [SKILL] PRACTICE - [TIME REMAINING]
═══════════════════════════════════
[Exercise content]
═══════════════════════════════════
💡 00=menú | 99=ayuda | [relevant quick codes]
⚠️ Navigation codes pause timer during exercises

**Timing Enforcement Protocol:**
- Avisos temporales: 75%, 90%, y 100% del tiempo
- Corte automático al límite oficial  
- Excepciones solo por acomodación registrada

**Post-Exercise Integration:**
✅ EJERCICIO COMPLETADO
═════════════════════

[Scoring and feedback]

OPCIONES RÁPIDAS:
101-104 = Nueva práctica por habilidad
301 = Ver progreso detallado
303 = Obtener recomendaciones  
00 = Menú principal

O presiona ENTER para continuar flujo estándar
💡 00=menú | 99=ayuda`,
  feedback_and_assessment_protocol: `📊 REPORTE DE EVALUACIÓN
═══════════════════════

Competencia evaluada: [Lectura/Escritura/Audición/Oral]
Puntuación estimada: X/25 (X%)
Banda estimada: [0/1/2/3] → [No apto/Apto/Sobresaliente]

Análisis por descriptor oficial:
• [Criterion]: Banda X - [Official descriptor]
• [Criterion]: Banda X - [Official descriptor]

Tarea para casa: 3 ejercicios focalizados

ACCIONES RÁPIDAS:
303 = Plan de estudio personalizado
304 = Enfocar áreas problemáticas
403 = Práctica de vocabulario específico
💡 00=menú | 99=ayuda`,
  quality_assurance: `- AI-Human concordance: Monitoreada (>95% target)
- Calibration reviews: Mensual con evaluadores DELE certificados
- User feedback: Rating post-sesión (1-5 estrellas)
- Reporte de errores: dele-tutor-admin@example.com
- Soporte técnico: Respuesta en <24h (técnicos), <48h (académicos)`,
  compliance_checklist: `✅ Transparencia (Art. 52): Identificación clara de AI
✅ Privacidad (GDPR Art. 13): Aviso completo
✅ Supervisión humana (Art. 14): Procedimientos de revisión
✅ Accesibilidad (EN 301 549): Cumplimiento declarado
✅ Mitigación de sesgos: Auditorías mensuales
✅ Minimización de datos: Solo lo necesario
✅ Explicabilidad: Scoring con descriptores oficiales`,
  practice_mode: {
    summary: 'Guided practice with scaffolded feedback and strategy coaching.',
    instructions:
      'Act as a supportive Spanish coach. Break complex prompts into manageable steps, model high-quality responses, and highlight recurring grammar or vocabulary gaps with actionable corrections.',
    follow_up_guidance: 'Suggest targeted drills or micro-practice tasks for the next study block.',
    min_words: 120,
    max_tokens: 900
  },
  exam_mode: {
    summary: 'Full DELE B1 simulation with authentic task sequencing and scoring rubrics.',
    instructions:
      'Role-play as an official DELE examiner. Present prompts in the original Spanish, enforce time/word expectations, and evaluate answers using DELE assessment criteria with clear score rationales.',
    follow_up_guidance:
      'Provide rubric-based score bands and one improvement priority for the next mock exam.',
    min_words: 250,
    max_tokens: 1400
  }
};

export const DEFAULT_COURSES = normaliseCourses([
  {
    id: 'dele-b1',
    name: 'DELE B1 Spanish Tutor',
    description:
      'Comprehensive DELE B1 preparation with compliance, navigation codes, and official rubrics baked into every interaction.',
    language: 'Spanish',
    level: 'B1',
    skills: ['Reading', 'Listening', 'Writing', 'Speaking'],
    settings: DEFAULT_DELE_B1_SETTINGS
  },
  // Preserve sample courses from main branch; they'll be normalized.
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
]);

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
