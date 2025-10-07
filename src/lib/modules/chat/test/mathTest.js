/**
 * Test mathematical formula rendering
 */

export const testMathFormulas = () => {
  const testCases = [
    {
      input: '\\int x^2 dx = \\frac{x^3}{3} + C',
      expected: 'Should render integral with fraction'
    },
    {
      input:
        'Пусть дано уравнение: \\int x^2 dx = \\frac{x^3}{3} + C\\, где C - произвольная постоянная.',
      expected: 'Should render equation with explanation'
    },
    {
      input:
        'Для решения этого уравнения с интегралом, нужно взять неопределенный интеграл от (x^2), что даст нам \\frac{x^3}{3} (по формуле интегрирования степенной функции) и добавить произвольную постоянную C.',
      expected: 'Should render inline math in text'
    },
    {
      input: 'Таким образом, решение уравнения \\int x^2 dx равно \\frac{x^3}{3} + C.',
      expected: 'Should render multiple math expressions'
    }
  ];

  console.log('Testing mathematical formula rendering:');
  testCases.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.input}`);
    console.log(`Expected: ${test.expected}`);
    console.log('---');
  });

  return testCases;
};

export const sampleMathResponse = `Для решения уравнений с интегралами можно использовать методы дифференцирования и интегрирования, а также определенные свойства интегралов. Приведу пример уравнения с интегралами и его решение:

Пусть дано уравнение: \\int x^2 dx = \\frac{x^3}{3} + C\\, где C - произвольная постоянная.

Для решения этого уравнения с интегралом, нужно взять неопределенный интеграл от (x^2), что даст нам \\frac{x^3}{3} (по формуле интегрирования степенной функции) и добавить произвольную постоянную C.

Таким образом, решение уравнения \\int x^2 dx равно \\frac{x^3}{3} + C.

Если у тебя есть конкретное уравнение с интегралами, которое ты хотел(а) бы разобрать, пожалуйста, предоставь его для дальнейшего обсуждения.`;
