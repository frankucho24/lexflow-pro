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
  return { user, perfil: data ? { ...data, es_admin: data.rol === "admin" } : null };
}
