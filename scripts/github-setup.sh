#!/bin/bash

# GitHub repository setup script
# Repository: dental-office-ai

echo "🔗 Setting up GitHub remote..."

# Add remote origin
git remote add origin https://github.com/scherkao31/dental-office-ai.git

# Verify remote was added
echo "📍 Remote configuration:"
git remote -v

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo "✅ Repository pushed to GitHub successfully!"