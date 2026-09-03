import { Link } from "react-router-dom";

export default function AgendaModule({ eventos }) {
  const vencimientos = eventos.filter((e) => e.tipo === "vencimiento" && e.estado === "pendiente");
  const otros = eventos.filter((e) => !(e.tipo === "vencimiento" && e.estado === "pendiente"));

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <header className="px-4 sm:px-5 py-3.5 bg-red-50 text-red-900 flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-red-100">
        <h2 className="text-sm sm:text-base font-semibold">⚡ Agenda y Vencimientos del Expediente</h2>
        <Link
          to="/agenda/nuevo"
          className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap min-h-[44px]"
        >
          + Nuevo Vencimiento
        </Link>
      </header>

      <div className="p-4 sm:p-5 space-y-3">
        {eventos.length === 0 && (
          <p className="text-sm text-slate-400 italic">Sin eventos para este expediente.</p>
        )}
        {vencimientos.map((e) => (
          <div
            key={e.id}
            className="border-l-4 border-red-600 bg-red-50/50 border border-red-200 rounded-lg p-4"
          >
            <span className="inline-block bg-red-100 text-red-700 rounded-full px-2.5 py-0.5 text-xs font-bold">
              PLAZO FATAL
            </span>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">{e.titulo}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Fecha límite: {e.fecha}
              {e.hora ? ` - ${e.hora} hs` : ""}
            </p>
            {e.notas && <p className="mt-1 text-xs text-slate-500">{e.notas}</p>}
          </div>
        ))}
        {otros.map((e) => (
          <div key={e.id} className="border rounded-lg p-4 bg-slate-50">
            <span className="inline-block bg-slate-200 text-slate-700 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase">
              {e.tipo} · {e.estado}
            </span>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">{e.titulo}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {e.fecha}
              {e.hora ? ` - ${e.hora} hs` : ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

