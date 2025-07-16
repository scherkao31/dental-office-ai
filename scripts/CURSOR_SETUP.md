# Cursor AI Auto-Commit Setup

This guide helps you set up a keyboard shortcut in Cursor to automatically stage, generate commit messages, and commit your changes.

## 🚀 Quick Setup

### 1. Add the Script to Your Path

```bash
# Option A: Create a symlink in /usr/local/bin
sudo ln -s $(pwd)/scripts/cursor-commit.sh /usr/local/bin/cursor-commit

# Option B: Add to your shell profile
echo "alias cursor-commit='$(pwd)/scripts/cursor-commit.sh'" >> ~/.zshrc
source ~/.zshrc
```

### 2. Configure Cursor Keyboard Shortcut

1. Open Cursor
2. Go to **Preferences** → **Keyboard Shortcuts** (or press `Cmd+K` then `Cmd+S`)
3. Search for "Terminal: Run Selected Text In Active Terminal"
4. Click on it and add a keybinding (suggested: `Control+Command+C`)
5. Create a new file called `.cursor-shortcuts` in your project root:

```bash
cursor-commit
```

### 3. Usage

1. Make some changes to your code
2. Select the text `cursor-commit` in the `.cursor-shortcuts` file
3. Press your keyboard shortcut (`Cmd+Shift+G`)
4. The script will automatically:
   - Stage all changes
   - Generate a smart commit message
   - Create the commit
   - Show you what was committed

## 🎯 Alternative: Global Cursor Command

You can also set up a global command:

1. In Cursor, open Command Palette (`Cmd+Shift+P`)
2. Type "Shell Command: Install 'code' command in PATH"
3. Create a custom task in `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Auto Commit",
      "type": "shell",
      "command": "${workspaceFolder}/scripts/cursor-commit.sh",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": []
    }
  ]
}
```

Then use `Cmd+Shift+B` to run the task.

## 📝 What the Script Does

- **Single file changes**: Creates specific messages like "Update patient.py in app/models"
- **Multiple file changes**: Summarizes like "Update app: 3 modified, 1 added"
- **Adds timestamps**: Each commit includes time for easy checkpoint tracking
- **Smart categorization**: Identifies if changes are in app, frontend, or templates

## 🛠️ Customization

Edit `scripts/cursor-commit.sh` to customize:
- Commit message format
- File categorization rules
- Timestamp format
- Auto-push after commit (add `git push` at the end)

## 💡 Pro Tips

1. **Quick Checkpoints**: Use this after each logical change for easy rollback
2. **Review History**: Use `git log --oneline -10` to see your checkpoint history
3. **Undo Last Commit**: `git reset --soft HEAD~1` to undo but keep changes
4. **Push Periodically**: Set up auto-push by adding to the script:
   ```bash
   # Add at the end of cursor-commit.sh
   git push origin main 2>/dev/null && echo "↑ Pushed to remote"
   ```