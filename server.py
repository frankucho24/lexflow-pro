import mimetypes
import os
import re
from datetime import datetime
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request, send_from_directory
from flask_cors import CORS
from supabase import create_client
from werkzeug.utils import secure_filename

from database import (
    ESTADOS_AGENDA,
    ESTADOS_ETAPA,
    ESTADOS_EXPEDIENTE,
    TIPOS_ACTUACION,
    TIPOS_EXPEDIENTE,
    hoy,
)

load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")
if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError("Faltan SUPABASE_URL / SUPABASE_SECRET_KEY en el archivo .env")

sb = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "lexflow", "dist")
BUCKET = "documentos"
SIGNED_URL_SECONDS = 3600
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "doc", "docx", "xls", "xlsx", "txt", "zip", "msg"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024

# CORS: permite que el frontend hospedado en otro dominio (ej. Netlify)
# consuma la API. Orígenes permitidos separados por coma en CORS_ORIGINS
# (ej. "https://lexflow.netlify.app"). "*" = cualquier origen (solo desarrollo).
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGINS or "*"}})


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def ahora():
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def campo(datos, nombre, vacio=""):
    valor = (datos.get(nombre) or "")
    valor = valor.strip() if isinstance(valor, str) else valor
    return valor or vacio


def sanitize_like(texto):
    return re.sub(r'[,()%"\'*_\\\[\]]', "", texto or "")


def usuario_actual():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    if not token:
        return None
    try:
        resp = sb.auth.get_user(token)
        return resp.user
    except Exception:
        return None


def requiere_auth(f):
    @wraps(f)
    def decorada(*args, **kwargs):
        if usuario_actual() is None:
            return jsonify({"error": "No autorizado. Inicia sesión."}), 401
        return f(*args, **kwargs)
    return decorada


ROLES = ["admin", "abogado", "secretario"]


def perfil_de(user_id):
    try:
        filas = sb.table("profiles").select("*").eq("id", user_id).limit(1).execute().data
        return filas[0] if filas else None
    except Exception:
        return None


def es_admin(user_id):
    p = perfil_de(user_id)
    return bool(p) and p.get("rol") == "admin"


def requiere_admin(f):
    @wraps(f)
    def decorada(*args, **kwargs):
        user = usuario_actual()
        if user is None:
            return jsonify({"error": "No autorizado. Inicia sesión."}), 401
        if not es_admin(user.id):
            return jsonify({"error": "Acceso restringido. Se requiere rol administrador."}), 403
        return f(*args, **kwargs)
    return decorada


def validar_usuario_admin(datos, exige_password=True):
    email = campo(datos, "email").lower()
    password = datos.get("password") or ""
    nombre = campo(datos, "nombre")
    rol = datos.get("rol") or "abogado"
    if rol not in ROLES:
        rol = "abogado"
    if not email or "@" not in email:
        return None, "Email inválido."
    if exige_password and len(password) < 6:
        return None, "La contraseña debe tener al menos 6 caracteres."
    if password and len(password) < 6:
        return None, "La contraseña debe tener al menos 6 caracteres."
    return {"email": email, "password": password, "nombre": nombre, "rol": rol}, None


def serializar_auth_user(u, perfiles):
    uid = getattr(u, "id", None) or (u.get("id") if isinstance(u, dict) else None)
    email = getattr(u, "email", None) or (u.get("email") if isinstance(u, dict) else None)
    creado = getattr(u, "created_at", None) or (u.get("created_at") if isinstance(u, dict) else None)
    ultimo = getattr(u, "last_sign_in_at", None) or (u.get("last_sign_in_at") if isinstance(u, dict) else None)
    p = perfiles.get(uid, {})
    return {
        "id": uid,
        "email": email,
        "nombre": p.get("nombre") or "",
        "rol": p.get("rol") or "abogado",
        "created_at": str(creado) if creado else None,
        "last_sign_in_at": str(ultimo) if ultimo else None,
    }


