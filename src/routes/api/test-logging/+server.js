import { json } from '@sveltejs/kit';

export async function GET() {
  console.log('🔥🔥🔥 TEST LOGGING ENDPOINT HIT 🔥🔥🔥');
  console.log('Timestamp:', new Date().toISOString());
  console.log('If you see this, logging is working!');

  return json({
    success: true,
    message: 'Logging test successful',
    timestamp: new Date().toISOString()
  });
}
