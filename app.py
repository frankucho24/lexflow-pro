import os
from datetime import datetime

from flask import Flask, abort, flash, g, redirect, render_template, request, send_from_directory, url_for
from werkzeug.utils import secure_filename

from database import (
    ESTADOS_AGENDA,
    ESTADOS_ETAPA,
    ESTADOS_EXPEDIENTE,
    TIPOS_ACTUACION,
    TIPOS_EXPEDIENTE,
    get_connection,
    init_db,
    hoy,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "doc", "docx", "xls", "xlsx", "txt", "zip", "msg"}

app = Flask(__name__)
app.config["SECRET_KEY"] = "cambia-esta-clave"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.teardown_appcontext
def close_db(exc):
    g_db = g.pop("db", None)
    if g_db is not None:
        g_db.close()


def db():
    if "db" not in g:
        g.db = get_connection()
    return g.db


def get_expediente(expediente_id):
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM expedientes WHERE id = %s", (expediente_id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return row


def form_value(nombre, vacio=""):
    valor = request.form.get(nombre, "").strip()
    return valor or vacio


@app.route("/")
def index():
    conn = db()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM expedientes")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM expedientes WHERE tipo = 'judicial'")
    judiciales = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM expedientes WHERE tipo = 'administrativo'")
    administrativos = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM expedientes WHERE estado != 'cerrado'")
    activos = cur.fetchone()[0]
    cerrados = total - activos

    hoy_texto = hoy()
    cur.execute(
        "SELECT a.*, e.numero FROM agenda a LEFT JOIN expedientes e ON a.expediente_id = e.id "
        "WHERE a.tipo = 'audiencia' AND a.estado = 'pendiente' AND a.fecha >= %s "
        "ORDER BY a.fecha, a.hora LIMIT 6",
        (hoy_texto,),
    )
    proximas_audiencias = cur.fetchall()

    cur.execute(
        "SELECT a.*, e.numero FROM agenda a LEFT JOIN expedientes e ON a.expediente_id = e.id "
        "WHERE a.tipo = 'vencimiento' AND a.estado = 'pendiente' AND a.fecha >= %s "
        "ORDER BY a.fecha LIMIT 6",
        (hoy_texto,),
    )
    proximos_vencimientos = cur.fetchall()

    cur.execute("SELECT * FROM expedientes ORDER BY id DESC LIMIT 5")
    recientes = cur.fetchall()

    return render_template(
        "index.html",
        total=total,
        judiciales=judiciales,
        administrativos=administrativos,
        activos=activos,
        cerrados=cerrados,
        proximas_audiencias=proximas_audiencias,
        proximos_vencimientos=proximos_vencimientos,
        recientes=recientes,
        hoy=hoy_texto,
    )


@app.route("/expedientes")
def lista_expedientes():
    conn = db()
    cur = conn.cursor()
    tipo = request.args.get("tipo", "")
    estado = request.args.get("estado", "")
    busqueda = request.args.get("q", "").strip()

    sql = """SELECT e.*,
        (SELECT a.fecha || ' | ' || a.descripcion FROM actuaciones a
            WHERE a.expediente_id = e.id ORDER BY a.fecha DESC, a.id DESC LIMIT 1) AS ultima_actuacion,
        (SELECT d.nombre FROM documentos d
            WHERE d.expediente_id = e.id ORDER BY d.id DESC LIMIT 1) AS ultimo_documento
        FROM expedientes e WHERE 1=1"""
    params = []
    if tipo in TIPOS_EXPEDIENTE:
        sql += " AND tipo = %s"
        params.append(tipo)
    if estado in ESTADOS_EXPEDIENTE:
        sql += " AND estado = %s"
        params.append(estado)
    if busqueda:
        sql += " AND (numero LIKE %s OR cliente LIKE %s OR contraparte LIKE %s OR materia LIKE %s OR organo LIKE %s)"
        like = f"%{busqueda}%"
        params.extend([like, like, like, like, like])
    sql += " ORDER BY id DESC"

    cur.execute(sql, params)
    expedientes = cur.fetchall()
    return render_template(
        "expedientes.html",
        expedientes=expedientes,
        tipo=tipo,
        estado=estado,
        busqueda=busqueda,
        tipos=TIPOS_EXPEDIENTE,
        estados=ESTADOS_EXPEDIENTE,
    )


