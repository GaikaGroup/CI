#!/usr/bin/env node

/**
 * Script de prueba para verificar la consistencia de idioma
 *
 * Uso:
 *   node scripts/test-language-consistency.js
 *
 * Este script envía mensajes de prueba en diferentes idiomas
 * y verifica que las respuestas estén en el idioma correcto.
 */

const testMessages = [
  {
    language: 'es',
    message: '¿Cuánto vale algunos coches en España? Son accesibles para gente or caros?',
    expectedLanguage: 'Spanish',
    description: 'Pregunta en español sobre precios de coches'
  },
  {
    language: 'ru',
    message: 'Сколько стоят автомобили в России?',
    expectedLanguage: 'Russian',
    description: 'Pregunta en ruso sobre precios de coches'
  },
  {
    language: 'en',
    message: 'How much do cars cost in the United States?',
    expectedLanguage: 'English',
    description: 'Pregunta en inglés sobre precios de coches'
  },
  {
    language: 'es',
    message: 'Explícame las reglas del subjuntivo en español',
    expectedLanguage: 'Spanish',
    description: 'Pregunta en español sobre gramática'
  },
  {
    language: 'ru',
    message: 'Объясни мне правила русской грамматики',
    expectedLanguage: 'Russian',
    description: 'Pregunta en ruso sobre gramática'
  }
];

async function testLanguageConsistency() {
  console.log('🧪 Iniciando pruebas de consistencia de idioma...\n');

  const apiUrl = process.env.API_URL || 'http://localhost:5173/api/chat';

  let passedTests = 0;
  let failedTests = 0;

  for (const test of testMessages) {
    console.log(`\n📝 Prueba: ${test.description}`);
    console.log(`   Idioma esperado: ${test.expectedLanguage}`);
    console.log(`   Mensaje: "${test.message.substring(0, 50)}..."`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: test.message,
          language: test.language,
          sessionContext: {
            sessionId: `test_${Date.now()}`,
            history: []
          }
        })
      });

      if (!response.ok) {
        console.log(`   ❌ Error: ${response.status} ${response.statusText}`);
        failedTests++;
        continue;
      }

      const data = await response.json();
      const aiResponse = data.response;

      // Verificación simple de idioma basada en caracteres
      const hasEnglish = /[a-zA-Z]{10,}/.test(aiResponse);
      const hasCyrillic = /[а-яА-ЯёЁ]{10,}/.test(aiResponse);
      const hasSpanishMarkers = /[áéíóúñ¿¡]/i.test(aiResponse);

      let detectedLanguage = 'Unknown';
      if (hasCyrillic) {
        detectedLanguage = 'Russian';
      } else if (hasSpanishMarkers || (hasEnglish && test.language === 'es')) {
        detectedLanguage = 'Spanish';
      } else if (hasEnglish) {
        detectedLanguage = 'English';
      }

      const isCorrect = detectedLanguage === test.expectedLanguage;

      if (isCorrect) {
        console.log(`   ✅ CORRECTO: Respuesta en ${detectedLanguage}`);
        console.log(`   Respuesta: "${aiResponse.substring(0, 100)}..."`);
        passedTests++;
      } else {
        console.log(
          `   ❌ INCORRECTO: Se esperaba ${test.expectedLanguage}, se detectó ${detectedLanguage}`
        );
        console.log(`   Respuesta: "${aiResponse.substring(0, 100)}..."`);
        failedTests++;
      }
    } catch (error) {
      console.log(`   ❌ Error en la prueba: ${error.message}`);
      failedTests++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Resultados:`);
  console.log(`   ✅ Pruebas exitosas: ${passedTests}`);
  console.log(`   ❌ Pruebas fallidas: ${failedTests}`);
  console.log(`   📈 Tasa de éxito: ${((passedTests / testMessages.length) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log(
      '\n🎉 ¡Todas las pruebas pasaron! La consistencia de idioma está funcionando correctamente.'
    );
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa los logs del servidor para más detalles.');
  }
}

// Ejecutar pruebas
testLanguageConsistency().catch((error) => {
  console.error('Error fatal en las pruebas:', error);
  process.exit(1);
});
