# Script de inicio rápido para Café Exquisito v2.5.0
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Clear-Host

Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host "  ☕ INICIANDO CAFÉ EXQUISITO FULL STACK v2.5.0 ☕" -ForegroundColor DarkYellow
Write-Host "  Entorno local para pruebas" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Yellow

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/2] Arrancando Backend en puerto 5000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\backend'; npm run dev"

Write-Host "[2/2] Arrancando Frontend en puerto 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\frontend'; npm run dev"

Write-Host "`n✨ Servidores lanzados con éxito!" -ForegroundColor Green
Write-Host "👉 Abre en tu navegador: http://localhost:3000" -ForegroundColor White
Write-Host "Crea una cuenta de prueba antes de usar el panel.`n" -ForegroundColor Yellow

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
