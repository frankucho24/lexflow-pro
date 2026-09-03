import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

const ESTADOS = ["activo", "suspendido", "cerrado"];

const VACIO = {
  numero: "",
  tipo: "judicial",
  organo: "",
  materia: "",
  cliente: "",
  contraparte: "",
  estado: "activo",
  fecha_ingreso: "",
  fecha_cierre: "",
  descripcion: "",
};

export default function ExpedienteFormulario() {
  const { id } = useParams();
  const editar = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [cargando, setCargando] = useState(editar);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!editar) return;
    api
      .expediente(id)
      .then((datos) => {
        const { expediente } = datos;
        setForm({
          numero: expediente.numero,
          tipo: expediente.tipo,
          organo: expediente.organo || "",
          materia: expediente.materia || "",
          cliente: expediente.cliente || "",
          contraparte: expediente.contraparte || "",
          estado: expediente.estado,
          fecha_ingreso: expediente.fecha_ingreso || "",
          fecha_cierre: expediente.fecha_cierre || "",
          descripcion: expediente.descripcion || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [editar, id]);

  const cambio = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const resultado = editar
        ? await api.editarExpediente(id, form)
        : await api.crearExpediente(form);
      navigate(editar ? `/expedientes/${id}` : `/expedientes/${resultado.id}`);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  const Campo = ({ label, nombre, tipo = "text", required, placeholder, extra }) => (
    <div className={extra || ""}>
      <label htmlFor={nombre} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={nombre}
        name={nombre}
        type={tipo}
        required={required}
        placeholder={placeholder}
        value={form[nombre]}
        onChange={cambio(nombre)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          {editar ? "Editar expediente" : "Nuevo expediente"}
        </h1>
        <Link to="/expedientes" className="text-sm text-slate-600 hover:underline">
          ← Volver
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
          Error: {error}
        </div>
      )}

      {cargando ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <form
          onSubmit={guardar}
          className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm space-y-5"
        >
          <Campo label="Número de expediente" nombre="numero" required placeholder="Ej. 1234-2026" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-slate-700 mb-1">
                Tipo<span className="text-red-600"> *</span>
              </label>
              <select
                id="tipo"
                value={form.tipo}
                onChange={cambio("tipo")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="judicial">Judicial</option>
                <option value="administrativo">Administrativo</option>
              </select>
            </div>
            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-slate-700 mb-1">
                Estado
              </label>
              <select
                id="estado"
                value={form.estado}
                onChange={cambio("estado")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ESTADOS.map((es) => (
                  <option key={es} value={es}>
                    {es}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Campo label="Órgano / Juzgado" nombre="organo" placeholder="Ej. Juzgado Civil N° 3" />
            <Campo label="Materia" nombre="materia" placeholder="Ej. Civil, Penal, Laboral..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Campo label="Cliente" nombre="cliente" />
            <Campo label="Contraparte" nombre="contraparte" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Campo label="Fecha de ingreso" nombre="fecha_ingreso" tipo="date" />
            <Campo label="Fecha de cierre" nombre="fecha_cierre" tipo="date" />
          </div>

          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-slate-700 mb-1">
              Descripción / Observaciones
            </label>
            <textarea
              id="descripcion"
              rows={3}
              value={form.descripcion}
              onChange={cambio("descripcion")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <Link
              to={editar ? `/expedientes/${id}` : "/expedientes"}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </>
  );
}

