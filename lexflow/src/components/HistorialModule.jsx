import { useState } from "react";

const TIPOS_ACTUACION = ["escrito", "audiencia", "resolucion", "notificacion", "otro"];

export default function HistorialModule({ actuaciones, expedienteId, cargando, onEliminar, onAgregar }) {
  const [form, setForm] = useState({ fecha: "", tipo: "otro", descripcion: "", notas: "" });
  const [enviando, setEnviando] = useState(false);

  const hoy = new Date().toISOString().slice(0, 10);
  const cambio = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.descripcion) return;
    setEnviando(true);
    try {
      await onAgregar({ ...form, fecha: form.fecha || hoy });
      setForm({ fecha: "", tipo: "otro", descripcion: "", notas: "" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <header className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <h2 className="text-base font-semibold text-slate-900">📌 Historial de Actuaciones</h2>
      </header>

      <div className="px-4 sm:px-5 pb-4 space-y-3">
        {actuaciones.length === 0 && (
          <p className="text-sm text-slate-400 italic">Sin actuaciones registradas.</p>
        )}
        {actuaciones.map((act) => (
          <article key={act.id} className="border-l-2 border-slate-200 pl-4 pb-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {act.fecha}
                </span>
                <h3 className="mt-1.5 text-sm font-semibold text-slate-900 capitalize">
                  {act.tipo} {act.descripcion ? "— " + act.descripcion.split("\n")[0] : ""}
                </h3>
                {act.descripcion && (
                  <p className="mt-1 text-sm text-slate-600">{act.descripcion}</p>
                )}
                {act.notas && <p className="mt-0.5 text-xs text-slate-500">{act.notas}</p>}
              </div>
              <button
                type="button"
                onClick={() => onEliminar(act.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg px-2 py-1 text-xs transition-colors shrink-0"
                aria-label="Eliminar actuación"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>

      <form className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2.5" onSubmit={enviar}>
        <label
          htmlFor="nueva-actuacion"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Nueva actuación
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="date"
            value={form.fecha}
            onChange={cambio("fecha")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={form.tipo}
            onChange={cambio("tipo")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIPOS_ACTUACION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <textarea
          id="nueva-actuacion"
          rows={3}
          placeholder="Registra aquí el movimiento del expediente (proveído, escrito, audiencia...)"
          value={form.descripcion}
          onChange={cambio("descripcion")}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Notas (opcional)"
          value={form.notas}
          onChange={cambio("notas")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={cargando || enviando}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {enviando ? "Guardando..." : "Guardar Registro"}
          </button>
        </div>
      </form>
    </section>
  );
}

