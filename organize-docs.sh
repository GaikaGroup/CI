#!/bin/bash

# Скрипт организации документации в docs/
# Создан: $(date +%Y-%m-%d)

set -e

echo "📁 Организация документации в docs/..."
echo ""

# Создаем новые категории
echo "📂 Создаем категории..."
mkdir -p docs/features
mkdir -p docs/guides
mkdir -p docs/fixes
mkdir -p docs/tasks

echo "✅ Категории созданы"
echo ""

# ============================================
# КАТЕГОРИЯ: Features (Функциональность)
# ============================================
echo "🟢 Перемещение документации о функциях..."

FEATURES=(
  "cat-avatar-implementation.md"
  "mediapipe-cat-avatar.md"
  "lipsync-mouth-closure-fix.md"
  "waiting-phrases.md"
  "waiting-phrases-troubleshooting.md"
  "session-chat-voice-integration.md"
  "session-creation-management.md"
  "session-multimedia-support.md"
  "session-search-filtering.md"
  "sessions-list-implementation.md"
  "sessions-page-implementation.md"
  "image-preview-in-chat.md"
  "message-display-improvements.md"
  "math-rendering.md"
  "math-reasoning-enhancement.md"
  "math-monitoring-implementation.md"
)

for file in "${FEATURES[@]}"; do
  if [ -f "docs/$file" ]; then
    mv "docs/$file" "docs/features/"
    echo "  ✓ $file → features/"
  fi
done

echo ""

# ============================================
# КАТЕГОРИЯ: Guides (Руководства)
# ============================================
echo "🟢 Перемещение руководств..."

GUIDES=(
  "environment-setup.md"
  "local-math-models-guide.md"
  "math-model-configuration.md"
  "math-models-comparison.md"
  "gpt5-support.md"
  "auth-security-improvements.md"
  "stats-optimization.md"
)

for file in "${GUIDES[@]}"; do
  if [ -f "docs/$file" ]; then
    mv "docs/$file" "docs/guides/"
    echo "  ✓ $file → guides/"
  fi
done

echo ""

# ============================================
# КАТЕГОРИЯ: Fixes (Исправления)
# ============================================
echo "🟡 Перемещение документации об исправлениях..."

FIXES=(
  "catalogue-ux-enhancement.md"
  "console-menu-fix.md"
  "course-navigation-improvements.md"
  "image-preview-fix.md"
  "language-consistency-fix-summary.md"
  "language-consistency-logging.md"
  "MATH_FIX_SUMMARY.md"
  "ocr-tesseract-fix.md"
  "ocr-text-hidden.md"
  "ollama-vision-setup.md"
  "vision-api-fix.md"
  "vision-model-selection-fix.md"
)

for file in "${FIXES[@]}"; do
  if [ -f "docs/$file" ]; then
    mv "docs/$file" "docs/fixes/"
    echo "  ✓ $file → fixes/"
  fi
done

echo ""

# ============================================
# КАТЕГОРИЯ: Tasks (Задачи)
# ============================================
echo "🟡 Перемещение документации о задачах..."

TASKS=(
  "task-11-implementation-summary.md"
  "task-11-verification.md"
  "task-12-multimedia-support-summary.md"
  "task-12-verification-checklist.md"
  "task-13-verification-checklist.md"
)

for file in "${TASKS[@]}"; do
  if [ -f "docs/$file" ]; then
    mv "docs/$file" "docs/tasks/"
    echo "  ✓ $file → tasks/"
  fi
done

echo ""

# ============================================
# Создание README файлов
# ============================================
echo "📝 Создание README файлов..."

cat > docs/features/README.md << 'EOF'
# Features Documentation

Документация о функциональности и возможностях системы.

## Содержание

### Voice & Avatar
- `cat-avatar-implementation.md` - Реализация аватара кота
- `mediapipe-cat-avatar.md` - MediaPipe интеграция
- `lipsync-mouth-closure-fix.md` - Исправление синхронизации губ
- `waiting-phrases.md` - Фразы ожидания
- `waiting-phrases-troubleshooting.md` - Отладка фраз ожидания

### Sessions
- `session-chat-voice-integration.md` - Интеграция голосового чата
- `session-creation-management.md` - Управление сессиями
- `session-multimedia-support.md` - Мультимедиа поддержка
- `session-search-filtering.md` - Поиск и фильтрация
- `sessions-list-implementation.md` - Список сессий
- `sessions-page-implementation.md` - Страница сессий

### UI & Display
- `image-preview-in-chat.md` - Превью изображений
- `message-display-improvements.md` - Улучшения отображения сообщений

