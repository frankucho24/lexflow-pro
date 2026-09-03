import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

const ESTADOS = ["pendiente", "realizada", "cancelada"];

const VACIO = {
  expediente_id: "",
  titulo: "",
  tipo: "otro",
  fecha: new Date().toISOString().slice(0, 10),
  hora: "",
  estado: "pendiente",
  notas: "",
};

export default function EventoFormulario() {
  const { id } = useParams();
  const editar = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(editar);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .opcionesExpedientes()
      .then(setExpedientes)
      .catch((e) => setError(e.message));
    if (!editar) return;
    api
      .agenda()
      .then((lista) => {
        const evento = lista.find((e) => e.id === Number(id));
        if (!evento) throw new Error("Evento no encontrado.");
        setForm({
          expediente_id: evento.expediente_id ? String(evento.expediente_id) : "",
          titulo: evento.titulo,
          tipo: evento.tipo,
          fecha: evento.fecha,
          hora: evento.hora || "",
          estado: evento.estado,
          notas: evento.notas || "",
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
      if (editar) {
        await api.editarEvento(id, form);
        navigate("/agenda");
      } else {
        await api.crearEvento(form);
        navigate("/agenda");
      }
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  const Campo = ({ label, nombre, tipo = "text", required, placeholder, value }) => (
    <div>
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
        value={value ?? form[nombre]}
        onChange={cambio(nombre)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          {editar ? "Editar evento" : "Nuevo evento"}
        </h1>
        <Link to="/agenda" className="text-sm text-slate-600 hover:underline">
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
          <Campo label="Título" nombre="titulo" required placeholder="Ej. Audiencia, Vence plazo de contestación..." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-slate-700 mb-1">
                Tipo
              </label>
              <select
                id="tipo"
                value={form.tipo}
                onChange={cambio("tipo")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="audiencia">Audiencia</option>
                <option value="vencimiento">Vencimiento</option>
                <option value="otro">Otro</option>
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
            <Campo label="Fecha" nombre="fecha" tipo="date" required />
            <Campo label="Hora" nombre="hora" tipo="time" />
          </div>

          <div>
            <label htmlFor="expediente_id" className="block text-sm font-medium text-slate-700 mb-1">
              Expediente relacionado
            </label>
            <select
              id="expediente_id"
              value={form.expediente_id}
              onChange={cambio("expediente_id")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sin expediente —</option>
              {expedientes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.numero} ({x.tipo === "judicial" ? "Judicial" : "Administrativo"})
                  {x.cliente ? ` - ${x.cliente}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notas" className="block text-sm font-medium text-slate-700 mb-1">
              Notas
            </label>
            <textarea
              id="notas"
              rows={3}
              value={form.notas}
              onChange={cambio("notas")}
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
              to="/agenda"
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

