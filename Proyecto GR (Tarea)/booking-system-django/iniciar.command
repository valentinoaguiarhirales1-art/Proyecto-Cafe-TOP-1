#!/bin/bash
# Lanzador para macOS/Linux. Doble clic en Mac (o: bash iniciar.command)
cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "Necesitas instalar Python 3 desde https://www.python.org/downloads/"
  read -r -p "Pulsa Enter para salir"
  exit 1
fi

if [ ! -x venv_mac/bin/python ]; then
  python3 -m venv venv_mac || exit 1
  venv_mac/bin/python -m pip install -r requirements.txt || exit 1
fi

venv_mac/bin/python manage.py migrate --noinput
venv_mac/bin/python manage.py seed_demo
(sleep 3; open "http://127.0.0.1:8000/" 2>/dev/null || xdg-open "http://127.0.0.1:8000/" 2>/dev/null) &
venv_mac/bin/python manage.py runserver 127.0.0.1:8000
