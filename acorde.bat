@echo off
if "%~1"=="" (
    echo Uso: acorde ^<digitacion^>
    echo Ejemplo: acorde x5555x
    exit /b 1
)
npm run analyze:frets -- %~1
