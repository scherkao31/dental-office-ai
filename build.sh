#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p temp
mkdir -p instance

# Initialize database
echo "Initializing database..."
python -c "from app import create_app, db; app = create_app('production'); app.app_context().push(); db.create_all(); print('Database tables created successfully!')"

echo "Build completed successfully!"