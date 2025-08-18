#!/bin/bash

# Convert line endings to LF for all files not excluded by .gitignore
# Usage: ./convert-to-lf.sh

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT" || exit 1

# Use git ls-files to get all tracked files (respects .gitignore)
# and convert their line endings to LF
git ls-files | while IFS= read -r file; do
    # Check if file exists and is a regular file
    if [ -f "$file" ]; then
        # Convert CRLF to LF using sed
        sed -i 's/\r$//' "$file"
        echo "Converted: $file"
    fi
done

echo "Line ending conversion to LF completed."