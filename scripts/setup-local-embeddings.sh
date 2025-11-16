#!/bin/bash

# Setup Local Embeddings
# Helps you choose and install a local embedding provider

set -e

echo "================================================"
echo "Local Embeddings Setup"
echo "================================================"
echo ""
echo "Choose your embedding provider:"
echo ""
echo "1) Ollama (Easiest - Recommended)"
echo "   - One command install"
echo "   - No Python needed"
echo "   - ~500MB download"
echo ""
echo "2) Sentence-Transformers (Best Quality)"
echo "   - Requires Python 3.8+"
echo "   - Best quality/performance ratio"
echo "   - ~500MB download"
echo ""
echo "3) Keep OpenAI (Paid)"
echo "   - No setup needed"
echo "   - Best quality"
echo "   - $0.02 per 1M tokens"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo ""
    echo "Installing Ollama..."
    echo ""
    
    # Check if Ollama is already installed
    if command -v ollama &> /dev/null; then
      echo "✓ Ollama already installed"
    else
      echo "Installing Ollama..."
      curl -fsSL https://ollama.com/install.sh | sh
    fi
    
    echo ""
    echo "Pulling embedding model (nomic-embed-text)..."
    ollama pull nomic-embed-text
    
    echo ""
    echo "Testing Ollama..."
    if curl -s http://localhost:11434/api/embeddings \
      -d '{"model":"nomic-embed-text","prompt":"test"}' | grep -q "embedding"; then
      echo "✓ Ollama working correctly"
    else
      echo "⚠ Ollama may not be running. Start with: ollama serve"
    fi
    
    echo ""
    echo "Updating .env configuration..."
    cat >> .env << 'EOF'

# Ollama Local Embeddings
EMBEDDING_PROVIDER="ollama"
EMBEDDING_MODEL="nomic-embed-text"
EMBEDDING_DIMENSIONS="768"
OLLAMA_HOST="http://localhost:11434"
EOF
    
    echo ""
    echo "✓ Ollama setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Ensure Ollama is running: ollama serve"
    echo "2. Update Prisma schema to use vector(768)"
    echo "3. Run: npx prisma migrate dev"
    echo "4. Start app: npm run dev"
    ;;
    
  2)
    echo ""
    echo "Setting up Sentence-Transformers..."
    echo ""
    
    # Check Python version
    if ! command -v python3 &> /dev/null; then
      echo "❌ Python 3 not found. Please install Python 3.8+ first."
      exit 1
    fi
    
    python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    echo "✓ Found Python $python_version"
    
    echo ""
    echo "Installing sentence-transformers..."
    
    # Check if we need to use virtual environment (macOS with externally-managed Python)
    if pip3 install --help 2>&1 | grep -q "break-system-packages"; then
      echo "Detected externally-managed Python environment"
      echo "Creating virtual environment..."
      
      # Create venv in project directory
      python3 -m venv .venv
      source .venv/bin/activate
      
      # Install in venv
      pip install sentence-transformers torch
      
      echo ""
      echo "✓ Virtual environment created at .venv"
      echo "  To activate: source .venv/bin/activate"
    else
      # Older Python or Linux - install normally
      pip3 install sentence-transformers torch
    fi
    
    echo ""
    echo "Testing installation..."
    
    # Use venv python if it exists
    if [ -f ".venv/bin/python" ]; then
      PYTHON_CMD=".venv/bin/python"
    else
      PYTHON_CMD="python3"
    fi
    
    $PYTHON_CMD << 'EOF'
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embedding = model.encode("test")
print(f"✓ Sentence-Transformers working! Dimensions: {len(embedding)}")
EOF
    
    echo ""
    echo "Updating .env configuration..."
    
    # Set Python path based on whether venv was created
    if [ -f ".venv/bin/python" ]; then
      PYTHON_PATH_VALUE=".venv/bin/python"
    else
      PYTHON_PATH_VALUE="python3"
    fi
    
    cat >> .env << EOF

# Sentence-Transformers Local Embeddings
EMBEDDING_PROVIDER="sentence-transformers"
EMBEDDING_MODEL="all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS="384"
PYTHON_PATH="$PYTHON_PATH_VALUE"
EOF
    
    echo ""
    echo "✓ Sentence-Transformers setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Update Prisma schema to use vector(384)"
    echo "2. Run: npx prisma migrate dev"
    echo "3. Start app: npm run dev"
    ;;
    
  3)
    echo ""
    echo "Keeping OpenAI configuration..."
    echo ""
    echo "Make sure you have:"
    echo "1. OPENAI_API_KEY set in .env"
    echo "2. EMBEDDING_PROVIDER=\"openai\" (or not set)"
    echo ""
    echo "Current cost: $0.02 per 1M tokens"
    echo "For 3,000 pages: ~$18.75 one-time"
    ;;
    
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "================================================"
echo "Setup complete!"
echo "================================================"
