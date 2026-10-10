import { useEffect, useState } from "react";
import { adminApi, modoDirecto, TIENE_BACKEND } from "../adminApi";

const ROLES = ["admin", "abogado", "secretario"];

// Usa el backend si hay VITE_API_URL, si no trabaja directo
// contra Supabase (ver supabase_roles_direct.sql).
const api = TIENE_BACKEND ? adminApi : modoDirecto;

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", nombre: "", rol: "abogado" });
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nuevoPass, setNuevoPass] = useState("");

  const cargar = () => {
    setCargando(true);
    setError(null);
    api
      .usuarios()
      .then((u) => {
        setLista(u);
        setCargando(false);
      })
      .catch((e) => {
        setError(e.message);
        setCargando(false);
      });
  };

  useEffect(cargar, []);

  const crear = async (e) => {
    e.preventDefault();
    setCreando(true);
    setError(null);
    setAviso(null);
    try {
      await api.crearUsuario(form);
      setForm({ email: "", password: "", nombre: "", rol: "abogado" });
      setAviso("Usuario creado. Ya puede entrar con ese email y contraseña.");
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  };

  const guardarEdicion = async (id) => {
    setError(null);
    setAviso(null);
    try {
      if (TIENE_BACKEND) {
        await adminApi.actualizarUsuario(id, {
          nombre: editando.nombre,
          rol: editando.rol,
          password: nuevoPass,
        });
      } else {
        if (nuevoPass) {
          setError("Sin backend no puedo cambiar la clave de otro. Usa 'Recovery' para enviarle un email.");
          return;
        }
        await modoDirecto.actualizarUsuario(id, { nombre: editando.nombre, rol: editando.rol });
      }
      setEditando(null);
      setNuevoPass("");
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (id, email) => {
    if (TIENE_BACKEND) {
      if (!window.confirm(`¿Eliminar ${email}? Perderá el acceso.`)) return;
      try {
        await adminApi.eliminarUsuario(id);
        cargar();
      } catch (err) {
        setError(err.message);
      }
      return;
    }
    if (!window.confirm(`¿Quitar el perfil de ${email}? Luego bórralo también en Authentication → Users si quieres.`)) return;
    try {
      await modoDirecto.eliminarPerfil(id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const recovery = async (email) => {
    setError(null);
    setAviso(null);
    try {
      await modoDirecto.enviarRecovery(email);
      setAviso(`Email de recuperación enviado a ${email}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Usuarios</h1>
      <p className="text-sm text-slate-500">
        Solo administradores.{" "}
        {TIENE_BACKEND
          ? "Crear una cuenta aquí no cierra tu sesión."
          : "Modo directo (sin backend): el alta no cierra tu sesión. La clave temporal debe tener al menos 6 caracteres y 'Confirm email' debe estar en OFF."}
      </p>

      {!TIENE_BACKEND && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-xs">
          Sin backend: no se muestra el último acceso, no se puede cambiar la clave de otro directamente
          (usa Recovery) ni borrar su Auth user (hazlo en Authentication → Users). Para gestión total
          despliega el backend en el futuro.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">{error}</div>
      )}
      {aviso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
          {aviso}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-3">+ Nuevo usuario</h2>
        <form onSubmit={crear} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Nombre (ej. Dra. Martínez)"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
          />
          <input
            type="email"
            required
            placeholder="email@estudio.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Contraseña temporal"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
          />
          <select
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={creando}
            className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
          >
            {creando ? "Creando..." : "Crear"}
          </button>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        {cargando ? (
          <p className="p-5 text-sm text-slate-500">Cargando usuarios...</p>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <th className="py-2 px-4">Nombre</th>
                <th className="py-2 px-2">Email</th>
                <th className="py-2 px-2">Rol</th>
                <th className="py-2 px-2">Último acceso</th>
                <th className="py-2 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2.5 px-4">
                    {editando?.id === u.id ? (
                      <input
                        value={editando.nombre}
                        onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                        className="rounded border border-slate-300 px-2 py-1.5 text-sm w-full"
                      />
                    ) : (
                      u.nombre || "—"
                    )}
                  </td>
                  <td className="py-2.5 px-2">{u.email}</td>
                  <td className="py-2.5 px-2">
                    {editando?.id === u.id ? (
                      <select
                        value={editando.rol}
                        onChange={(e) => setEditando({ ...editando, rol: e.target.value })}
                        className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold">
                        {u.rol}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-slate-500 text-xs">
                    {u.last_sign_in_at ? u.last_sign_in_at.slice(0, 16).replace("T", " ") : "—"}
                  </td>
                  <td className="py-2.5 px-4">
                    {editando?.id === u.id ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        {TIENE_BACKEND && (
                          <input
                            type="password"
                            minLength={6}
                            placeholder="Nueva clave (opcional)"
                            value={nuevoPass}
                            onChange={(e) => setNuevoPass(e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1.5 text-sm w-44"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => guardarEdicion(u.id)}
                          className="text-xs font-medium bg-emerald-600 text-white rounded px-3 py-2"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditando(null);
                            setNuevoPass("");
                          }}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditando({ id: u.id, nombre: u.nombre || "", rol: u.rol });
                            setNuevoPass("");
                          }}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Editar
                        </button>
                        {!TIENE_BACKEND && (
                          <button
                            type="button"
                            onClick={() => recovery(u.email)}
                            className="text-xs font-medium text-amber-700 hover:underline"
                          >
                            Recovery
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => eliminar(u.id, u.email)}
                          className="text-xs font-medium text-red-700 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
