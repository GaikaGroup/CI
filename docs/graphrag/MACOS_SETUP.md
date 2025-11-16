# macOS Setup Guide for Local Embeddings

## Issue: Externally-Managed Python Environment

macOS (especially with Homebrew Python) now uses "externally-managed" Python environments, which prevents installing packages globally with `pip3 install`.

## Solution: Use Virtual Environment

### Option 1: Automated Setup (Recommended)

The setup script now handles this automatically:

```bash
npm run graphrag:setup-local
# Choose option 2 (Sentence-Transformers)
# Script will create .venv automatically
```

### Option 2: Manual Setup

#### Step 1: Create Virtual Environment

```bash
# In your project directory
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Your prompt should now show (.venv)
```

#### Step 2: Install Sentence-Transformers

```bash
# Now pip works without issues
pip install sentence-transformers torch

# Test installation
python << 'EOF'
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embedding = model.encode("test")
print(f"✓ Working! Dimensions: {len(embedding)}")
EOF
```

#### Step 3: Configure Application

```bash
# Add to .env
cat >> .env << 'EOF'

# Sentence-Transformers Local Embeddings
EMBEDDING_PROVIDER="sentence-transformers"
EMBEDDING_MODEL="all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS="384"
PYTHON_PATH=".venv/bin/python"
EOF
```

#### Step 4: Update Database Schema

Edit `prisma/schema.prisma`:

```prisma
model KnowledgeGraphNode {
  // Change from vector(1536) to vector(384)
  embedding  Unsupported("vector(384)")?
  // ... rest of model
}
```

```bash
# Create migration
npx prisma migrate dev --name update_to_384_dimensions

# Generate client
npx prisma generate
```

#### Step 5: Start Application

```bash
# Make sure venv is activated
source .venv/bin/activate

# Start app
npm run dev
```

### Option 3: Use Ollama Instead (Easier!)

If you don't want to deal with Python virtual environments, **use Ollama** - it's much simpler:

```bash
# 1. Install Ollama (one command)
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull model
ollama pull nomic-embed-text

# 3. Configure
cat >> .env << 'EOF'

# Ollama Local Embeddings
EMBEDDING_PROVIDER="ollama"
EMBEDDING_MODEL="nomic-embed-text"
EMBEDDING_DIMENSIONS="768"
OLLAMA_HOST="http://localhost:11434"
EOF

# 4. Update schema to vector(768)
# Edit prisma/schema.prisma

# 5. Migrate
npx prisma migrate dev --name update_to_768_dimensions

# 6. Start
npm run dev
```

**Ollama is recommended for macOS users!** No Python issues, easier setup.

---

## Comparison for macOS

| Method                    | Setup Difficulty   | Python Issues       | Quality    |
| ------------------------- | ------------------ | ------------------- | ---------- |
| **Ollama**                | ✅ Easy (5 min)    | ❌ No Python needed | ⭐⭐⭐⭐   |
| **Sentence-Transformers** | 🔧 Medium (15 min) | ⚠️ Requires venv    | ⭐⭐⭐⭐   |
| **OpenAI**                | ✅ Easy (2 min)    | ❌ No Python needed | ⭐⭐⭐⭐⭐ |

---

## Troubleshooting

### Error: "externally-managed-environment"

**Solution**: Use virtual environment (see above) or use Ollama instead.

### Error: "No module named 'sentence_transformers'"

**Solution**: Make sure virtual environment is activated:

```bash
source .venv/bin/activate
python -c "import sentence_transformers; print('OK')"
```

### Error: "Python not found"

**Solution**: Install Python via Homebrew:

```bash
brew install python@3.11
```

### Virtual Environment Not Activating

**Solution**: Use full path:

```bash
# Instead of: source .venv/bin/activate
# Use:
source $(pwd)/.venv/bin/activate
```

---

## Recommended Approach for macOS

### For Simplicity: Use Ollama

```bash
# Total time: 5 minutes
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text

# Configure
echo 'EMBEDDING_PROVIDER="ollama"' >> .env
echo 'EMBEDDING_MODEL="nomic-embed-text"' >> .env
echo 'EMBEDDING_DIMENSIONS="768"' >> .env

# Update schema, migrate, done!
```

### For Best Quality: Use Sentence-Transformers with venv

```bash
# Total time: 15 minutes
python3 -m venv .venv
source .venv/bin/activate
pip install sentence-transformers torch

# Configure
echo 'EMBEDDING_PROVIDER="sentence-transformers"' >> .env
echo 'EMBEDDING_MODEL="all-MiniLM-L6-v2"' >> .env
echo 'EMBEDDING_DIMENSIONS="384"' >> .env
echo 'PYTHON_PATH=".venv/bin/python"' >> .env

# Update schema, migrate, done!
```

### For Easiest (but paid): Use OpenAI

```bash
# Total time: 2 minutes
echo 'OPENAI_API_KEY="sk-..."' >> .env
echo 'EMBEDDING_PROVIDER="openai"' >> .env

# Done! (costs $18.75 for 3,000 pages)
```

---

## My Recommendation for You

Based on your macOS setup, I recommend **Ollama**:

1. ✅ No Python virtual environment issues
2. ✅ 5 minute setup
3. ✅ Zero cost
4. ✅ Good quality (87% of OpenAI)
5. ✅ Easy to maintain

**Setup command:**

```bash
curl -fsSL https://ollama.com/install.sh | sh && \
ollama pull nomic-embed-text && \
echo -e "\nEMBEDDING_PROVIDER=\"ollama\"\nEMBEDDING_MODEL=\"nomic-embed-text\"\nEMBEDDING_DIMENSIONS=\"768\"" >> .env
```

Then update your Prisma schema to `vector(768)` and run migrations.

---

## Virtual Environment Best Practices

If you choose Sentence-Transformers:

### Always Activate Before Running

```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
alias activate-ai-tutor='cd /path/to/project && source .venv/bin/activate'

# Then just run:
activate-ai-tutor
npm run dev
```

### Auto-Activate with direnv

```bash
# Install direnv
brew install direnv

# Add to ~/.zshrc
eval "$(direnv hook zsh)"

# Create .envrc in project
echo 'source .venv/bin/activate' > .envrc
direnv allow

# Now venv activates automatically when you cd into project!
```

---

## Summary

**You have 3 options on macOS:**

1. **Ollama** (recommended) - No Python issues, easy setup
2. **Sentence-Transformers** - Best quality, requires venv
3. **OpenAI** - Easiest, but costs $18.75

**For your scenario (3,000 pages), I strongly recommend Ollama** - it avoids all Python complexity and costs $0.