def validar_expediente(datos):
    numero = campo(datos, "numero")
    tipo = datos.get("tipo") or ""
    if not numero or tipo not in TIPOS_EXPEDIENTE:
        return None, "El número y el tipo son obligatorios."
    estado = datos.get("estado") or "activo"
    if estado not in ESTADOS_EXPEDIENTE:
        estado = "activo"
    return {
        "numero": numero,
        "tipo": tipo,
        "organo": campo(datos, "organo"),
        "materia": campo(datos, "materia"),
        "cliente": campo(datos, "cliente"),
        "contraparte": campo(datos, "contraparte"),
        "estado": estado,
        "fecha_ingreso": campo(datos, "fecha_ingreso", hoy()),
        "fecha_cierre": campo(datos, "fecha_cierre") or None,
        "descripcion": campo(datos, "descripcion"),
    }, None


def existe_expediente(expediente_id):
    try:
        filas = sb.table("expedientes").select("id").eq("id", expediente_id).limit(1).execute().data
        return len(filas) > 0
    except Exception:
        return False


def aplanar_agenda(filas):
    resultado = []
    for f in filas:
        rel = f.pop("expedientes", None)
        f["numero_expediente"] = (rel or {}).get("numero") if isinstance(rel, dict) else None
        resultado.append(f)
    return resultado


def con_urls_documentos(docs):
    for d in docs:
        d["url"] = None
        try:
            firmado = sb.storage.from_(BUCKET).create_signed_url(d["archivo"], SIGNED_URL_SECONDS)
            d["url"] = firmado.get("signedURL")
        except Exception:
            pass
    return docs


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

@app.get("/api/panel")
@requiere_auth
def api_panel():
    total = sb.table("expedientes").select("id", count="exact").limit(0).execute().count or 0
    judiciales = sb.table("expedientes").select("id", count="exact").eq("tipo", "judicial").limit(0).execute().count or 0
    administrativos = sb.table("expedientes").select("id", count="exact").eq("tipo", "administrativo").limit(0).execute().count or 0
    cerrados = sb.table("expedientes").select("id", count="exact").eq("estado", "cerrado").limit(0).execute().count or 0

    audiencias = sb.table("agenda").select("*, expedientes(numero)").eq("tipo", "audiencia").eq(
        "estado", "pendiente").gte("fecha", hoy()).order("fecha").order("hora").limit(6).execute().data
    vencimientos = sb.table("agenda").select("*, expedientes(numero)").eq("tipo", "vencimiento").eq(
        "estado", "pendiente").gte("fecha", hoy()).order("fecha").limit(6).execute().data
    recientes = sb.table("expedientes").select("*").order("id", desc=True).limit(5).execute().data

    return jsonify({
        "total": total,
        "judiciales": judiciales,
        "administrativos": administrativos,
        "activos": total - cerrados,
        "cerrados": cerrados,
        "proximas_audiencias": aplanar_agenda(audiencias),
        "proximos_vencimientos": aplanar_agenda(vencimientos),
        "recientes": recientes,
    })


@app.get("/api/expedientes")
@requiere_auth
def api_lista_expedientes():
    tipo = request.args.get("tipo", "")
    estado = request.args.get("estado", "")
    busqueda = sanitize_like(request.args.get("q", "").strip())

    q = sb.table("expedientes").select("*")
    if tipo in TIPOS_EXPEDIENTE:
        q = q.eq("tipo", tipo)
    if estado in ESTADOS_EXPEDIENTE:
        q = q.eq("estado", estado)
    if busqueda:
        q = q.or_(f"numero.ilike.*{busqueda}*,cliente.ilike.*{busqueda}*,"
                  f"contraparte.ilike.*{busqueda}*,materia.ilike.*{busqueda}*,organo.ilike.*{busqueda}*")
    filas = q.order("id", desc=True).execute().data

    acts = sb.table("actuaciones").select("expediente_id,fecha,descripcion").order(
        "fecha", desc=True).order("id", desc=True).execute().data
    ult = {}
    for a in acts:
        eid = a["expediente_id"]
        if eid not in ult:
            ult[eid] = f"{a['fecha']} | {a['descripcion']}"
    docs = sb.table("documentos").select("expediente_id,nombre").order("id", desc=True).execute().data
    ultdoc = {}
    for d in docs:
        if d["expediente_id"] not in ultdoc:
            ultdoc[d["expediente_id"]] = d["nombre"]
    for f in filas:
        f["ultima_actuacion"] = ult.get(f["id"])
        f["ultimo_documento"] = ultdoc.get(f["id"])
    return jsonify(filas)


