import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, TIPOS } from "../api";

const ESTADOS = ["pendiente", "realizada", "cancelada"];

export default function Agenda() {
  const [filtros, setFiltros] = useState({ tipo: "", estado: "" });
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const hoy = new Date().toISOString().slice(0, 10);

  const cargar = (params) => {
    setCargando(true);
    setError(null);
    api
      .agenda(params)
      .then(setEventos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar({});
  }, []);

  const buscar = (e) => {
    e.preventDefault();
    cargar({ ...filtros });
  };

  const cambiarEstado = (id, estado) => api.cambiarEstadoEvento(id, estado).then(() => cargar({ ...filtros }));

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este evento?")) return;
    await api.eliminarEvento(id);
    cargar({ ...filtros });
  };

  const claseEstado = (estado) =>
    estado === "realizada"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : estado === "cancelada"
        ? "bg-red-100 text-red-700 border-red-300"
        : "bg-amber-100 text-amber-800 border-amber-300";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Agenda / Plazos</h1>
        <Link
          to="/agenda/nuevo"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap min-h-[44px]"
        >
          + Nuevo evento
        </Link>
      </div>

      <form className="flex flex-wrap gap-2.5" onSubmit={buscar}>
        <select
          value={filtros.tipo}
          onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          <option value="audiencia">Audiencias</option>
          <option value="vencimiento">Vencimientos</option>
          <option value="otro">Otros</option>
        </select>
        <select
          value={filtros.estado}
          onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((es) => (
            <option key={es} value={es}>
              {es}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors"
        >
          Filtrar
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
          Error: {error}
        </div>
      )}

      {cargando ? (
        <p className="text-slate-500">Cargando...</p>
      ) : eventos.length === 0 ? (
        <p className="text-slate-400 italic">No hay eventos para mostrar.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 bg-slate-50">
                <th className="py-2.5 px-4 font-semibold">Fecha</th>
                <th className="py-2.5 px-2 font-semibold hidden sm:table-cell">Hora</th>
                <th className="py-2.5 px-2 font-semibold">Título</th>
                <th className="py-2.5 px-2 font-semibold">Tipo</th>
                <th className="py-2.5 px-2 font-semibold hidden md:table-cell">Expediente</th>
                <th className="py-2.5 px-2 font-semibold">Estado</th>
                <th className="py-2.5 px-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {e.fecha}
                    {e.hora && <span className="sm:hidden text-slate-500 font-normal"> {e.hora}</span>}
                    {e.fecha < hoy && e.estado === "pendiente" && (
                      <span className="ml-1.5 text-xs font-bold text-red-600">(vencido)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 hidden sm:table-cell whitespace-nowrap">{e.hora || "—"}</td>
                  <td className="py-2.5 px-2 break-words">
                    {e.titulo}
                    {e.notas && <p className="text-xs text-slate-500">{e.notas}</p>}
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="rounded-full bg-slate-200 text-slate-700 px-2.5 py-0.5 text-xs font-semibold uppercase whitespace-nowrap">
                      {TIPOS[e.tipo] || e.tipo}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 hidden md:table-cell">
                    {e.expediente_id ? (
                      <Link
                        to={`/expedientes/${e.expediente_id}`}
                        className="text-blue-700 hover:underline"
                      >
                        {e.numero_expediente}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-2">
                    <select
                      aria-label="Estado del evento"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${claseEstado(e.estado)}`}
                      value={e.estado}
                      onChange={(ev) => cambiarEstado(e.id, ev.target.value)}
                    >
                      {ESTADOS.map((es) => (
                        <option key={es} value={es}>
                          {es}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/agenda/${e.id}/editar`}
                        className="text-blue-700 hover:underline text-sm"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => eliminar(e.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg px-2 py-1 text-sm transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
