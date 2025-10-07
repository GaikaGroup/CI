/**
 * Mathematical Formula Rendering Examples
 *
 * This file contains example mathematical content that demonstrates
 * the automatic math rendering capabilities of the chatbot.
 */

export const mathExamples = {
  // Pythagorean Theorem (Russian)
  pythagorean_ru: `Для решения второй задачи на теорему Пифагора, где в прямоугольном треугольнике площадь равна 30 квадратных сантиметров, а один из катетов равен 5 см, нам нужно найти длины сторон другого катета и гипотенузы.

Пусть катет, который равен 5 см, обозначим как a. Площадь прямоугольного треугольника равна 30 кв.см, что равно половине произведения катетов: S = (a * b) / 2, где b - это другой катет.

У нас дано, что a = 5 см и S = 30 кв.см, поэтому мы можем найти b:
30 = (5 * b) / 2
60 = 5b
b = 60 / 5
b = 12

Таким образом, длина другого катета равна 12 см. Теперь мы можем найти длину гипотенузы с помощью теоремы Пифагора: гипотенуза в квадрате равна сумме квадратов катетов, то есть c^2 = a^2 + b^2.

Подставляем значения:
c^2 = 5^2 + 12^2
c^2 = 25 + 144
c^2 = 169
c = √169
c = 13

Таким образом, длина гипотенузы равна 13 см.`,

  // Quadratic Formula (English)
  quadratic_en: `To solve the quadratic equation ax^2 + bx + c = 0, we use the quadratic formula:

x = (-b ± √(b^2 - 4ac)) / (2a)

For example, let's solve x^2 - 5x + 6 = 0:
Here a = 1, b = -5, c = 6

x = (5 ± √(25 - 24)) / 2
x = (5 ± √1) / 2
x = (5 ± 1) / 2

Therefore: x = 3 or x = 2`,

  // Area and Perimeter
  geometry: `Geometric formulas:

Circle:
- Area: A = πr^2
- Circumference: C = 2πr

Rectangle:
- Area: A = l × w
- Perimeter: P = 2(l + w)

Triangle:
- Area: A = (1/2) × base × height
- Pythagorean theorem: c^2 = a^2 + b^2`,

  // Algebraic Expressions
  algebra: `Algebraic identities:

(a + b)^2 = a^2 + 2ab + b^2
(a - b)^2 = a^2 - 2ab + b^2
(a + b)(a - b) = a^2 - b^2

Factoring:
x^2 + 5x + 6 = (x + 2)(x + 3)
x^2 - 4 = (x + 2)(x - 2)`,

  // Fractions and Decimals
  fractions: `Working with fractions:

Addition: 1/3 + 2/5 = 5/15 + 6/15 = 11/15
Multiplication: 2/3 × 4/5 = 8/15
Division: 3/4 ÷ 2/3 = 3/4 × 3/2 = 9/8

Converting to decimals:
1/2 = 0.5
1/3 ≈ 0.333...
3/4 = 0.75`,

  // Explicit LaTeX examples
  latex_examples: `Using explicit LaTeX notation:

Inline math: The formula $E = mc^2$ shows mass-energy equivalence.

Display math:
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

Matrix:
$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$

Summation:
$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$`
};

/**
 * Test the math rendering with a specific example
 * @param {string} exampleKey - Key from mathExamples object
 * @returns {string} The example content
 */
export function getMathExample(exampleKey) {
  return mathExamples[exampleKey] || mathExamples.pythagorean_ru;
}

/**
 * Get all available math examples
 * @returns {Object} All math examples with their keys
 */
export function getAllMathExamples() {
  return mathExamples;
}

/**
 * Get a random math example for testing
 * @returns {string} Random example content
 */
export function getRandomMathExample() {
  const keys = Object.keys(mathExamples);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return mathExamples[randomKey];
}
