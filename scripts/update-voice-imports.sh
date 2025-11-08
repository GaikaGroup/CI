#!/bin/bash

# Script to update voiceServices imports to new voice module structure

echo "Updating voice service imports..."

# Find all files that import from voiceServices
files=$(grep -rl "from.*voiceServices" src/ tests/ --include="*.js" --include="*.svelte" 2>/dev/null)

count=0
for file in $files; do
  # Skip the old voiceServices.js itself
  if [[ "$file" == *"voiceServices.js" ]]; then
    continue
  fi
  
  echo "Updating: $file"
  
  # Replace imports
  sed -i.bak \
    -e "s|from '\$lib/modules/chat/voiceServices'|from '\$lib/modules/chat/voice'|g" \
    -e "s|from '../voiceServices'|from '../voice'|g" \
    -e "s|from './voiceServices'|from './voice'|g" \
    -e "s|from './voiceServices.js'|from './voice/index.js'|g" \
    -e "s|from '../voiceServices.js'|from '../voice/index.js'|g" \
    "$file"
  
  # Remove backup file
  rm -f "${file}.bak"
  
  ((count++))
done

echo "Updated $count files"
echo "Done!"
