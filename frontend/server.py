import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BACKEND = os.environ.get("BACKEND_URL", "http://localhost:8081")

with open("index.html", encoding="utf-8") as archivo:
    HTML_BYTES = archivo.read().encode("utf-8")

with open("styles.css", encoding="utf-8") as archivo:
    CSS_BYTES = archivo.read().encode("utf-8")

with open("app.js", encoding="utf-8") as archivo:
    JS_BYTES = archivo.read().replace("__BACKEND_URL__", BACKEND).encode("utf-8")


class Frontend(BaseHTTPRequestHandler):
    def do_GET(self):
        ruta = self.path.split("?")[0]
        if ruta in ("/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(HTML_BYTES)))
            self.end_headers()
            self.wfile.write(HTML_BYTES)
        elif ruta == "/styles.css":
            self.send_response(200)
            self.send_header("Content-Type", "text/css; charset=utf-8")
            self.send_header("Content-Length", str(len(CSS_BYTES)))
            self.end_headers()
            self.wfile.write(CSS_BYTES)
        elif ruta == "/app.js":
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(JS_BYTES)))
            self.end_headers()
            self.wfile.write(JS_BYTES)
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"Not Found")

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("", int(os.environ.get("PORT", 8080))), Frontend).serve_forever()
