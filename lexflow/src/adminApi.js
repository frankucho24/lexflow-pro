import { createClient } from "@supabase/supabase-js";
import { supabase, getToken } from "./supabase";

// Backend Flask (server.py) con service key. En local Vite lo
// redirige vía proxy (/api -> localhost:5000). En Netlify se usa
// VITE_API_URL=https://tu-backend-en-render.onrender.com
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

if (!BASE && window.location.hostname !== "localhost") {
  console.warn("VITE_API_URL vacío: el módulo Usuarios (admin) necesita el backend en Render.");
}

async function llamada(ruta, opciones = {}) {
  if (!BASE) {
    throw new Error("Backend no configurado. Define VITE_API_URL en Netlify hacia tu API en Render.");
  }
  const token = await getToken();
  if (!token) throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  const resp = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opciones.headers || {}),
    },
  });
  const cuerpo = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(cuerpo.error || `Error ${resp.status}`);
  return cuerpo;
}

export const adminApi = {
  perfil() {
    return llamada("/api/perfil");
  },
  usuarios() {
    return llamada("/api/admin/users");
  },
  crearUsuario({ email, password, nombre, rol }) {
    return llamada("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password, nombre, rol }),
    });
  },
  actualizarUsuario(id, { nombre, rol, password }) {
    return llamada(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ nombre, rol, password: password || "" }),
    });
  },
  eliminarUsuario(id) {
    return llamada(`/api/admin/users/${id}`, { method: "DELETE" });
  },
};

// Perfil para gating de UI: intenta backend, si no hay backend
// cae a lectura directa de profiles (SELECT permitido por RLS).
// En modo directo el rol admin también puede venir del
// app_metadata del JWT (ver supabase_roles_direct.sql).
export async function miPerfil() {
  const { data: sesion } = await supabase.auth.getSession();
  const user = sesion.session?.user || null;
  if (!user) return { user: null, perfil: null };
  if (BASE) {
    try {
      const perfil = await llamada("/api/perfil");
      return { user, perfil };
    } catch {
      // cae al modo directo
    }
  }
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const rol = data?.rol || user.app_metadata?.rol || "abogado";
  const perfil = data
    ? { ...data, rol, es_admin: rol === "admin" }
    : { id: user.id, email: user.email, nombre: "", rol, es_admin: rol === "admin" };
  return { user, perfil };
}

export const TIENE_BACKEND = !!BASE;

// ---------------------------------------------------------------------------
// Modo directo (sin backend): solo Netlify + Supabase.
// Requiere supabase_roles_direct.sql aplicado y "Confirm email" en OFF.
// Limitaciones: no se ve el último acceso ni se borra el Auth user
// (el perfil se borra aquí y el Auth user en Dashboard si hace falta).
// ---------------------------------------------------------------------------

function clienteSecundario() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient(url, anon, {
    auth: { storageKey: "lexflow-temp-signup", persistSession: false, autoRefreshToken: false },
  });
}

export const modoDirecto = {
  async usuarios() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((p) => ({
      id: p.id,
      email: p.email,
      nombre: p.nombre,
      rol: p.rol,
      created_at: p.created_at,
      last_sign_in_at: null,
    }));
  },

  async crearUsuario({ email, password, nombre, rol }) {
    const tmp = clienteSecundario();
    const { data, error } = await tmp.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    if (error) throw new Error(error.message);
    const nuevo = data.user;
    if (!nuevo) {
      throw new Error("Revisa Auth → Providers → Email: deja 'Confirm email' en OFF.");
    }
    const { error: e2 } = await supabase
      .from("profiles")
      .insert({ id: nuevo.id, email, nombre, rol });
    await tmp.auth.signOut();
    if (e2) throw new Error("Cuenta creada pero falló el perfil: " + e2.message);
    return { id: nuevo.id };
  },

  async actualizarUsuario(id, { nombre, rol }) {
    const cambios = {};
    if (nombre !== undefined) cambios.nombre = nombre;
    if (rol) cambios.rol = rol;
    if (Object.keys(cambios).length === 0) return { ok: true };
    const { error } = await supabase.from("profiles").update(cambios).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async eliminarPerfil(id) {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async enviarRecovery(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
};
