#!/bin/bash

# Cursor AI Auto-Commit Script
# This script stages all changes, generates a commit message, and commits
# Can be used as a Cursor shortcut for quick checkpoints

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🤖 Cursor Quick Commit${NC}"

# Check if there are changes
if [[ -z $(git status -s) ]]; then
    echo "No changes to commit"
    exit 0
fi

# Stage all changes
git add -A

# Get change statistics
STATS=$(git diff --cached --stat --stat-width=50)
FILES_CHANGED=$(git diff --cached --numstat | wc -l | tr -d ' ')

# Generate smart commit message
if [ "$FILES_CHANGED" -eq 1 ]; then
    # Single file change - be specific
    FILE=$(git diff --cached --name-only)
    
    # Determine action based on file status
    if git diff --cached --name-status | grep -q "^A"; then
        ACTION="Add"
    elif git diff --cached --name-status | grep -q "^D"; then
        ACTION="Remove"
    else
        ACTION="Update"
    fi
    
    # Extract meaningful part of filename
    BASENAME=$(basename "$FILE")
    DIRNAME=$(dirname "$FILE")
    
    if [ "$DIRNAME" != "." ]; then
        COMMIT_MSG="$ACTION $BASENAME in $DIRNAME"
    else
        COMMIT_MSG="$ACTION $BASENAME"
    fi
else
    # Multiple files - summarize by type
    ADDED=$(git diff --cached --name-only --diff-filter=A | wc -l | tr -d ' ')
    MODIFIED=$(git diff --cached --name-only --diff-filter=M | wc -l | tr -d ' ')
    DELETED=$(git diff --cached --name-only --diff-filter=D | wc -l | tr -d ' ')
    
    PARTS=()
    [ $ADDED -gt 0 ] && PARTS+=("$ADDED added")
    [ $MODIFIED -gt 0 ] && PARTS+=("$MODIFIED modified")
    [ $DELETED -gt 0 ] && PARTS+=("$DELETED deleted")
    
    # Check for common patterns
    if git diff --cached --name-only | grep -q "^app/"; then
        AREA="app"
    elif git diff --cached --name-only | grep -q "^static/"; then
        AREA="frontend"
    elif git diff --cached --name-only | grep -q "^templates/"; then
        AREA="templates"
    else
        AREA="project"
    fi
    
    COMMIT_MSG="Update $AREA: ${PARTS[*]}"
fi

# Add timestamp for checkpoint tracking
TIMESTAMP=$(date +"%H:%M")
COMMIT_MSG="$COMMIT_MSG [$TIMESTAMP]"

# Commit with generated message
git commit -m "$COMMIT_MSG" --quiet

# Show result
echo -e "${GREEN}✓ Committed:${NC} $COMMIT_MSG"
echo -e "${YELLOW}Stats:${NC}"
echo "$STATS"