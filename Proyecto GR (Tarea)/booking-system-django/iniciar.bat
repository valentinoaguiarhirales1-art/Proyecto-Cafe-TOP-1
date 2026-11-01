@echo off
cd /d "%~dp0"
if not exist venv\Scripts\python.exe (
  python -m venv venv
  venv\Scripts\python.exe -m pip install -r requirements.txt
)
venv\Scripts\python.exe manage.py migrate --noinput
venv\Scripts\python.exe manage.py seed_demo
start "" /min cmd /c "timeout /t 3 >nul & start chrome http://127.0.0.1:8000/ || start http://127.0.0.1:8000/"
venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