@app.route("/expedientes/nuevo", methods=["GET", "POST"])
def nuevo_expediente():
    if request.method == "POST":
        numero = form_value("numero")
        tipo = request.form.get("tipo", "")
        if not numero or tipo not in TIPOS_EXPEDIENTE:
            flash("El número y el tipo son obligatorios.", "error")
            return redirect(url_for("nuevo_expediente"))

        conn = db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO expedientes (numero, tipo, organo, materia, cliente, contraparte, estado, "
            "fecha_ingreso, fecha_cierre, descripcion) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (
                numero,
                tipo,
                form_value("organo"),
                form_value("materia"),
                form_value("cliente"),
                form_value("contraparte"),
                request.form.get("estado", "activo"),
                form_value("fecha_ingreso", hoy()),
                form_value("fecha_cierre"),
                form_value("descripcion"),
            ),
        )
        conn.commit()
        flash("Expediente creado correctamente.", "ok")
        return redirect(url_for("lista_expedientes"))

    return render_template(
        "formulario_expediente.html",
        expediente=None,
        tipos=TIPOS_EXPEDIENTE,
        estados=ESTADOS_EXPEDIENTE,
    )


@app.route("/expedientes/<int:expediente_id>")
def detalle_expediente(expediente_id):
    conn = db()
    cur = conn.cursor()
    expediente = get_expediente(expediente_id)
    cur.execute("UPDATE expedientes SET ultima_consulta = %s WHERE id = %s",
                 (datetime.now().strftime("%Y-%m-%d %H:%M"), expediente_id))
    conn.commit()
    cur.execute("SELECT * FROM etapas WHERE expediente_id = %s ORDER BY fecha_inicio IS NULL, fecha_inicio", (expediente_id,))
    etapas = cur.fetchall()
    cur.execute("SELECT * FROM actuaciones WHERE expediente_id = %s ORDER BY fecha DESC, id DESC", (expediente_id,))
    actuaciones = cur.fetchall()
    cur.execute("SELECT * FROM documentos WHERE expediente_id = %s ORDER BY id DESC", (expediente_id,))
    documentos = cur.fetchall()
    cur.execute("SELECT * FROM agenda WHERE expediente_id = %s ORDER BY fecha", (expediente_id,))
    agenda = cur.fetchall()
    return render_template(
        "detalle_expediente.html",
        expediente=expediente,
        etapas=etapas,
        actuaciones=actuaciones,
        documentos=documentos,
        agenda=agenda,
        estados_etapa=ESTADOS_ETAPA,
        tipos_actuacion=TIPOS_ACTUACION,
        estados_agenda=ESTADOS_AGENDA,
        hoy=hoy(),
    )


@app.route("/expedientes/<int:expediente_id>/editar", methods=["GET", "POST"])
def editar_expediente(expediente_id):
    conn = db()
    cur = conn.cursor()
    expediente = get_expediente(expediente_id)
    if request.method == "POST":
        numero = form_value("numero")
        tipo = request.form.get("tipo", "")
        if not numero or tipo not in TIPOS_EXPEDIENTE:
            flash("El número y el tipo son obligatorios.", "error")
            return redirect(url_for("editar_expediente", expediente_id=expediente_id))
        cur.execute(
            "UPDATE expedientes SET numero=%s, tipo=%s, organo=%s, materia=%s, cliente=%s, contraparte=%s, "
            "estado=%s, fecha_ingreso=%s, fecha_cierre=%s, descripcion=%s WHERE id=%s",
            (
                numero,
                tipo,
                form_value("organo"),
                form_value("materia"),
                form_value("cliente"),
                form_value("contraparte"),
                request.form.get("estado", "activo"),
                form_value("fecha_ingreso"),
                form_value("fecha_cierre"),
                form_value("descripcion"),
                expediente_id,
            ),
        )
        conn.commit()
        flash("Expediente actualizado.", "ok")
        return redirect(url_for("detalle_expediente", expediente_id=expediente_id))

    return render_template(
        "formulario_expediente.html",
        expediente=expediente,
        tipos=TIPOS_EXPEDIENTE,
        estados=ESTADOS_EXPEDIENTE,
    )


@app.route("/expedientes/<int:expediente_id>/eliminar", methods=["POST"])
def eliminar_expediente(expediente_id):
    get_expediente(expediente_id)
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT archivo FROM documentos WHERE expediente_id = %s", (expediente_id,))
    docs = cur.fetchall()
    cur.execute("DELETE FROM expedientes WHERE id = %s", (expediente_id,))
    conn.commit()
    for doc in docs:
        ruta = os.path.join(UPLOAD_FOLDER, doc[0])
        if os.path.exists(ruta):
            try:
                os.remove(ruta)
            except OSError:
                pass
    flash("Expediente eliminado.", "ok")
    return redirect(url_for("lista_expedientes"))