@app.get("/api/expedientes/opciones")
@requiere_auth
def api_expedientes_opciones():
    filas = sb.table("expedientes").select("id,numero,tipo,cliente").order("numero").execute().data
    return jsonify(filas)


@app.post("/api/expedientes")
@requiere_auth
def api_crear_expediente():
    datos = request.get_json(silent=True) or {}
    valores, error = validar_expediente(datos)
    if error:
        return jsonify({"error": error}), 400
    creado = sb.table("expedientes").insert(valores).execute().data
    return jsonify({"id": creado[0]["id"]}), 201


@app.get("/api/expedientes/<int:expediente_id>")
@requiere_auth
def api_detalle_expediente(expediente_id):
    if not existe_expediente(expediente_id):
        abort(404)
    sb.table("expedientes").update({"ultima_consulta": ahora()}).eq("id", expediente_id).execute()
    exp = sb.table("expedientes").select("*").eq("id", expediente_id).limit(1).execute().data[0]
    etapas = sb.table("etapas").select("*").eq("expediente_id", expediente_id).order(
        "fecha_inicio", nullsfirst=True).execute().data
    actuaciones = sb.table("actuaciones").select("*").eq("expediente_id", expediente_id).order(
        "fecha", desc=True).order("id", desc=True).execute().data
    documentos = sb.table("documentos").select("*").eq("expediente_id", expediente_id).order(
        "id", desc=True).execute().data
    agenda = sb.table("agenda").select("*").eq("expediente_id", expediente_id).order(
        "fecha").order("hora").execute().data
    return jsonify({
        "expediente": exp,
        "etapas": etapas,
        "actuaciones": actuaciones,
        "documentos": con_urls_documentos(documentos),
        "agenda": agenda,
    })


@app.put("/api/expedientes/<int:expediente_id>")
@requiere_auth
def api_editar_expediente(expediente_id):
    if not existe_expediente(expediente_id):
        abort(404)
    datos = request.get_json(silent=True) or {}
    valores, error = validar_expediente(datos)
    if error:
        return jsonify({"error": error}), 400
    sb.table("expedientes").update(valores).eq("id", expediente_id).execute()
    return jsonify({"id": expediente_id})


@app.delete("/api/expedientes/<int:expediente_id>")
@requiere_auth
def api_eliminar_expediente(expediente_id):
    if not existe_expediente(expediente_id):
        abort(404)
    docs = sb.table("documentos").select("archivo").eq("expediente_id", expediente_id).execute().data
    rutas = [d["archivo"] for d in docs if d.get("archivo")]
    if rutas:
        try:
            sb.storage.from_(BUCKET).remove(rutas)
        except Exception:
            pass
    sb.table("expedientes").delete().eq("id", expediente_id).execute()
    return jsonify({"ok": True})


@app.post("/api/expedientes/<int:expediente_id>/etapas")
@requiere_auth
def api_agregar_etapa(expediente_id):
    if not existe_expediente(expediente_id):
        abort(404)
    datos = request.get_json(silent=True) or {}
    nombre = campo(datos, "nombre")
    if not nombre:
        return jsonify({"error": "El nombre de la etapa es obligatorio."}), 400
    estado = datos.get("estado") or "pendiente"
    if estado not in ESTADOS_ETAPA:
        estado = "pendiente"
    creado = sb.table("etapas").insert({
        "expediente_id": expediente_id,
        "nombre": nombre,
        "estado": estado,
        "fecha_inicio": campo(datos, "fecha_inicio") or None,
        "fecha_fin": campo(datos, "fecha_fin") or None,
        "notas": campo(datos, "notas"),
    }).execute().data
    return jsonify({"id": creado[0]["id"]}), 201


