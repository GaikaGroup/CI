# Universal Diagram Generator

Автоматическая генерация SVG диаграмм из текста задач.

## Использование

### Базовый пример

```javascript
import { DiagramService } from '$lib/modules/diagrams';

// Автоматическая генерация из текста
const result = await DiagramService.generateFromText(
  'В треугольнике ABC угол A равен 50 градусам, угол B равен 70 градусам'
);

if (result.success) {
  console.log(result.svg); // SVG markup
  console.log(result.dataURL); // data:image/svg+xml;base64,...
  console.log(result.type); // 'triangle'
  console.log(result.metadata); // Информация о диаграмме
}
```

### Проверка необходимости диаграммы

```javascript
const needsDiagram = await DiagramService.needsDiagram(taskText);

if (needsDiagram) {
  const diagram = await DiagramService.generateFromText(taskText);
  // Использовать diagram
}
```

### Определение типа диаграммы

```javascript
const type = await DiagramService.getDiagramType(taskText);
// Возвращает: 'triangle', 'circle', 'quadrilateral' или null
```

## Поддерживаемые типы

### Треугольники

Система автоматически определяет треугольники и извлекает параметры:

```javascript
// Из углов
'В треугольнике ABC угол A = 50°, угол B = 70°'
'In triangle ABC angle A = 50 degrees, angle B = 70 degrees'

// Из сторон (будущее)
'Треугольник со сторонами 3, 4, 5'
```

**Требования:**
- Минимум 2 угла (третий вычисляется автоматически)
- ИЛИ 3 стороны

### Окружности (базовая поддержка)

```javascript
'Окружность радиусом 5 см'
'Circle with radius 5'
```

### Четырехугольники (базовая поддержка)

```javascript
'Квадрат со стороной 10'
'Прямоугольник 5x10'
```

## Формат ответа

### Успешная генерация

```javascript
{
  success: true,
  svg: '<svg>...</svg>',
  dataURL: 'data:image/svg+xml;base64,...',
  type: 'triangle',
  metadata: {
    detected: ['angle A', 'angle B'],
    calculated: ['angle C'],
    parameters: {
      angleA: 50,
      angleB: 70,
      angleC: 60
    },
    generated: '2024-01-01T00:00:00Z'
  }
}
```

### Ошибка

```javascript
{
  success: false,
  error: 'Невозможно построить треугольник: сумма углов 200° ≠ 180°',
  suggestion: 'Проверьте сумму углов треугольника (должна быть 180°)'
}
```

### Недостаточно информации

```javascript
{
  success: false,
  reason: 'No diagram needed for this text'
}
```

## Интеграция в проект

### В Svelte компоненте

```svelte
<script>
  import { DiagramService } from '$lib/modules/diagrams';

  let taskText = 'В треугольнике ABC угол A = 50°, угол B = 70°';
  let diagram = null;

  async function generateDiagram() {
    const result = await DiagramService.generateFromText(taskText);
    if (result.success) {
      diagram = result;
    }
  }
</script>

<button on:click={generateDiagram}>Создать чертёж</button>

{#if diagram}
  <div>
    {@html diagram.svg}
  </div>
{/if}
```

### В API endpoint

```javascript
// src/routes/api/diagrams/generate/+server.js
import { DiagramService } from '$lib/modules/diagrams';

export async function POST({ request }) {
  const { text } = await request.json();

  const result = await DiagramService.generateFromText(text);

  return new Response(JSON.stringify(result));
}
```

## Архитектура

```
diagrams/
├── DiagramService.js          # Главный сервис
├── analyzer/                  # Анализ текста
│   ├── TextAnalyzer.js       # Определение типа диаграммы
│   ├── TriangleAnalyzer.js   # Анализ треугольников
│   └── ParameterExtractor.js # Извлечение параметров
└── renderer/                  # Рендеринг SVG
    ├── DiagramRenderer.js    # Главный рендерер
    ├── TriangleRenderer.js   # Рендеринг треугольников
    └── SVGBuilder.js         # Построение SVG
```

## Расширение

### Добавление нового типа диаграммы

1. Создать анализатор в `analyzer/`
2. Создать рендерер в `renderer/`
3. Добавить в `TextAnalyzer._detectType()`
4. Добавить в `DiagramRenderer.render()`

### Пример: добавление графиков функций

```javascript
// analyzer/GraphAnalyzer.js
export class GraphAnalyzer {
  static async analyze(text) {
    // Извлечь функцию из текста
    // Вернуть параметры
  }
}

// renderer/GraphRenderer.js
export class GraphRenderer {
  static render(params, options) {
    // Нарисовать график
    // Вернуть SVG
  }
}
```

## Тестирование

```bash
# Запустить тесты
npm run test:run tests/unit/diagrams

# С покрытием
npm run test:coverage tests/unit/diagrams
```

## Ограничения

- Пока поддерживаются только треугольники (полная поддержка)
- Окружности и четырехугольники - базовая поддержка
- Текст должен быть на русском или английском
- Нужно минимум 2 угла или 3 стороны для треугольника

## Будущие улучшения

- [ ] Полная поддержка всех четырехугольников
- [ ] Графики функций
- [ ] Координатная плоскость
- [ ] Векторы
- [ ] 3D геометрия (изометрическая проекция)
- [ ] Анимация построения
- [ ] Интерактивные диаграммы
- [ ] Больше языков
