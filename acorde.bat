@echo off
if "%~1"=="" (
    echo Uso: acorde ^<digitacion^> [--ref ^<acorde^>]
    echo Ejemplos:
    echo   acorde x5555x
    echo   acorde x5555x --ref D7
    echo   acorde 1320xx --ref Fmaj7
    exit /b 1
)
npm run analyze:frets -- %*
