#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p temp
mkdir -p instance

# Run database migrations if needed
# flask db upgrade

echo "Build completed successfully!"