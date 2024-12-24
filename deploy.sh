#!/bin/bash

# Check if commit message was provided
if [ -z "$1" ]
then
    echo "Please provide a commit message"
    echo "Usage: ./deploy.sh \"Your commit message\""
    exit 1
fi

# Add all changes
git add .

# Commit with the provided message
git commit -m "$1"

# Force push to GitHub
echo "Force pushing to GitHub..."
git push origin main --force

# Force push to Heroku EU server
echo "Force pushing to Heroku EU server..."
git push heroku main --force

# Show Heroku logs after deployment
echo "Showing Heroku logs..."
heroku logs --tail --app tetris-light-lt

echo "Deployment complete! Press Ctrl+C to stop viewing logs"
