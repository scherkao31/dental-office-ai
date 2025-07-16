#!/bin/bash

# Auto-commit script with AI-generated commit messages
# Usage: ./scripts/auto-commit.sh

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🤖 Auto-Commit Assistant${NC}"
echo "========================"

# Check if there are changes to commit
if [[ -z $(git status -s) ]]; then
    echo -e "${RED}No changes to commit!${NC}"
    exit 0
fi

# Show current status
echo -e "\n${YELLOW}📋 Current changes:${NC}"
git status -s

# Stage all changes
echo -e "\n${YELLOW}📦 Staging all changes...${NC}"
git add -A

# Generate commit message based on changes
echo -e "\n${YELLOW}🎯 Analyzing changes...${NC}"

# Get the list of changed files
CHANGED_FILES=$(git diff --cached --name-only)
STATS=$(git diff --cached --stat)

# Count changes by type
ADDED=$(git diff --cached --name-only --diff-filter=A | wc -l | tr -d ' ')
MODIFIED=$(git diff --cached --name-only --diff-filter=M | wc -l | tr -d ' ')
DELETED=$(git diff --cached --name-only --diff-filter=D | wc -l | tr -d ' ')

# Generate commit message based on changes
if [ $ADDED -gt 0 ] && [ $MODIFIED -eq 0 ] && [ $DELETED -eq 0 ]; then
    # Only additions
    if [ $ADDED -eq 1 ]; then
        FILE=$(git diff --cached --name-only --diff-filter=A)
        COMMIT_MSG="Add $FILE"
    else
        COMMIT_MSG="Add $ADDED new files"
    fi
elif [ $MODIFIED -gt 0 ] && [ $ADDED -eq 0 ] && [ $DELETED -eq 0 ]; then
    # Only modifications
    if [ $MODIFIED -eq 1 ]; then
        FILE=$(git diff --cached --name-only --diff-filter=M)
        COMMIT_MSG="Update $FILE"
    else
        COMMIT_MSG="Update $MODIFIED files"
    fi
elif [ $DELETED -gt 0 ] && [ $ADDED -eq 0 ] && [ $MODIFIED -eq 0 ]; then
    # Only deletions
    if [ $DELETED -eq 1 ]; then
        FILE=$(git diff --cached --name-only --diff-filter=D)
        COMMIT_MSG="Remove $FILE"
    else
        COMMIT_MSG="Remove $DELETED files"
    fi
else
    # Mixed changes
    PARTS=()
    [ $ADDED -gt 0 ] && PARTS+=("add $ADDED")
    [ $MODIFIED -gt 0 ] && PARTS+=("update $MODIFIED")
    [ $DELETED -gt 0 ] && PARTS+=("remove $DELETED")
    
    # Join parts with commas
    COMMIT_MSG="Changes: "
    for i in "${!PARTS[@]}"; do
        if [ $i -eq 0 ]; then
            COMMIT_MSG+="${PARTS[$i]}"
        else
            COMMIT_MSG+=", ${PARTS[$i]}"
        fi
    done
    COMMIT_MSG+=" files"
fi

# Add details for specific file types
if echo "$CHANGED_FILES" | grep -q "\.py$"; then
    COMMIT_MSG+="\n\n- Python code changes"
fi
if echo "$CHANGED_FILES" | grep -q "\.js$"; then
    COMMIT_MSG+="\n\n- JavaScript updates"
fi
if echo "$CHANGED_FILES" | grep -q "\.css$"; then
    COMMIT_MSG+="\n\n- Style updates"
fi
if echo "$CHANGED_FILES" | grep -q "requirements.*\.txt$"; then
    COMMIT_MSG+="\n\n- Dependency updates"
fi

# Show proposed commit message
echo -e "\n${GREEN}💬 Generated commit message:${NC}"
echo -e "$COMMIT_MSG"

# Ask for confirmation
echo -e "\n${YELLOW}Proceed with commit? (y/n/e to edit):${NC} "
read -r response

case $response in
    [yY])
        # Commit with the generated message
        git commit -m "$(echo -e "$COMMIT_MSG")"
        echo -e "\n${GREEN}✅ Changes committed successfully!${NC}"
        
        # Show the commit
        echo -e "\n${YELLOW}📝 Latest commit:${NC}"
        git log -1 --oneline
        ;;
    [eE])
        # Let user edit the message
        echo -e "\n${YELLOW}Enter your commit message (press Ctrl+D when done):${NC}"
        CUSTOM_MSG=$(cat)
        git commit -m "$CUSTOM_MSG"
        echo -e "\n${GREEN}✅ Changes committed with custom message!${NC}"
        ;;
    *)
        # Cancel
        git reset HEAD .
        echo -e "\n${RED}❌ Commit cancelled. Changes unstaged.${NC}"
        ;;
esac