@app.patch("/api/expedientes/<int:expediente_id>/etapas/<int:etapa_id>")
@requiere_auth
def api_estado_etapa(expediente_id, etapa_id):
    datos = request.get_json(silent=True) or {}
    estado = datos.get("estado") or ""
    if estado not in ESTADOS_ETAPA:
        return jsonify({"error": "Estado inválido."}), 400
    sb.table("etapas").update({"estado": estado}).eq("id", etapa_id).eq(
        "expediente_id", expediente_id).execute()
    return jsonify({"ok": True})


@app.delete("/api/expedientes/<int:expediente_id>/etapas/<int:etapa_id>")
@requiere_auth
def api_eliminar_etapa(expediente_id, etapa_id):
    sb.table("etapas").delete().eq("id", etapa_id).eq("expediente_id", expediente_id).execute()
    return jsonify({"ok": True})


@app.post("/api/expedientes/<int:expediente_id>/actuaciones")
@requiere_auth
def api_agregar_actuacion(expediente_id):
    if not existe_expediente(expediente_id):
        abort(404)
    datos = request.get_json(silent=True) or {}
    descripcion = campo(datos, "descripcion")
    if not descripcion:
        return jsonify({"error": "La descripción es obligatoria."}), 400
    tipo = datos.get("tipo") or "otro"
    if tipo not in TIPOS_ACTUACION:
        tipo = "otro"
    creado = sb.table("actuaciones").insert({
        "expediente_id": expediente_id,
        "fecha": campo(datos, "fecha", hoy()),
        "tipo": tipo,
        "descripcion": descripcion,
        "notas": campo(datos, "notas"),
    }).execute().data
    return jsonify({"id": creado[0]["id"]}), 201


@app.delete("/api/expedientes/<int:expediente_id>/actuaciones/<int:actuacion_id>")
@requiere_auth
def api_eliminar_actuacion(expediente_id, actuacion_id):
    sb.table("actuaciones").delete().eq("id", actuacion_id).eq(
        "expediente_id", expediente_id).execute()
    return jsonify({"ok": True})


@app.post("/api/expedientes/<int:expediente_id>/documentos")
@requiere_auth
def api_subir_documento(expediente_id):
    if not existe_expediente(expediente_id):
        abort(404)
    archivo = request.files.get("archivo")
    if not archivo or not archivo.filename:
        return jsonify({"error": "No se seleccionó ningún archivo."}), 400
    if not ("." in archivo.filename and archivo.filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS):
        return jsonify({"error": "Tipo de archivo no permitido."}), 400

    nombre_original = archivo.filename
    nombre_seguro = secure_filename(nombre_original) or "documento"
    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    ruta = f"exp_{expediente_id}/{stamp}_{nombre_seguro}"
    contenido = archivo.read()
    content_type = mimetypes.guess_type(nombre_original)[0] or "application/octet-stream"
    try:
        sb.storage.from_(BUCKET).upload(ruta, contenido, {"content-type": content_type})
    except Exception as e:
        return jsonify({"error": f"No se pudo subir el archivo: {e}"}), 500

    creado = sb.table("documentos").insert({
        "expediente_id": expediente_id,
        "nombre": nombre_original,
        "archivo": ruta,
        "tipo": campo(request.form.to_dict(), "tipo_documento"),
        "fecha": campo(request.form.to_dict(), "fecha_documento", hoy()),
    }).execute().data
    return jsonify({"id": creado[0]["id"]}), 201


@app.delete("/api/expedientes/<int:expediente_id>/documentos/<int:documento_id>")
@requiere_auth
def api_eliminar_documento(expediente_id, documento_id):
    filas = sb.table("documentos").select("archivo").eq("id", documento_id).eq(
        "expediente_id", expediente_id).limit(1).execute().data
    if filas and filas[0].get("archivo"):
        try:
            sb.storage.from_(BUCKET).remove([filas[0]["archivo"]])
        except Exception:
            pass
    sb.table("documentos").delete().eq("id", documento_id).eq(
        "expediente_id", expediente_id).execute()
    return jsonify({"ok": True})


