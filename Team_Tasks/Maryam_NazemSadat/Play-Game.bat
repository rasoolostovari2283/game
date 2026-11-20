@echo off
title Neon Highway: Traffic Racer
echo ===================================================
echo     Neon Highway: Traffic Racer (Game Dev Project)
echo ===================================================
echo Starting game...
if exist "dist\NeonHighway-win32-x64\NeonHighway.exe" (
    start "" "dist\NeonHighway-win32-x64\NeonHighway.exe"
) else (
    start "" "NeonHighway.exe"
)
exit
