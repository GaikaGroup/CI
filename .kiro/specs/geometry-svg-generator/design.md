# Geometry SVG Generator - Design

## Architecture

### Module Structure

```
src/lib/modules/geometry/
├── generators/
│   ├── triangleGenerator.js      # Генерация треугольников
│   ├── quadrilateralGenerator.js # Четырехугольники
│   ├── circleGenerator.js        # Окружности
│   ├── angleGenerator.js         # Углы
│   └── index.js                  # Экспорт всех генераторов
├── utils/
│   ├── svgBuilder.js             # Построение SVG элементов
│   ├── mathHelpers.js            # Математические вычисления
│   ├── labelHelper.js            # Подписи и аннотации
│   └── styleConfig.js            # Стили и цвета
├── parser/
│   ├── geometryParser.js         # Парсинг текста задачи
│   └── parameterExtractor.js    # Извлечение параметров
├── GeometryService.js            # Главный сервис
└── index.js                      # Публичный API
```

### API Routes (опционально)

```
src/routes/api/geometry/
├── generate/
│   └── +server.js                # POST /api/geometry/generate
└── preview/
    └── +server.js                # GET /api/geometry/preview
```

## Core Components

### 1. GeometryService (главный сервис)

```javascript
class GeometryService {
  // Автоматическая генерация из текста
  static async generateFromText(text, options = {})

  // Генерация конкретной фигуры
  static generateTriangle(params)
  static generateQuadrilateral(params)
  static generateCircle(params)
  static generateAngle(params)

  // Комбинированные фигуры
  static generateComposite(figures)
}
```

### 2. SVG Builder

```javascript
class SVGBuilder {
  constructor(width, height)

  // Базовые элементы
  addLine(x1, y1, x2, y2, style)
  addCircle(cx, cy, r, style)
  addPolygon(points, style)
  addText(x, y, text, style)
  addAngleArc(cx, cy, radius, startAngle, endAngle)

  // Построение
  build() // Возвращает SVG строку
  toDataURL() // Возвращает data:image/svg+xml;base64,...
}
```

### 3. Triangle Generator

```javascript
class TriangleGenerator {
  // По трем углам
  static fromAngles(angleA, angleB, angleC, options)

  // По трем сторонам
  static fromSides(a, b, c, options)

  // По двум сторонам и углу между ними
  static fromSAS(side1, angle, side2, options)

  // По стороне и двум прилежащим углам
  static fromASA(angle1, side, angle2, options)

  // Специальные типы
  static equilateral(side, options)
  static isosceles(base, leg, options)
  static right(leg1, leg2, options)
}
```

### 4. Geometry Parser

```javascript
class GeometryParser {
  // Определение типа задачи
  static detectGeometryType(text)

  // Извлечение параметров
  static extractAngles(text)
  static extractSides(text)
  static extractPoints(text)

  // Полный анализ
  static parse(text) // Возвращает { type, params }
}
```

## Data Structures

### Figure Parameters

```javascript
// Треугольник
{
  type: 'triangle',
  angles: { A: 50, B: 70, C: 60 },
  sides: { a: 5, b: 6, c: 7 },
  labels: { vertices: ['A', 'B', 'C'] },
  style: { strokeColor: '#000', strokeWidth: 2 }
}

// Окружность
{
  type: 'circle',
  radius: 5,
  center: { x: 0, y: 0 },
  labels: { center: 'O', radius: 'r' }
}

// Угол
{
  type: 'angle',
  vertex: { x: 0, y: 0 },
  angle: 45,
  rays: [{ x: 1, y: 0 }, { x: 0.707, y: 0.707 }],
  label: '∠ABC = 45°'
}
```

### SVG Output

```javascript
{
  svg: '<svg>...</svg>',
  dataURL: 'data:image/svg+xml;base64,...',
  width: 400,
  height: 300,
  metadata: {
    type: 'triangle',
    generated: '2024-01-01T00:00:00Z'
  }
}
```

## Integration Points

### 1. Standalone Usage (не трогает существующий код)

```javascript
import { GeometryService } from '$lib/modules/geometry';

// В любом месте где нужно
const svg = GeometryService.generateTriangle({
  angles: { A: 50, B: 70, C: 60 }
});
```

### 2. API Endpoint (опционально)

