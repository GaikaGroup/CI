# Implementation Plan

- [x] 1. Обновить дефолтную конфигурацию агентов
  - Изменить DEFAULT_AGENT_CONFIG в `src/lib/modules/courses/agents.js` и `src/lib/modules/subjects/agents.js`
  - Установить `maxTokens: 4000` вместо `1000`
  - Изменить `model: 'gpt-4-turbo'` вместо `'gpt-3.5-turbo'`
  - _Requirements: 2.7, 2.8_

- [x] 2. Создать MathQueryClassifier
  - Создать файл `src/lib/modules/llm/classifiers/MathQueryClassifier.js`
  - Реализовать метод `classify(message, context)` для определения математических запросов
  - Добавить обнаружение математических ключевых слов (решить, вычислить, найти, доказать, etc.)
  - Добавить обнаружение математических символов и формул
  - Реализовать метод `getMathCategory(message)` для категоризации задач
  - Добавить confidence scoring для неоднозначных случаев
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]* 2.1 Написать unit tests для MathQueryClassifier
  - Создать файл `tests/unit/llm/MathQueryClassifier.test.js`
  - Тест распознавания математических ключевых слов
  - Тест обнаружения формул и уравнений
  - Тест категоризации задач (algebra, geometry, calculus, etc.)
  - Тест работы с контекстом предыдущих сообщений
  - Тест confidence scoring
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Создать RequestEnhancer
  - Создать файл `src/lib/modules/llm/enhancers/RequestEnhancer.js`
  - Реализовать метод `enhance(options, classification)` для улучшения параметров
  - Реализовать метод `getMathParameters(category)` для получения оптимальных параметров
  - Добавить логику увеличения maxTokens до 4000 для математики
  - Добавить логику снижения temperature до 0.3 для точности
  - Создать system prompts для разных категорий математики
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 3.1 Написать unit tests для RequestEnhancer
  - Создать файл `tests/unit/llm/RequestEnhancer.test.js`
  - Тест увеличения maxTokens для математических запросов
  - Тест выбора параметров по категориям
  - Тест добавления system prompts
  - Тест сохранения оригинальных параметров в metadata
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4. Интегрировать в ProviderManager
  - Обновить `src/lib/modules/llm/ProviderManager.js`
  - Импортировать MathQueryClassifier и RequestEnhancer
  - Создать метод `generateChatCompletionWithEnhancement(messages, options)`
  - Добавить логику классификации последнего сообщения
  - Добавить логику улучшения параметров для математики
  - Добавить метаданные классификации в ответ
  - Сохранить обратную совместимость с существующим методом
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]* 4.1 Написать integration tests для ProviderManager
  - Создать файл `tests/integration/llm/ProviderManagerMath.test.js`
  - Тест полного flow с математическим запросом
  - Тест работы с немathematическими запросами
  - Тест fallback при недоступности модели
  - Тест метаданных в ответе
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3_

- [x] 5. Обновить ChatService для использования enhancement
  - Обновить `src/lib/modules/chat/services.js`
  - Заменить вызов `generateChatCompletion` на `generateChatCompletionWithEnhancement`
  - Обновить `src/lib/modules/chat/enhancedServices.js` аналогично
  - Добавить логирование метаданных классификации
  - Сохранить обратную совместимость
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 5.5_

- [ ]* 5.1 Написать integration tests для ChatService с математикой
  - Создать файл `tests/integration/chat/mathIntegration.test.js`
  - Тест отправки математической задачи
  - Тест получения детального решения
  - Тест отображения формул через MathRenderer
  - Тест работы в разных языках (русский, английский)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 6. Добавить конфигурацию и feature flags
  - Создать файл `src/lib/config/math.js` для математических настроек
  - Добавить environment variables (VITE_MATH_MAX_TOKENS, VITE_MATH_TEMPERATURE, etc.)
  - Добавить MATH_FEATURES для включения/выключения функций
  - Добавить конфигурацию для локальных математических моделей (для будущего)
  - Обновить `.env.example` с новыми переменными
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 7. Добавить мониторинг и метрики
  - Обновить `src/lib/modules/analytics/UsageTracker.js`
  - Добавить отслеживание математических запросов
  - Добавить метрики по категориям математики
  - Добавить метрики использования токенов для математики
  - Добавить логирование классификации для анализа accuracy
  - _Requirements: 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ]* 7.1 Создать dashboard для математических метрик
  - Создать компонент для отображения статистики
  - Показать распределение по категориям математики
  - Показать среднее использование токенов
  - Показать стоимость математических запросов
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 8. Обновить документацию
  - Создать `docs/math-reasoning-enhancement.md` с описанием функции
  - Документировать новые environment variables
  - Добавить примеры использования
  - Документировать system prompts для разных категорий
  - Обновить README.md с информацией о математических возможностях
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 9. Провести manual testing
  - Протестировать простую алгебраическую задачу (уравнение)
  - Протестировать геометрическую задачу
  - Протестировать задачу на производные
  - Протестировать задачу на интегралы
  - Протестировать задачу по теории вероятностей
  - Протестировать смешанный диалог (математика + обычные вопросы)
  - Проверить полноту решений, корректность формул, время ответа
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 4.5_
