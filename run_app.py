import os
import sys
import time
import argparse
import threading
import subprocess
import urllib.request

HOST = "127.0.0.1"
PORT = 8000
BASE_URL = f"http://{HOST}:{PORT}"

def start_backend_server():
    """Runs uvicorn in process."""
    import uvicorn
    from backend.main import app
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")

def wait_for_server(timeout=10):
    """Waits until the backend server is responding."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=1) as res:
                if res.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)
    return False

def run_desktop():
    """Launches the application as a standalone desktop window."""
    print("=" * 60)
    print("  Iniciando Wind Resource Editor (Modo Desktop)")
    print("  Motor de Análise: BrightWind 2.7.0")
    print(f"  URL Local: {BASE_URL}")
    print("=" * 60)

    # Start backend in a background thread
    server_thread = threading.Thread(target=start_backend_server, daemon=True)
    server_thread.start()

    if not wait_for_server():
        print("Erro: Servidor backend demorou muito para iniciar.")
        sys.exit(1)

    print("Backend pronto! Abrindo janela Desktop nativa...")

    try:
        import webview
        # Create a native desktop window
        window = webview.create_window(
            title="Wind Resource Editor — Powered by BrightWind",
            url=BASE_URL,
            width=1320,
            height=880,
            min_size=(1024, 700),
            background_color="#0b0f19"
        )
        webview.start()
    except Exception as e:
        print(f"Aviso ao inicializar janela WebView: {e}")
        print("Abrindo no navegador padrão com modo aplicação...")
        import webbrowser
        webbrowser.open(BASE_URL)

def run_server():
    """Runs only the FastAPI backend server (Web / Intranet / Docker)."""
    print(f"Iniciando servidor Web na porta {PORT}...")
    start_backend_server()

def run_dev():
    """Runs backend and Vite in development mode."""
    print("Iniciando ambiente de desenvolvimento (FastAPI + Vite dev server)...")
    backend_proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"])
    
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir)

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Wind Resource Editor Launcher")
    parser.add_argument("--desktop", action="store_true", help="Launch native desktop GUI window (default)")
    parser.add_argument("--server", action="store_true", help="Launch web backend server only")
    parser.add_argument("--dev", action="store_true", help="Launch Vite dev server + FastAPI reload")

    args = parser.parse_args()

    if args.dev:
        run_dev()
    elif args.server:
        run_server()
    else:
        run_desktop()
