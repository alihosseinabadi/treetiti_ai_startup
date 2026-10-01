@echo off
REM FindII demo server: landing + mini app + board on http://127.0.0.1:8101
cd /d "C:\Users\ali hosseinabadi\our_company\treetiti_partners\findii"
start "FindII demo (8101)" python -m uvicorn demo_server:app --host 127.0.0.1 --port 8101
timeout /t 6 /nobreak >nul
start http://127.0.0.1:8101/landing
echo FindII demo running. Close the "FindII demo" window to stop it.
