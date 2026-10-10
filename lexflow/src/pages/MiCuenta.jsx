import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { adminApi } from "../adminApi";

export default function MiCuenta() {
  const [perfil, setPerfil] = useState(null);
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    adminApi.perfil().then(setPerfil).catch(() => setPerfil(null));
  }, []);

  const cambiar = async (e) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    if (clave.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password: clave });
    setGuardando(false);
    if (error) {
      setError(error.message);
      return;
    }
    setClave("");
    setMensaje("Contraseña actualizada.");
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mi cuenta</h1>
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1 text-sm">
        <p>
          <span className="text-slate-500">Email:</span>{" "}
          <span className="font-medium">{perfil?.email || "…"}</span>
        </p>
        <p>
          <span className="text-slate-500">Nombre:</span>{" "}
          <span className="font-medium">{perfil?.nombre || "—"}</span>
        </p>
        <p>
          <span className="text-slate-500">Rol:</span>{" "}
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold">
            {perfil?.rol || "…"}
          </span>
        </p>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-2">Cambiar mi contraseña</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mb-3">
            {error}
          </div>
        )}
        {mensaje && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm mb-3">
            {mensaje}
          </div>
        )}
        <form onSubmit={cambiar} className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            minLength={6}
            required
            placeholder="Nueva contraseña"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
          />
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </section>
    </div>
  );
}