```javascript
// POST /api/geometry/generate
{
  "type": "triangle",
  "params": {
    "angles": { "A": 50, "B": 70, "C": 60 }
  }
}

// Response
{
  "success": true,
  "data": {
    "svg": "<svg>...</svg>",
    "dataURL": "data:image/svg+xml;base64,..."
  }
}
```

### 3. Future: Auto-generation in Chat (не сейчас!)

```javascript
// В будущем можно добавить в chat service
// НО СЕЙЧАС НЕ ДЕЛАЕМ!
if (GeometryParser.detectGeometryType(message)) {
  const diagram = await GeometryService.generateFromText(message);
  // Добавить к ответу
}
```

## Styling System

### Default Styles

```javascript
const DEFAULT_STYLES = {
  figure: {
    stroke: '#2563eb', // blue-600
    strokeWidth: 2,
    fill: 'none'
  },
  label: {
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    fill: '#1f2937' // gray-800
  },
  angle: {
    stroke: '#10b981', // green-500
    strokeWidth: 1,
    fill: 'rgba(16, 185, 129, 0.1)'
  },
  measurement: {
    fontSize: 12,
    fill: '#6b7280' // gray-500
  }
};
```

### Customization

```javascript
GeometryService.generateTriangle({
  angles: { A: 50, B: 70, C: 60 },
  style: {
    strokeColor: '#ff0000',
    strokeWidth: 3,
    labelColor: '#000000'
  }
});
```

## Mathematical Calculations

### Coordinate System

- Origin (0, 0) в центре или левом верхнем углу
- Положительная ось Y направлена вниз (SVG convention)
- Углы в градусах (конвертируются в радианы внутри)

### Triangle Calculations

```javascript
// Закон косинусов: c² = a² + b² - 2ab·cos(C)
function calculateSide(a, b, angleC)

// Закон синусов: a/sin(A) = b/sin(B) = c/sin(C)
function calculateAngle(a, b, c)

// Координаты вершин
function calculateVertices(sides, angles)
```

## Error Handling

```javascript
class GeometryError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// Коды ошибок
const ERROR_CODES = {
  INVALID_TRIANGLE: 'INVALID_TRIANGLE', // Сумма углов ≠ 180°
  INVALID_SIDES: 'INVALID_SIDES', // Не выполняется неравенство треугольника
  MISSING_PARAMS: 'MISSING_PARAMS', // Недостаточно параметров
  PARSE_ERROR: 'PARSE_ERROR' // Не удалось распарсить текст
};
```

## Testing Strategy

### Unit Tests

```javascript
// tests/unit/geometry/triangleGenerator.test.js
describe('TriangleGenerator', () => {
  it('should generate triangle from angles', () => {
    const svg = TriangleGenerator.fromAngles(50, 70, 60);
    expect(svg).toContain('<svg');
    expect(svg).toContain('polygon');
  });

  it('should throw error for invalid angles', () => {
    expect(() => {
      TriangleGenerator.fromAngles(50, 70, 70);
    }).toThrow('INVALID_TRIANGLE');
  });
});
```

### Integration Tests

```javascript
// tests/integration/geometry/geometryService.test.js
describe('GeometryService', () => {
  it('should generate triangle from text', async () => {
    const text = 'В треугольнике ABC угол A = 50°, угол B = 70°';
    const result = await GeometryService.generateFromText(text);
    expect(result.svg).toBeDefined();
  });
});
```

## Performance Considerations

- Кэширование часто используемых фигур
- Ленивая загрузка генераторов
- Минимизация DOM операций
- Оптимизация математических вычислений

## Security

- Валидация всех входных параметров
- Ограничение размера SVG (max 2000x2000)
- Санитизация текстовых меток
- Защита от injection атак

## Accessibility

- Добавление `<title>` и `<desc>` в SVG
- ARIA labels для интерактивных элементов
- Высокий контраст для читаемости
- Альтернативное текстовое описание

## Example Usage

```javascript
// Простой треугольник
const svg1 = GeometryService.generateTriangle({
  angles: { A: 50, B: 70, C: 60 }
});

// Прямоугольный треугольник с катетами
const svg2 = GeometryService.generateTriangle({
  type: 'right',
  sides: { a: 3, b: 4 }
});

// Окружность с радиусом
const svg3 = GeometryService.generateCircle({
  radius: 5,
  showCenter: true,
  showRadius: true
});

// Автоматическая генерация из текста
const svg4 = await GeometryService.generateFromText(
  'В треугольнике ABC угол A равен 50 градусам, угол B равен 70 градусам'
);
```
