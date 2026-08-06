@echo off
echo Installing resend just in case...
call npm install resend

echo Pulling latest changes from GitHub to fix the conflict...
call git pull origin merged-deploy

echo Adding all changes...
call git add .

echo Committing...
call git commit -m "Fix UI issues and install resend"

echo Pushing to GitHub...
call git push origin merged-deploy

echo Done! Check your Vercel dashboard.
pause
