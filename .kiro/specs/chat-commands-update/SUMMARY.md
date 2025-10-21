# Chat Commands Update - Summary

## Обновленные команды чата

Список команд был обновлен и упрощен для лучшего пользовательского опыта.

### Новый список команд

| Command     | What it does                             | Example/explain                                         |
| ----------- | ---------------------------------------- | ------------------------------------------------------- |
| `/explain`  | Explains a topic in simple terms         | `/explain quadratic equations`                          |
| `/solve`    | Solves a problem step by step            | `/solve x^2 + 5x + 6 = 0`                               |
| `/check`    | Checks your answer, text, code, or essay | `/check answer=(-2, -3)` or `/check essay="my text..."` |
| `/practice` | Gives similar exercises for practice     | `/practice topic="quadratic equations" n=3`             |
| `/notes`    | Creates a short summary or cheatsheet    | `/notes topic="quadratic equations"`                    |
| `/essay`    | Writes an essay on a given topic         | `/essay topic="Why education matters"`                  |
| `/help`     | Shows this help menu                     | `/help`                                                 |

### Изменения

**Удалены команды:**

- `/example` → заменена на `/practice`
- `/cheatsheet` → заменена на `/notes`
- `/test` → заменена на `/practice`
- `/conspect` → заменена на `/notes`
- `/plan` → удалена

**Добавлены команды:**

- `/practice` - для генерации упражнений
- `/notes` - для создания заметок/шпаргалок
- `/help` - для показа справки

**Обновлены команды:**

- `/explain` - теперь первая в списке
- `/check` - расширено описание (проверка ответов, текста, кода, эссе)

### Мультиязычная поддержка

Все команды поддерживают 3 языка:

**English:**

- `/explain`, `/solve`, `/check`, `/practice`, `/notes`, `/essay`, `/help`

**Русский:**

- `/объяснить`, `/решить`, `/проверить`, `/практика`, `/заметки`, `/эссе`, `/помощь`

**Español:**

- `/explicar`, `/resolver`, `/verificar`, `/practicar`, `/notas`, `/ensayo`, `/ayuda`

## Обновленные файлы

1. **src/lib/modules/session/utils/commandTypes.js**
   - Обновлен `COMMAND_TYPES` с новыми командами
   - Обновлен `COMMAND_VARIANTS` для всех языков

2. **src/lib/config/tutorCommands.json**
   - Обновлен список команд
   - Добавлены примеры использования для каждой команды

3. **src/lib/config/tutorCommands.schema.json**
   - Добавлено поле `example` в схему
   - Увеличена максимальная длина описания до 200 символов

## Следующие шаги

Для полной интеграции новых команд необходимо:

1. Обновить UI компоненты, которые отображают список команд
2. Обновить обработчики команд в сервисах
3. Добавить тесты для новых команд
4. Обновить документацию пользователя