@app.route("/expedientes/<int:expediente_id>/etapas", methods=["POST"])
def agregar_etapa(expediente_id):
    get_expediente(expediente_id)
    nombre = form_value("nombre")
    if nombre:
        conn = db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO etapas (expediente_id, nombre, estado, fecha_inicio, fecha_fin, notas) VALUES (%s,%s,%s,%s,%s,%s)",
            (expediente_id, nombre, request.form.get("estado", "pendiente"), form_value("fecha_inicio"),
             form_value("fecha_fin"), form_value("notas")),
        )
        conn.commit()
    return redirect(url_for("detalle_expediente", expediente_id=expediente_id))


@app.route("/expedientes/<int:expediente_id>/etapas/<int:etapa_id>/estado", methods=["POST"])
def cambiar_estado_etapa(expediente_id, etapa_id):
    estado = request.form.get("estado", "")
    if estado in ESTADOS_ETAPA:
        conn = db()
        cur = conn.cursor()
        cur.execute("UPDATE etapas SET estado=%s WHERE id=%s AND expediente_id=%s", (estado, etapa_id, expediente_id))
        conn.commit()
    return redirect(url_for("detalle_expediente", expediente_id=expediente_id))


@app.route("/expedientes/<int:expediente_id>/etapas/<int:etapa_id>/eliminar", methods=["POST"])
def eliminar_etapa(expediente_id, etapa_id):
    conn = db()
    cur = conn.cursor()
    cur.execute("DELETE FROM etapas WHERE id=%s AND expediente_id=%s", (etapa_id, expediente_id))
    conn.commit()
    return redirect(url_for("detalle_expediente", expediente_id=expediente_id))


@app.route("/expedientes/<int:expediente_id>/actuaciones", methods=["POST"])
def agregar_actuacion(expediente_id):
    get_expediente(expediente_id)
    descripcion = form_value("descripcion")
    if descripcion:
        conn = db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO actuaciones (expediente_id, fecha, tipo, descripcion, notas) VALUES (%s,%s,%s,%s,%s)",
            (expediente_id, form_value("fecha", hoy()), request.form.get("tipo", "otro"), descripcion,
             form_value("notas")),
        )
        conn.commit()
    return redirect(url_for("detalle_expediente", expediente_id=expediente_id))


@app.route("/expedientes/<int:expediente_id>/actuaciones/<int:actuacion_id>/eliminar", methods=["POST"])
def eliminar_actuacion(expediente_id, actuacion_id):
    conn = db()
    cur = conn.cursor()
    cur.execute("DELETE FROM actuaciones WHERE id=%s AND expediente_id=%s", (actuacion_id, expediente_id))
    conn.commit()
    return redirect(url_for("detalle_expediente", expediente_id=expediente_id))


@app.route("/expedientes/<int:expediente_id>/documentos", methods=["POST"])
def subir_documento(expediente_id):
    get_expediente(expediente_id)
    archivo = request.files.get("archivo")
    if archivo and archivo.filename:
        if not allowed_file(archivo.filename):
            flash("Tipo de archivo no permitido.", "error")
            return redirect(url_for("detalle_expediente", expediente_id=expediente_id))
        nombre_original = archivo.filename
        nombre_guardado = secure_filename(nombre_original)
        base, ext = os.path.splitext(nombre_guardado)
        ruta = os.path.join(UPLOAD_FOLDER, nombre_guardado)
        contador = 1
        while os.path.exists(ruta):
            nombre_guardado = f"{base}_{contador}{ext}"
            ruta = os.path.join(UPLOAD_FOLDER, nombre_guardado)
            contador += 1
        archivo.save(ruta)
        conn = db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO documentos (expediente_id, nombre, archivo, tipo, fecha) VALUES (%s,%s,%s,%s,%s)",
            (expediente_id, nombre_original, nombre_guardado, form_value("tipo_documento"), form_value("fecha_documento", hoy())),
        )
        conn.commit()
        flash("Documento adjuntado.", "ok")
    else:
        flash("No se seleccionó ningún archivo.", "error")
    return redirect(url_for("detalle_expediente", expediente_id=expediente_id))


@app.route("/expedientes/<int:expediente_id>/documentos/<int:documento_id>/eliminar", methods=["POST"])
def eliminar_documento(expediente_id, documento_id):
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM documentos WHERE id=%s AND expediente_id=%s", (documento_id, expediente_id))
    doc = cur.fetchone()
    if doc:
        ruta = os.path.join(UPLOAD_FOLDER, doc[2])
        if os.path.exists(ruta):
            try:
                os.remove(ruta)
            except OSError:
                pass
        cur.execute("DELETE FROM documentos WHERE id=%s", (documento_id,))
        conn.commit()
    return redirect(url_for("detalle_expediente", expediente_id=expediente_id))


