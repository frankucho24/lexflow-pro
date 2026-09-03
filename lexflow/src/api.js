import { supabase } from "./supabase";

// Acceso DIRECTO a Supabase (sin backend Flask).
// Requiere las políticas RLS de supabase_policies.sql aplicadas.
// La sesión del login (supabase-js) autoriza cada petición automáticamente.

const BUCKET = "documentos";
const URL_FIRMADA_SEGUNDOS = 3600;
const TIPOS_EXPEDIENTE = ["judicial", "administrativo"];
const ESTADOS_EXPEDIENTE = ["activo", "suspendido", "cerrado"];
const ESTADOS_ETAPA = ["pendiente", "en_curso", "completada"];
const ESTADOS_AGENDA = ["pendiente", "realizada", "cancelada"];
const TIPOS_ACTUACION = ["escrito", "audiencia", "resolucion", "notificacion", "otro"];
const EXT_PERMITIDAS = ["pdf", "png", "jpg", "jpeg", "gif", "doc", "docx", "xls", "xlsx", "txt", "zip", "msg"];

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function ahora() {
  const f = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())} ${p(f.getHours())}:${p(f.getMinutes())}`;
}

function sanitize(texto) {
  return (texto || "").replace(/[,()%"'_*\\[\]]/g, "");
}

function campo(datos, nombre, vacio = "") {
  const valor = (datos[nombre] ?? "").toString().trim();
  return valor || vacio;
}

async function verificar(error) {
  if (!error) return;
  if (error.status === 401) {
    await supabase.auth.signOut();
    if (window.location.pathname !== "/login") window.location.href = "/login";
    throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  }
  throw new Error(error.message || "Error de base de datos.");
}

async function contar(tabla, filtros = {}) {
  let q = supabase.from(tabla).select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filtros)) q = q.eq(k, v);
  const { count, error } = await q;
  await verificar(error);
  return count || 0;
}

function aplanarAgenda(filas) {
  return (filas || []).map((f) => {
    f.numero_expediente = f.expedientes ? f.expedientes.numero : null;
    delete f.expedientes;
    return f;
  });
}

async function agendaConNumero({ tipo = "", estado = "", desde = "", limite = 0 } = {}) {
  let q = supabase.from("agenda").select("*, expedientes(numero)");
  if (tipo) q = q.eq("tipo", tipo);
  if (estado) q = q.eq("estado", estado);
  if (desde) q = q.gte("fecha", desde);
  q = q.order("fecha").order("hora");
  if (limite) q = q.limit(limite);
  const { data, error } = await q;
  await verificar(error);
  return aplanarAgenda(data);
}

async function conUrlsDocumentos(docs) {
  for (const d of docs || []) {
    d.url = null;
    try {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(d.archivo, URL_FIRMADA_SEGUNDOS);
      d.url = data?.signedUrl || null;
    } catch {
      d.url = null;
    }
  }
  return docs || [];
}

function validarExpediente(datos) {
  const numero = campo(datos, "numero");
  const tipo = datos.tipo || "";
  if (!numero || !TIPOS_EXPEDIENTE.includes(tipo)) {
    throw new Error("El número y el tipo son obligatorios.");
  }
  const estado = ESTADOS_EXPEDIENTE.includes(datos.estado) ? datos.estado : "activo";
  return {
    numero,
    tipo,
    organo: campo(datos, "organo"),
    materia: campo(datos, "materia"),
    cliente: campo(datos, "cliente"),
    contraparte: campo(datos, "contraparte"),
    estado,
    fecha_ingreso: campo(datos, "fecha_ingreso", hoy()),
    fecha_cierre: campo(datos, "fecha_cierre") || null,
    descripcion: campo(datos, "descripcion"),
  };
}

function validarEvento(datos) {
  const titulo = campo(datos, "titulo");
  const fecha = campo(datos, "fecha");
  if (!titulo || !fecha) {
    throw new Error("El título y la fecha son obligatorios.");
  }
  const estado = ESTADOS_AGENDA.includes(datos.estado) ? datos.estado : "pendiente";
  const tipo = ["audiencia", "vencimiento", "otro"].includes(datos.tipo) ? datos.tipo : "otro";
  let expediente_id = parseInt(datos.expediente_id, 10);
  if (!expediente_id) expediente_id = null;
  return {
    expediente_id,
    titulo,
    tipo,
    fecha,
    hora: campo(datos, "hora") || null,
    estado,
    notas: campo(datos, "notas"),
  };
}

export const api = {
  async panel() {
    const [total, judiciales, administrativos, cerrados] = await Promise.all([
      contar("expedientes"),
      contar("expedientes", { tipo: "judicial" }),
      contar("expedientes", { tipo: "administrativo" }),
      contar("expedientes", { estado: "cerrado" }),
    ]);
    const [proximas_audiencias, proximos_vencimientos] = await Promise.all([
      agendaConNumero({ tipo: "audiencia", estado: "pendiente", desde: hoy(), limite: 6 }),
      agendaConNumero({ tipo: "vencimiento", estado: "pendiente", desde: hoy(), limite: 6 }),
    ]);
    const { data: recientes, error } = await supabase
      .from("expedientes").select("*").order("id", { ascending: false }).limit(5);
    await verificar(error);
    return {
      total, judiciales, administrativos,
      activos: total - cerrados, cerrados,
      proximas_audiencias, proximos_vencimientos,
      recientes: recientes || [],
    };
  },

  async expedientes(params = {}) {
    let q = supabase.from("expedientes").select("*");
    if (TIPOS_EXPEDIENTE.includes(params.tipo)) q = q.eq("tipo", params.tipo);
    if (ESTADOS_EXPEDIENTE.includes(params.estado)) q = q.eq("estado", params.estado);
    const b = sanitize((params.q || "").trim());
    if (b) {
      q = q.or(`numero.ilike.*${b}*,cliente.ilike.*${b}*,contraparte.ilike.*${b}*,materia.ilike.*${b}*,organo.ilike.*${b}*`);
    }
    const { data: filas, error } = await q.order("id", { ascending: false });
    await verificar(error);

    const { data: acts, error: e1 } = await supabase
      .from("actuaciones").select("expediente_id,fecha,descripcion")
      .order("fecha", { ascending: false }).order("id", { ascending: false });
    await verificar(e1);
    const ult = {};
    for (const a of acts || []) {
      if (!(a.expediente_id in ult)) ult[a.expediente_id] = `${a.fecha} | ${a.descripcion}`;
    }
    const { data: docs, error: e2 } = await supabase
      .from("documentos").select("expediente_id,nombre").order("id", { ascending: false });
    await verificar(e2);
    const ultdoc = {};
    for (const d of docs || []) {
      if (!(d.expediente_id in ultdoc)) ultdoc[d.expediente_id] = d.nombre;
    }
    for (const f of filas || []) {
      f.ultima_actuacion = ult[f.id] || null;
      f.ultimo_documento = ultdoc[f.id] || null;
    }
    return filas || [];
  },

  async opcionesExpedientes() {
    const { data, error } = await supabase
      .from("expedientes").select("id,numero,tipo,cliente").order("numero");
    await verificar(error);
    return data || [];
  },

  async crearExpediente(datos) {
    const valores = validarExpediente(datos);
    const { data, error } = await supabase.from("expedientes").insert(valores).select("id").single();
    await verificar(error);
    return { id: data.id };
  },

  async expediente(id) {
    const { data: exp, error: e0 } = await supabase
      .from("expedientes").select("*").eq("id", id).maybeSingle();
    await verificar(e0);
    if (!exp) throw new Error("Expediente no encontrado.");
    const marca = ahora();
    await supabase.from("expedientes").update({ ultima_consulta: marca }).eq("id", id);
    exp.ultima_consulta = marca;

    const { data: etapas, error: e1 } = await supabase
      .from("etapas").select("*").eq("expediente_id", id).order("fecha_inicio", { nullsFirst: true });
    await verificar(e1);
    const { data: actuaciones, error: e2 } = await supabase
      .from("actuaciones").select("*").eq("expediente_id", id)
      .order("fecha", { ascending: false }).order("id", { ascending: false });
    await verificar(e2);
    const { data: documentos, error: e3 } = await supabase
      .from("documentos").select("*").eq("expediente_id", id).order("id", { ascending: false });
    await verificar(e3);
    const { data: agenda, error: e4 } = await supabase
      .from("agenda").select("*").eq("expediente_id", id).order("fecha").order("hora");
    await verificar(e4);
    return {
      expediente: exp,
      etapas: etapas || [],
      actuaciones: actuaciones || [],
      documentos: await conUrlsDocumentos(documentos),
      agenda: agenda || [],
    };
  },

  async editarExpediente(id, datos) {
    const valores = validarExpediente(datos);
    const { error } = await supabase.from("expedientes").update(valores).eq("id", id);
    await verificar(error);
    return { id };
  },

  async eliminarExpediente(id) {
    const { data: archivos } = await supabase.storage.from(BUCKET).list(`exp_${id}`);
    if (archivos && archivos.length) {
      await supabase.storage.from(BUCKET).remove(archivos.map((a) => `exp_${id}/${a.name}`));
    }
    const { error } = await supabase.from("expedientes").delete().eq("id", id);
    await verificar(error);
    return { ok: true };
  },

  async agregarEtapa(id, datos) {
    const nombre = campo(datos, "nombre");
    if (!nombre) throw new Error("El nombre de la etapa es obligatorio.");
    const estado = ESTADOS_ETAPA.includes(datos.estado) ? datos.estado : "pendiente";
    const { data, error } = await supabase.from("etapas").insert({
      expediente_id: id,
      nombre,
      estado,
      fecha_inicio: campo(datos, "fecha_inicio") || null,
      fecha_fin: campo(datos, "fecha_fin") || null,
      notas: campo(datos, "notas"),
    }).select("id").single();
    await verificar(error);
    return { id: data.id };
  },

  async cambiarEstadoEtapa(expId, etapaId, estado) {
    if (!ESTADOS_ETAPA.includes(estado)) throw new Error("Estado inválido.");
    const { error } = await supabase.from("etapas").update({ estado }).eq("id", etapaId).eq("expediente_id", expId);
    await verificar(error);
    return { ok: true };
  },

  async eliminarEtapa(expId, etapaId) {
    const { error } = await supabase.from("etapas").delete().eq("id", etapaId).eq("expediente_id", expId);
    await verificar(error);
    return { ok: true };
  },

  async agregarActuacion(id, datos) {
    const descripcion = campo(datos, "descripcion");
    if (!descripcion) throw new Error("La descripción es obligatoria.");
    const tipo = TIPOS_ACTUACION.includes(datos.tipo) ? datos.tipo : "otro";
    const { data, error } = await supabase.from("actuaciones").insert({
      expediente_id: id,
      fecha: campo(datos, "fecha", hoy()),
      tipo,
      descripcion,
      notas: campo(datos, "notas"),
    }).select("id").single();
    await verificar(error);
    return { id: data.id };
  },

  async eliminarActuacion(expId, actuacionId) {
    const { error } = await supabase.from("actuaciones").delete().eq("id", actuacionId).eq("expediente_id", expId);
    await verificar(error);
    return { ok: true };
  },

  async subirDocumento(id, formData) {
    const archivo = formData.get("archivo");
    const nombre = archivo?.name || "";
    if (!archivo || !nombre) throw new Error("No se seleccionó ningún archivo.");
    const ext = (nombre.split(".").pop() || "").toLowerCase();
    if (!EXT_PERMITIDAS.includes(ext)) throw new Error("Tipo de archivo no permitido.");
    const f = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const stamp = `${f.getFullYear()}${p(f.getMonth() + 1)}${p(f.getDate())}${p(f.getHours())}${p(f.getMinutes())}${p(f.getSeconds())}`;
    const ruta = `exp_${id}/${stamp}_${nombre}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(ruta, archivo);
    await verificar(upErr);
    const { data, error } = await supabase.from("documentos").insert({
      expediente_id: id,
      nombre,
      archivo: ruta,
      tipo: (formData.get("tipo_documento") || "").toString(),
      fecha: (formData.get("fecha_documento") || "").toString() || hoy(),
    }).select("id").single();
    await verificar(error);
    return { id: data.id };
  },

  async eliminarDocumento(expId, docId) {
    const { data: filas } = await supabase.from("documentos")
      .select("archivo").eq("id", docId).eq("expediente_id", expId).limit(1);
    if (filas && filas[0]?.archivo) {
      await supabase.storage.from(BUCKET).remove([filas[0].archivo]);
    }
    const { error } = await supabase.from("documentos").delete().eq("id", docId).eq("expediente_id", expId);
    await verificar(error);
    return { ok: true };
  },

  async agenda(params = {}) {
    return agendaConNumero({ tipo: params.tipo || "", estado: params.estado || "" });
  },

  async crearEvento(datos) {
    const valores = validarEvento(datos);
    const { data, error } = await supabase.from("agenda").insert(valores).select("id").single();
    await verificar(error);
    return { id: data.id };
  },

  async editarEvento(id, datos) {
    const valores = validarEvento(datos);
    const { error } = await supabase.from("agenda").update(valores).eq("id", id);
    await verificar(error);
    return { id };
  },

  async cambiarEstadoEvento(id, estado) {
    if (!ESTADOS_AGENDA.includes(estado)) throw new Error("Estado inválido.");
    const { error } = await supabase.from("agenda").update({ estado }).eq("id", id);
    await verificar(error);
    return { ok: true };
  },

  async eliminarEvento(id) {
    const { error } = await supabase.from("agenda").delete().eq("id", id);
    await verificar(error);
    return { ok: true };
  },
};

export const TIPOS = {
  judicial: "Judicial",
  administrativo: "Administrativo",
  audiencia: "Audiencia",
  vencimiento: "Vencimiento",
  otro: "Otro",
  escrito: "Escrito",
  resolucion: "Resolución",
  notificacion: "Notificación",
};
