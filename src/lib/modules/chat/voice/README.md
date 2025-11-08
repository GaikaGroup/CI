# Voice Module

Модульная структура для voice chat функциональности.

## Структура

````
voice/
├── services/
│   ├── voiceModeManager.js      - Управление voice mode (активация/деактивация)
│   ├── avatarAnimation.js       - Эмоции и анимация аватара
│   ├── audioRecorder.js         - Запись и транскрипция аудио
│   ├── speechSynthesizer.js     - Синтез речи (TTS)
│   ├── audioPlayer.js           - Воспроизведение и очередь аудио
│   └── messageHandler.js        - Обработка сообщений
├── utils/
│   ├── audioUtils.js            - Утилиты для работы с аудио
│   └── languageDetection.js     - Определение языка
└── index.js                     - Главный экспорт API

## Использование

```javascript
// Импорт из главного модуля
import {
  setVoiceModeActive,
  startRecording,
  stopRecording,
  synthesizeResponseSpeech
} from '$lib/modules/chat/voice';

// Активировать voice mode
setVoiceModeActive(true);

// Начать запись
await startRecording();

// Остановить и получить транскрипцию
const text = await stopRecording();

// Синтезировать речь
await synthesizeResponseSpeech('Hello world');
````

## Принципы

1. **Модульность**: Каждый файл < 300 строк
2. **Единая ответственность**: Один модуль = одна задача
3. **Чистый API**: Экспорт через index.js
4. **Тестируемость**: Легко мокать и тестировать

## Миграция

Старый код в `voiceServices.js` (2815 строк) разделен на:

**Services:**

- `voiceModeManager.js` - 229 строк ✅
- `speechSynthesizer.js` - 241 строк ✅
- `messageHandler.js` - 217 строк ✅
- `audioRecorder.js` - 134 строк ✅
- `avatarAnimation.js` - 71 строк ✅
- `audioPlayer.js` - 285 строк ✅
- `audioQueue.js` - 196 строк ✅

**Utils:**

- `audioUtils.js` - 184 строк ✅
- `languageDetection.js` - 98 строк ✅

**Core:**

- `index.js` - 79 строк ✅

**Итого**: 1734 строк в 10 модулях (было 2815 в 1 файле)
**Экономия**: 1081 строк (38%) за счет удаления дублирования

## Статус

✅ **Рефакторинг завершен на 90%!**

### Готово ✅

- [x] voiceModeManager.js (229 строк)
- [x] avatarAnimation.js (71 строк)
- [x] audioRecorder.js (134 строк)
- [x] speechSynthesizer.js (241 строк)
- [x] messageHandler.js (217 строк)
- [x] audioPlayer.js (285 строк)
- [x] audioQueue.js (196 строк)
- [x] utils/audioUtils.js (184 строк)
- [x] utils/languageDetection.js (98 строк)
- [x] Обновлены импорты в 25 файлах

### TODO

- [ ] Добавить тесты для каждого модуля
- [ ] Удалить старый voiceServices.js (после финального тестирования)
- [ ] Обновить документацию в docs/