@app.route("/uploads/<path:nombre>")
def servir_documento(nombre):
    return send_from_directory(UPLOAD_FOLDER, nombre)


@app.route("/agenda")
def agenda():
    conn = db()
    cur = conn.cursor()
    filtro_tipo = request.args.get("tipo", "")
    filtro_estado = request.args.get("estado", "")
    sql = ("SELECT a.*, e.numero AS numero_expediente FROM agenda a "
           "LEFT JOIN expedientes e ON a.expediente_id = e.id WHERE 1=1")
    params = []
    if filtro_tipo in ("audiencia", "vencimiento", "otro"):
        sql += " AND a.tipo = %s"
        params.append(filtro_tipo)
    if filtro_estado in ESTADOS_AGENDA:
        sql += " AND a.estado = %s"
        params.append(filtro_estado)
    sql += " ORDER BY a.fecha, a.hora"
    cur.execute(sql, params)
    eventos = cur.fetchall()
    return render_template(
        "agenda.html",
        eventos=eventos,
        estados=ESTADOS_AGENDA,
        filtro_tipo=filtro_tipo,
        filtro_estado=filtro_estado,
        hoy=hoy(),
    )


@app.route("/agenda/nuevo", methods=["GET", "POST"])
def nuevo_evento():
    conn = db()
    cur = conn.cursor()
    if request.method == "POST":
        titulo = form_value("titulo")
        fecha = form_value("fecha")
        if not titulo or not fecha:
            flash("El título y la fecha son obligatorios.", "error")
            return redirect(url_for("nuevo_evento"))
        expediente_id = request.form.get("expediente_id") or None
        cur.execute(
            "INSERT INTO agenda (expediente_id, titulo, tipo, fecha, hora, estado, notas) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (expediente_id, titulo, request.form.get("tipo", "otro"), fecha, form_value("hora"),
             request.form.get("estado", "pendiente"), form_value("notas")),
        )
        conn.commit()
        flash("Evento agregado a la agenda.", "ok")
        return redirect(url_for("agenda"))

    cur.execute("SELECT id, numero, tipo, cliente FROM expedientes ORDER BY numero")
    expedientes = cur.fetchall()
    return render_template(
        "formulario_agenda.html",
        evento=None,
        expedientes=expedientes,
        estados=ESTADOS_AGENDA,
    )


@app.route("/agenda/<int:evento_id>/editar", methods=["GET", "POST"])
def editar_evento(evento_id):
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM agenda WHERE id=%s", (evento_id,))
    evento = cur.fetchone()
    if evento is None:
        abort(404)
    if request.method == "POST":
        titulo = form_value("titulo")
        fecha = form_value("fecha")
        if not titulo or not fecha:
            flash("El título y la fecha son obligatorios.", "error")
            return redirect(url_for("editar_evento", evento_id=evento_id))
        expediente_id = request.form.get("expediente_id") or None
        cur.execute(
            "UPDATE agenda SET expediente_id=%s, titulo=%s, tipo=%s, fecha=%s, hora=%s, estado=%s, notas=%s WHERE id=%s",
            (expediente_id, titulo, request.form.get("tipo", "otro"), fecha, form_value("hora"),
             request.form.get("estado", "pendiente"), form_value("notas"), evento_id),
        )
        conn.commit()
        flash("Evento actualizado.", "ok")
        return redirect(url_for("agenda"))

    cur.execute("SELECT id, numero, tipo, cliente FROM expedientes ORDER BY numero")
    expedientes = cur.fetchall()
    return render_template(
        "formulario_agenda.html",
        evento=evento,
        expedientes=expedientes,
        estados=ESTADOS_AGENDA,
    )


@app.route("/agenda/<int:evento_id>/estado", methods=["POST"])
def cambiar_estado_evento(evento_id):
    estado = request.form.get("estado", "")
    if estado in ESTADOS_AGENDA:
        conn = db()
        cur = conn.cursor()
        cur.execute("UPDATE agenda SET estado=%s WHERE id=%s", (estado, evento_id))
        conn.commit()
    return redirect(url_for("agenda"))


@app.route("/agenda/<int:evento_id>/eliminar", methods=["POST"])
def eliminar_evento(evento_id):
    conn = db()
    cur = conn.cursor()
    cur.execute("DELETE FROM agenda WHERE id=%s", (evento_id,))
    conn.commit()
    flash("Evento eliminado.", "ok")
    return redirect(url_for("agenda"))


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
