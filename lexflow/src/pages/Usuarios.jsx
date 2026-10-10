import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";

const ROLES = ["admin", "abogado", "secretario"];

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", nombre: "", rol: "abogado" });
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nuevoPass, setNuevoPass] = useState("");

  const cargar = () => {
    setCargando(true);
    setError(null);
    adminApi
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
    try {
      await adminApi.crearUsuario(form);
      setForm({ email: "", password: "", nombre: "", rol: "abogado" });
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  };

  const guardarEdicion = async (id) => {
    setError(null);
    try {
      await adminApi.actualizarUsuario(id, {
        nombre: editando.nombre,
        rol: editando.rol,
        password: nuevoPass,
      });
      setEditando(null);
      setNuevoPass("");
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (id, email) => {
    if (!window.confirm(`¿Eliminar ${email}? Perderá el acceso.`)) return;
    setError(null);
    try {
      await adminApi.eliminarUsuario(id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Usuarios</h1>
      <p className="text-sm text-slate-500">
        Solo administradores. Crear una cuenta aquí no cierra tu sesión. La contraseña temporal debe
        tener al menos 6 caracteres.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">{error}</div>
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
                    {u.last_sign_in_at ? u.last_sign_in_at.slice(0, 16).replace("T", " ") : "nunca"}
                  </td>
                  <td className="py-2.5 px-4">
                    {editando?.id === u.id ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          type="password"
                          minLength={6}
                          placeholder="Nueva clave (opcional)"
                          value={nuevoPass}
                          onChange={(e) => setNuevoPass(e.target.value)}
                          className="rounded border border-slate-300 px-2 py-1.5 text-sm w-44"
                        />
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
