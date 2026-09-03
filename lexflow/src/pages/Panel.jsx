import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, TIPOS } from "../api";

function Cargando() {
  return <p className="text-slate-500">Cargando...</p>;
}

function ErrorMensaje({ mensaje }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
      Error: {mensaje}
    </div>
  );
}

export default function Panel() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .panel()
      .then(setDatos)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorMensaje mensaje={error} />;
  if (!datos) return <Cargando />;

  const tarjetas = [
    { label: "Expedientes judiciales", value: datos.judiciales, clase: "border-t-4 border-blue-600 text-blue-700" },
    { label: "Expedientes administrativos", value: datos.administrativos, clase: "border-t-4 border-teal-600 text-teal-700" },
    { label: "Activos", value: datos.activos, clase: "border-t-4 border-emerald-500 text-emerald-700" },
    { label: "Cerrados", value: datos.cerrados, clase: "border-t-4 border-slate-400 text-slate-600" },
  ];

  const eventos = (lista) =>
    lista.length === 0 ? (
      <p className="text-sm text-slate-400 italic">Sin eventos próximos.</p>
    ) : (
      <ul className="divide-y divide-slate-100">
        {lista.map((e) => (
          <li key={e.id} className="py-2.5 flex items-start gap-3">
            <span className="inline-block bg-slate-100 text-slate-700 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap">
              {e.fecha}
              {e.hora ? ` ${e.hora}` : ""}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{e.titulo}</p>
              {e.numero && (
                <p className="text-xs text-slate-500">
                  {e.expediente_id ? (
                    <Link to={`/expedientes/${e.expediente_id}`} className="text-blue-700 hover:underline">
                      {e.numero}
                    </Link>
                  ) : (
                    e.numero
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Panel de control</h1>
        <Link
          to="/expedientes/nuevo"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap min-h-[44px]"
        >
          + Nuevo expediente
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {tarjetas.map((t) => (
          <div
            key={t.label}
            className={`bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm min-w-0 ${t.clase}`}
          >
            <p className="text-2xl sm:text-3xl font-bold">{t.value}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 break-words">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <h2 className="text-base font-semibold text-slate-900 mb-3">📅 Próximas audiencias</h2>
          {eventos(datos.proximas_audiencias)}
        </section>
        <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <h2 className="text-base font-semibold text-slate-900 mb-3">⏰ Vencimientos próximos</h2>
          {eventos(datos.proximos_vencimientos)}
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl shadow-sm min-w-0">
        <header className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
          <h2 className="text-base font-semibold text-slate-900">Expedientes recientes</h2>
        </header>
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 overflow-x-auto">
          {datos.recientes.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Aún no hay expedientes registrados.</p>
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-2 font-semibold">Número</th>
                  <th className="py-2 px-2 font-semibold">Tipo</th>
                  <th className="py-2 px-2 font-semibold hidden md:table-cell">Materia</th>
                  <th className="py-2 px-2 font-semibold">Cliente</th>
                  <th className="py-2 px-2 font-semibold">Estado</th>
                  <th className="py-2 pl-2 font-semibold hidden sm:table-cell">Última consulta</th>
                </tr>
              </thead>
              <tbody>
                {datos.recientes.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-2">
                      <Link to={`/expedientes/${e.id}`} className="font-medium text-blue-700 hover:underline break-words">
                        {e.numero}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
                        {TIPOS[e.tipo]}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 hidden md:table-cell">{e.materia || "—"}</td>
                    <td className="py-2.5 px-2">{e.cliente || "—"}</td>
                    <td className="py-2.5 px-2">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-semibold uppercase whitespace-nowrap">
                        {e.estado}
                      </span>
                    </td>
                    <td className="py-2.5 pl-2 text-slate-600 hidden sm:table-cell whitespace-nowrap">{e.ultima_consulta || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
