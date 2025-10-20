# Local LLM Speed Optimization Guide

## Current Configuration

Your system is now optimized for speed with:
- **Primary Model**: `qwen2.5:1.5b` (fastest, ~3-5x faster than 7B)
- **Fallback Model**: `qwen2.5:7b` (more capable, used if 1.5B fails)
- **Max Tokens**: 200 (shorter responses = faster generation)

## Expected Performance

### Before (qwen2.5:7b)
- Simple questions: ~15 seconds
- Complex questions: ~20-30 seconds

### After (qwen2.5:1.5b)
- Simple questions: ~3-5 seconds ⚡
- Complex questions: ~8-12 seconds ⚡

## Additional Speed Optimizations

### 1. Reduce Max Tokens (Already Applied)
```env
VITE_OLLAMA_MAX_TOKENS=200  # Shorter responses
```

### 2. Lower Temperature (More Focused)
```env
VITE_OLLAMA_TEMPERATURE=0.5  # Less creative, faster
```

### 3. Reduce Context Window (If Needed)
```env
VITE_OLLAMA_NUM_CTX=1024  # Less memory, faster processing
```

### 4. Use GPU Acceleration
If you have a GPU, Ollama will automatically use it. Check with:
```bash
ollama ps
```

### 5. Quantization (Already Optimized)
The 1.5B model is already well-optimized. For even faster:
```bash
# Pull a more quantized version (if available)
ollama pull qwen2.5:1.5b-q4_0
```

## Testing Your Changes

1. **Restart your dev server** to apply .env changes:
```bash
npm run dev
```

2. **Test a simple question** in a new session:
   - Go to http://localhost:3002
   - Ask: "What is 2+2?"
   - Measure response time

3. **Check which model is being used** in browser console:
```
[Ollama] resolved model: qwen2.5:1.5b
```

## Monitoring Performance

### Check Response Times
Use the session analyzer:
```bash
node -e "
import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();
const session = await prisma.session.findFirst({
  where: { userId: 'YOUR_USER_ID' },
  include: { messages: true },
  orderBy: { createdAt: 'desc' }
});
console.log('Messages:', session.messages.length);
await prisma.\$disconnect();
"
```

### Check Ollama Stats
```bash
# See running models and memory usage
ollama ps

# Check model info
ollama show qwen2.5:1.5b
```

## Trade-offs

### qwen2.5:1.5b (Fast)
✅ 3-5x faster responses
✅ Lower memory usage (~2GB)
✅ Good for simple questions
⚠️ Less capable with complex reasoning
⚠️ Shorter context understanding

### qwen2.5:7b (Capable)
✅ Better reasoning and understanding
✅ Longer context handling
✅ More accurate responses
⚠️ Slower (15+ seconds)
⚠️ Higher memory usage (~6GB)

## Recommended Settings by Use Case

### Speed Priority (Current)
```env
VITE_OLLAMA_MODELS=qwen2.5:1.5b,qwen2.5:7b
VITE_OLLAMA_MAX_TOKENS=200
VITE_OLLAMA_TEMPERATURE=0.5
```

### Quality Priority
```env
VITE_OLLAMA_MODELS=qwen2.5:7b,qwen2.5:1.5b
VITE_OLLAMA_MAX_TOKENS=400
VITE_OLLAMA_TEMPERATURE=0.7
```

### Balanced
```env
VITE_OLLAMA_MODELS=qwen2.5:1.5b,qwen2.5:7b
VITE_OLLAMA_MAX_TOKENS=256
VITE_OLLAMA_TEMPERATURE=0.6
```

## Troubleshooting

### Model Not Found
```bash
ollama pull qwen2.5:1.5b
```

### Still Slow
1. Check if GPU is being used: `ollama ps`
2. Close other applications
3. Reduce `VITE_OLLAMA_NUM_CTX` to 1024
4. Try an even smaller model like `qwen2.5:0.5b` (if available)

### Quality Issues
If responses are too short or inaccurate:
1. Increase `VITE_OLLAMA_MAX_TOKENS` to 300
2. Switch back to 7B model for complex questions
3. Enable fallback to OpenAI for critical queries

## Next Steps

1. ✅ Restart dev server
2. Test response times in a new session
3. Compare with previous 15-second baseline
4. Adjust settings based on your needs
