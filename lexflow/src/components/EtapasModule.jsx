import { useState } from "react";

const ESTADOS = ["pendiente", "en_curso", "completada"];

export default function EtapasModule({ etapas, expedienteId, cargando, onCambiarEstado, onEliminar, onAgregar }) {
  const [form, setForm] = useState({ nombre: "", estado: "pendiente", fecha_inicio: "", fecha_fin: "", notas: "" });
  const [enviando, setEnviando] = useState(false);

  const cambio = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.nombre) return;
    setEnviando(true);
    try {
      await onAgregar({ ...form });
      setForm({ nombre: "", estado: "pendiente", fecha_inicio: "", fecha_fin: "", notas: "" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm min-w-0">
      <header className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <h2 className="text-base font-semibold text-slate-900">⚖️ Etapas del Proceso</h2>
      </header>

      <div className="px-4 sm:px-5 overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <th className="py-2 pr-2 font-semibold">Etapa / Descripción</th>
              <th className="py-2 px-2 font-semibold">Estado</th>
              <th className="py-2 px-2 font-semibold hidden md:table-cell">Inicio</th>
              <th className="py-2 pl-2 font-semibold hidden md:table-cell">Fin</th>
              <th className="py-2 pl-2"></th>
            </tr>
          </thead>
          <tbody>
            {etapas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-sm text-slate-400 italic">
                  Sin etapas registradas.
                </td>
              </tr>
            )}
            {etapas.map((etapa) => (
              <tr key={etapa.id} className="border-b border-slate-100">
                <td className="py-3 pr-2">
                  <p className="font-medium text-slate-900">{etapa.nombre}</p>
                  {etapa.notas && <p className="text-xs text-slate-500">{etapa.notas}</p>}
                </td>
                <td className="py-3 px-2">
                  <select
                    aria-label={`Estado de ${etapa.nombre}`}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
                      etapa.estado === "completada"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : etapa.estado === "en_curso"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                    value={etapa.estado}
                    onChange={(e) => onCambiarEstado(etapa.id, e.target.value)}
                  >
                    {ESTADOS.map((es) => (
                      <option key={es} value={es}>
                        {es.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-2 hidden md:table-cell text-slate-600 whitespace-nowrap">{etapa.fecha_inicio || "—"}</td>
                <td className="py-3 px-2 hidden md:table-cell text-slate-600 whitespace-nowrap">{etapa.fecha_fin || "—"}</td>
                <td className="py-3 pl-2 text-right">
                  <button
                    type="button"
                    onClick={() => onEliminar(etapa.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg px-2 py-1 text-xs transition-colors"
                    aria-label={`Eliminar ${etapa.nombre}`}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2.5 p-4 sm:p-5 border-t border-slate-100"
        onSubmit={enviar}
      >
        <input
          type="text"
          placeholder="Nombre de la etapa"
          value={form.nombre}
          onChange={cambio("nombre")}
          required
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={form.estado}
          onChange={cambio("estado")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ESTADOS.map((es) => (
            <option key={es} value={es}>
              {es.replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Fecha inicio"
          value={form.fecha_inicio}
          onChange={cambio("fecha_inicio")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={cargando || enviando}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {enviando ? "..." : "Agregar"}
        </button>
      </form>
    </section>
  );
}
