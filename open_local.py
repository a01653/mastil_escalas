from __future__ import annotations

import argparse
import socket
import subprocess
import sys
import time
import shutil
import webbrowser
from pathlib import Path

APP_PATH = "/mastil_escalas/"


def find_free_port(host: str = "127.0.0.1") -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((host, 0))
        return int(sock.getsockname()[1])


def main() -> int:
    parser = argparse.ArgumentParser(description="Arranca la app local en un puerto libre y abre el navegador.")
    parser.add_argument("--host", default="127.0.0.1", help="Host local donde escuchar.")
    parser.add_argument(
        "--mode",
        choices=("dev", "preview"),
        default="preview",
        help="Modo de arranque. 'preview' usa el build ya generado; 'dev' usa Vite dev server.",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent
    host = args.host
    port = find_free_port(host)
    npm_executable = shutil.which("npm.cmd") or shutil.which("npm") or "npm.cmd"

    if args.mode == "preview":
        cmd = [npm_executable, "run", "preview", "--", "--host", host, "--port", str(port), "--strictPort"]
    else:
        cmd = [npm_executable, "run", "dev", "--", "--host", host, "--port", str(port), "--strictPort"]

    proc = subprocess.Popen(cmd, cwd=repo_root)
    url = f"http://{host}:{port}{APP_PATH}"

    try:
        deadline = time.monotonic() + 15.0
        while time.monotonic() < deadline:
            try:
                with socket.create_connection((host, port), timeout=0.5):
                    break
            except OSError:
                time.sleep(0.25)
        print(url, flush=True)
        webbrowser.open(url)
        return proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        return 130
    except Exception:
        proc.terminate()
        raise


if __name__ == "__main__":
    sys.exit(main())
