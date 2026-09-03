import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, TIPOS } from "../api";

const ESTADOS = ["activo", "suspendido", "cerrado"];

export default function Expedientes() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState({ q: "", tipo: "", estado: "" });
  const [aplicados, setAplicados] = useState({ q: "", tipo: "", estado: "" });
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = (params) => {
    setCargando(true);
    setError(null);
    api
      .expedientes(params)
      .then((lista) => {
        setExpedientes(lista);
        setAplicados(params);
      })
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

  const limpiar = () => {
    setFiltros({ q: "", tipo: "", estado: "" });
    cargar({});
  };

  const hayFiltros = aplicados.q || aplicados.tipo || aplicados.estado;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Expedientes</h1>
        <Link
          to="/expedientes/nuevo"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap min-h-[44px]"
        >
          + Nuevo expediente
        </Link>
      </div>

      <form className="flex flex-wrap gap-2.5" onSubmit={buscar}>
        <input
          type="text"
          placeholder="Buscar número, cliente, materia..."
          value={filtros.q}
          onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))}
          className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtros.tipo}
          onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          <option value="judicial">Judicial</option>
          <option value="administrativo">Administrativo</option>
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
        {hayFiltros && (
          <button
            type="button"
            onClick={limpiar}
            className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Limpiar
          </button>
        )}
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
          Error: {error}
        </div>
      )}

      {cargando ? (
        <p className="text-slate-500">Cargando...</p>
      ) : expedientes.length === 0 ? (
        <p className="text-slate-400 italic">
          No se encontraron expedientes con los filtros aplicados.
        </p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 bg-slate-50">
                <th className="py-2.5 px-4 font-semibold">Número</th>
                <th className="py-2.5 px-2 font-semibold">Tipo</th>
                <th className="py-2.5 px-2 font-semibold hidden lg:table-cell">Órgano / Juzgado</th>
                <th className="py-2.5 px-2 font-semibold hidden md:table-cell">Materia</th>
                <th className="py-2.5 px-2 font-semibold">Cliente</th>
                <th className="py-2.5 px-2 font-semibold">Estado</th>
                <th className="py-2.5 px-2 font-semibold">Última actuación</th>
                <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">Última consulta</th>
              </tr>
            </thead>
            <tbody>
              {expedientes.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/expedientes/${e.id}`)}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-2.5 px-4 font-medium text-slate-900 break-words">{e.numero}</td>
                  <td className="py-2.5 px-2">
                    <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
                      {TIPOS[e.tipo]}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 hidden lg:table-cell">{e.organo || "—"}</td>
                  <td className="py-2.5 px-2 hidden md:table-cell">{e.materia || "—"}</td>
                  <td className="py-2.5 px-2">{e.cliente || "—"}</td>
                  <td className="py-2.5 px-2">
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-semibold uppercase whitespace-nowrap">
                      {e.estado}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 max-w-[220px]">
                    <span className="block truncate text-slate-600" title={e.ultima_actuacion}>
                      {e.ultima_actuacion || (e.ultimo_documento ? `📎 ${e.ultimo_documento}` : "—")}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap hidden sm:table-cell">
                    {e.ultima_consulta || "—"}
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