@app.get("/api/agenda")
@requiere_auth
def api_agenda():
    filtro_tipo = request.args.get("tipo", "")
    filtro_estado = request.args.get("estado", "")
    q = sb.table("agenda").select("*, expedientes(numero)")
    if filtro_tipo in ("audiencia", "vencimiento", "otro"):
        q = q.eq("tipo", filtro_tipo)
    if filtro_estado in ESTADOS_AGENDA:
        q = q.eq("estado", filtro_estado)
    filas = q.order("fecha").order("hora").execute().data
    return jsonify(aplanar_agenda(filas))


def validar_evento(datos):
    titulo = campo(datos, "titulo")
    fecha = campo(datos, "fecha")
    if not titulo or not fecha:
        return None, "El título y la fecha son obligatorios."
    estado = datos.get("estado") or "pendiente"
    if estado not in ESTADOS_AGENDA:
        estado = "pendiente"
    tipo = datos.get("tipo") or "otro"
    if tipo not in ("audiencia", "vencimiento", "otro"):
        tipo = "otro"
    expediente_id = datos.get("expediente_id")
    if expediente_id not in (None, "", "0", 0):
        try:
            expediente_id = int(expediente_id)
            if not existe_expediente(expediente_id):
                expediente_id = None
        except (TypeError, ValueError):
            expediente_id = None
    else:
        expediente_id = None
    return {
        "expediente_id": expediente_id,
        "titulo": titulo,
        "tipo": tipo,
        "fecha": fecha,
        "hora": campo(datos, "hora") or None,
        "estado": estado,
        "notas": campo(datos, "notas"),
    }, None


@app.post("/api/agenda")
@requiere_auth
def api_crear_evento():
    datos = request.get_json(silent=True) or {}
    valores, error = validar_evento(datos)
    if error:
        return jsonify({"error": error}), 400
    creado = sb.table("agenda").insert(valores).execute().data
    return jsonify({"id": creado[0]["id"]}), 201


@app.put("/api/agenda/<int:evento_id>")
@requiere_auth
def api_editar_evento(evento_id):
    filas = sb.table("agenda").select("id").eq("id", evento_id).limit(1).execute().data
    if not filas:
        abort(404)
    datos = request.get_json(silent=True) or {}
    valores, error = validar_evento(datos)
    if error:
        return jsonify({"error": error}), 400
    sb.table("agenda").update(valores).eq("id", evento_id).execute()
    return jsonify({"id": evento_id})


@app.patch("/api/agenda/<int:evento_id>")
@requiere_auth
def api_estado_evento(evento_id):
    datos = request.get_json(silent=True) or {}
    estado = datos.get("estado") or ""
    if estado not in ESTADOS_AGENDA:
        return jsonify({"error": "Estado inválido."}), 400
    sb.table("agenda").update({"estado": estado}).eq("id", evento_id).execute()
    return jsonify({"ok": True})


@app.delete("/api/agenda/<int:evento_id>")
@requiere_auth
def api_eliminar_evento(evento_id):
    sb.table("agenda").delete().eq("id", evento_id).execute()
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Perfil propio + administración de usuarios (requiere backend con service key)
# ---------------------------------------------------------------------------

