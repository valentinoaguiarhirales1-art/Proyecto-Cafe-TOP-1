@echo off
rem Arranque rapido: crea el entorno, instala dependencias, migra y abre la web en Chrome.
cd /d "%~dp0"
if not exist .venv (
    python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install -q -r requirements.txt
python manage.py migrate
start "" cmd /c "timeout /t 3 >nul & start chrome http://127.0.0.1:8000/"
python manage.py runserver
