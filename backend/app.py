# API del muro de mensajería: listar y publicar, guardando en Firestore.
import os, uuid
from flask import Flask, request, jsonify, Response
from google.cloud import firestore

app = Flask(__name__)
db = firestore.Client(database=os.environ.get("BASE_DATOS", "(default)"))
INSTANCIA = uuid.uuid4().hex[:6]


@app.before_request
def manejar_preflight():
    if request.method == "OPTIONS":
        res = Response()
        res.headers["Access-Control-Allow-Origin"] = os.environ.get("ORIGEN_PERMITIDO", "*")
        res.headers["Access-Control-Allow-Headers"] = "Content-Type"
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return res


@app.after_request
def permitir_navegador(respuesta):
    respuesta.headers["Access-Control-Allow-Origin"] = os.environ.get("ORIGEN_PERMITIDO", "*")
    respuesta.headers["Access-Control-Allow-Headers"] = "Content-Type"
    respuesta.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return respuesta


@app.get("/")
def salud():
    return "ok"


@app.get("/mensajes")
def listar():
    consulta = (db.collection("mensajes")
                  .order_by("creado", direction=firestore.Query.DESCENDING)
                  .limit(20))
    mensajes = [
        {
            "id": d.id,
            "autor": d.get("autor"),
            "texto": d.get("texto"),
            "reacciones": d.get("reacciones") or {}
        }
        for d in consulta.stream()
    ]
    return jsonify(instancia=INSTANCIA, mensajes=mensajes)


@app.post("/mensajes")
def crear():
    datos = request.get_json(silent=True) or {}
    autor = str(datos.get("autor", "")).strip()[:40]
    texto = str(datos.get("texto", "")).strip()[:280]
    if not autor or not texto:
        return jsonify(error="faltan autor o texto"), 400
    db.collection("mensajes").add({
        "autor": autor,
        "texto": texto,
        "creado": firestore.SERVER_TIMESTAMP,
        "reacciones": {},
    })
    return jsonify(ok=True, instancia=INSTANCIA), 201


@app.post("/mensajes/<id_mensaje>/reaccionar")
def reaccionar(id_mensaje):
    datos = request.get_json(silent=True) or {}
    emoji = str(datos.get("emoji", "")).strip()
    if not emoji or len(emoji) > 16 or any(c in emoji for c in [".", "/", "\\", "[", "]", "*", "`"]):
        return jsonify(error="emoji inválido"), 400

    doc_ref = db.collection("mensajes").document(id_mensaje)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify(error="mensaje no encontrado"), 404

    try:
        doc_ref.update({f"reacciones.{emoji}": firestore.Increment(1)})
    except Exception:
        doc_ref.set({"reacciones": {emoji: 1}}, merge=True)

    return jsonify(ok=True, instancia=INSTANCIA), 200
