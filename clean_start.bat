@echo off
echo Clearing Next.js cache...
if exist ".next" rd /s /q ".next"
echo Cache cleared!
echo.
echo Starting development server...
npm run dev