@app.get("/api/perfil")
@requiere_auth
def api_perfil():
    user = usuario_actual()
    perfil = perfil_de(user.id)
    if perfil is None:
        # Bootstrap: el primer perfil del sistema nace admin,
        # los siguientes nacen abogado. Evita quedarse sin admin.
        try:
            total = sb.table("profiles").select("id", count="exact").limit(0).execute().count or 0
        except Exception:
            total = 1
        rol = "admin" if total == 0 else "abogado"
        try:
            sb.table("profiles").upsert({
                "id": user.id,
                "email": getattr(user, "email", None),
                "nombre": "",
                "rol": rol,
            }).execute()
            perfil = perfil_de(user.id) or {"rol": rol}
        except Exception as e:
            return jsonify({"error": f"No se pudo crear el perfil: {e}"}), 500
    return jsonify({
        "id": user.id,
        "email": getattr(user, "email", None),
        "nombre": (perfil or {}).get("nombre") or "",
        "rol": (perfil or {}).get("rol") or "abogado",
        "es_admin": (perfil or {}).get("rol") == "admin",
    })


@app.get("/api/admin/users")
@requiere_admin
def api_admin_listar():
    try:
        auth_users = sb.auth.admin.list_users() or []
    except Exception as e:
        return jsonify({"error": f"No se pudo listar usuarios: {e}"}), 500
    try:
        perfiles = {p["id"]: p for p in sb.table("profiles").select("*").execute().data}
    except Exception:
        perfiles = {}
    return jsonify([serializar_auth_user(u, perfiles) for u in auth_users])


@app.post("/api/admin/users")
@requiere_admin
def api_admin_crear():
    datos = request.get_json(silent=True) or {}
    valores, error = validar_usuario_admin(datos, exige_password=True)
    if error:
        return jsonify({"error": error}), 400
    try:
        creado = sb.auth.admin.create_user({
            "email": valores["email"],
            "password": valores["password"],
            "email_confirm": True,
            "user_metadata": {"nombre": valores["nombre"]},
        })
    except Exception as e:
        return jsonify({"error": f"No se pudo crear el usuario: {e}"}), 400
    nuevo = creado.user
    try:
        sb.table("profiles").upsert({
            "id": nuevo.id,
            "email": valores["email"],
            "nombre": valores["nombre"],
            "rol": valores["rol"],
        }).execute()
    except Exception as e:
        return jsonify({"error": f"Usuario creado pero falló el perfil: {e}", "id": nuevo.id}), 500
    return jsonify({"id": nuevo.id}), 201


@app.patch("/api/admin/users/<uid>")
@requiere_admin
def api_admin_actualizar(uid):
    datos = request.get_json(silent=True) or {}
    nombre = campo(datos, "nombre")
    rol = datos.get("rol") or ""
    if rol and rol not in ROLES:
        return jsonify({"error": "Rol inválido."}), 400
    password = datos.get("password") or ""
    if password and len(password) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres."}), 400
    if password:
        try:
            sb.auth.admin.update_user_by_id(uid, {"password": password})
        except Exception as e:
            return jsonify({"error": f"No se pudo cambiar la contraseña: {e}"}), 400
    cambios = {}
    if nombre:
        cambios["nombre"] = nombre
    if rol:
        cambios["rol"] = rol
    if cambios:
        try:
            sb.table("profiles").update(cambios).eq("id", uid).execute()
        except Exception as e:
            return jsonify({"error": f"No se pudo actualizar el perfil: {e}"}), 500
    return jsonify({"ok": True})


@app.delete("/api/admin/users/<uid>")
@requiere_admin
def api_admin_eliminar(uid):
    actual = usuario_actual()
    if actual and str(actual.id) == str(uid):
        return jsonify({"error": "No puedes eliminar tu propia cuenta de administradora."}), 400
    try:
        sb.auth.admin.delete_user(uid)
    except Exception as e:
        return jsonify({"error": f"No se pudo eliminar: {e}"}), 400
    try:
        sb.table("profiles").delete().eq("id", uid).execute()
    except Exception:
        pass
    return jsonify({"ok": True})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa(path):
    if path.startswith(("api/", "uploads/")):
        abort(404)
    ruta = os.path.join(DIST_DIR, path)
    if path and os.path.isfile(ruta):
        return send_from_directory(DIST_DIR, path)
    index = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index):
        return send_from_directory(DIST_DIR, "index.html")
    return ("Frontend no compilado. Ejecuta 'npm run build' dentro de la carpeta lexflow.", 500)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
