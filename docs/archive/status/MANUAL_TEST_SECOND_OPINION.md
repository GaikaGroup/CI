# Ручной тест Second Opinion

## Ты уже залогинен в браузере, просто выполни эти шаги:

### 1. Открой новую сессию

```
http://localhost:3002/sessions
```

Нажми "New Session"

### 2. Отправь вопрос

```
Теорема Пифагора
```

### 3. Получишь первый ответ

От дефолтной LLM (Ollama qwen2.5:1.5b)

### 4. Нажми кнопку "Second Opinion"

Под первым ответом

### 5. Получишь второй ответ

От альтернативной LLM (OpenAI gpt-4o-mini)

### 6. Проверь что:

- ✅ Есть два ответа
- ✅ Они от разных провайдеров
- ✅ Оба ответа видны на странице

## Логи в терминале покажут:

```
[ProviderManager] Query classification...
Response generated using provider: ollama, model: qwen2.5:1.5b

[SecondOpinion] Generating with context...
[Ollama] Sending request...
[SecondOpinion] Generated response...
Response generated using provider: openai, model: gpt-4o-mini
```

## Если нужен автоматический тест

Я не могу получить session cookie из браузера через curl.
Но могу создать Playwright/Puppeteer тест который:

1. Откроет браузер
2. Залогинится
3. Создаст сессию
4. Отправит вопрос
5. Нажмет Second Opinion
6. Проверит что есть два ответа

Хочешь такой тест?
