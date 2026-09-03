const METADATA = [
  { key: "cliente", label: "Cliente" },
  { key: "contraparte", label: "Contraparte" },
  { key: "fecha_ingreso", label: "Fecha Ingreso" },
  { key: "ultima_consulta", label: "Última Consulta" },
];

export default function ExpedienteSummary({ expediente }) {
  if (!expediente) return null;
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm min-w-0">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
          Expediente {expediente.numero}
        </h1>
        <span className="bg-blue-100 text-blue-800 rounded-full px-2.5 py-1 text-xs font-semibold">
          {expediente.tipo === "judicial" ? "Judicial" : "Administrativo"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            expediente.estado === "cerrado"
              ? "bg-slate-200 text-slate-700"
              : expediente.estado === "suspendido"
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {expediente.estado.toUpperCase()}
        </span>
        {expediente.organo && (
          <span className="text-sm text-slate-500">• {expediente.organo}</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 border-t border-slate-100 pt-4">
        {METADATA.map((item) => (
          <div key={item.key} className="min-w-0">
            <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800 break-words">
              {expediente[item.key] || "—"}
            </p>
          </div>
        ))}
      </div>

      {expediente.materia && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Materia / Carátula:</span>{" "}
            {expediente.materia}
            {expediente.descripcion ? ` — ${expediente.descripcion}` : ""}
          </p>
        </div>
      )}
    </section>
  );
}