### Math Support
- `math-rendering.md` - Рендеринг математики
- `math-reasoning-enhancement.md` - Улучшение математических рассуждений
- `math-monitoring-implementation.md` - Мониторинг математики
EOF

cat > docs/guides/README.md << 'EOF'
# Guides

Руководства по настройке и использованию системы.

## Содержание

### Setup & Configuration
- `environment-setup.md` - Настройка окружения
- `local-math-models-guide.md` - Руководство по локальным математическим моделям
- `math-model-configuration.md` - Конфигурация математических моделей
- `math-models-comparison.md` - Сравнение математических моделей
- `gpt5-support.md` - Поддержка GPT-5

### Security & Performance
- `auth-security-improvements.md` - Улучшения безопасности
- `stats-optimization.md` - Оптимизация статистики
EOF

cat > docs/fixes/README.md << 'EOF'
# Fixes Documentation

Документация об исправлениях и улучшениях.

## Содержание

### UX Improvements
- `catalogue-ux-enhancement.md` - Улучшение UX каталога
- `console-menu-fix.md` - Исправление меню консоли
- `course-navigation-improvements.md` - Улучшения навигации курсов

### Image & Vision
- `image-preview-fix.md` - Исправление превью изображений
- `ocr-tesseract-fix.md` - Исправление Tesseract OCR
- `ocr-text-hidden.md` - Скрытие OCR текста
- `ollama-vision-setup.md` - Настройка Ollama Vision
- `vision-api-fix.md` - Исправление Vision API
- `vision-model-selection-fix.md` - Исправление выбора Vision модели

### Language & Math
- `language-consistency-fix-summary.md` - Исправление языковой консистентности
- `language-consistency-logging.md` - Логирование языка
- `MATH_FIX_SUMMARY.md` - Сводка исправлений математики
EOF

cat > docs/tasks/README.md << 'EOF'
# Tasks Documentation

Документация о выполненных задачах.

## Содержание

### Task 11: Voice Integration
- `task-11-implementation-summary.md` - Сводка реализации
- `task-11-verification.md` - Проверка

### Task 12: Multimedia Support
- `task-12-multimedia-support-summary.md` - Сводка реализации
- `task-12-verification-checklist.md` - Чеклист проверки

### Task 13: Search & Filtering
- `task-13-verification-checklist.md` - Чеклист проверки
EOF

# Обновляем главный README
cat > docs/README.md << 'EOF'
# Documentation

Документация проекта AI Tutor Platform.

## Структура

### 📁 [api/](api/)
API документация и спецификации

### 📁 [features/](features/)
Документация о функциональности системы:
- Voice & Avatar
- Sessions
- UI & Display
- Math Support

### 📁 [guides/](guides/)
Руководства по настройке и использованию:
- Setup & Configuration
- Security & Performance

### 📁 [fixes/](fixes/)
Документация об исправлениях:
- UX Improvements
- Image & Vision
- Language & Math

### 📁 [tasks/](tasks/)
Документация о выполненных задачах

### 📁 [technical/](technical/)
Техническая документация:
- OCR & Vision
- Database
- Courses & Navigation
- Implementation Guides

### 📁 [archive/](archive/)
Архив завершенных задач и отчетов

## Быстрый доступ

- **Начало работы:** [guides/environment-setup.md](guides/environment-setup.md)
- **API:** [api/sessions-api.md](api/sessions-api.md)
- **Функции:** [features/README.md](features/README.md)
- **Исправления:** [fixes/README.md](fixes/README.md)
EOF

echo "✅ README файлы созданы"
echo ""

# ============================================
# ИТОГИ
# ============================================
echo "🎉 Организация завершена!"
echo ""
echo "📊 СТАТИСТИКА:"
echo "  • Перемещено в features/: ${#FEATURES[@]} файлов"
echo "  • Перемещено в guides/: ${#GUIDES[@]} файлов"
echo "  • Перемещено в fixes/: ${#FIXES[@]} файлов"
echo "  • Перемещено в tasks/: ${#TASKS[@]} файлов"
echo ""
echo "📁 НОВАЯ СТРУКТУРА:"
echo "  docs/"
echo "  ├── api/           - API документация"
echo "  ├── features/      - Функциональность (${#FEATURES[@]} файлов)"
echo "  ├── guides/        - Руководства (${#GUIDES[@]} файлов)"
echo "  ├── fixes/         - Исправления (${#FIXES[@]} файлов)"
echo "  ├── tasks/         - Задачи (${#TASKS[@]} файлов)"
echo "  ├── technical/     - Техническая документация"
echo "  ├── archive/       - Архив"
echo "  └── README.md      - Главный README"
echo ""
