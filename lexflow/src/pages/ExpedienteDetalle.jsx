import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import ExpedienteSummary from "../components/ExpedienteSummary.jsx";
import EtapasModule from "../components/EtapasModule.jsx";
import DocumentosModule from "../components/DocumentosModule.jsx";
import HistorialModule from "../components/HistorialModule.jsx";
import AgendaModule from "../components/AgendaModule.jsx";

export default function ExpedienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [recargando, setRecargando] = useState(false);

  const cargar = () => {
    setError(null);
    api
      .expediente(id)
      .then(setDatos)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const recargar = () => {
    setRecargando(true);
    api
      .expediente(id)
      .then(setDatos)
      .catch((e) => setError(e.message))
      .finally(() => setRecargando(false));
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
        Error: {error}
      </div>
    );
  }
  if (!datos) return <p className="text-slate-500">Cargando...</p>;

  const { expediente, etapas, actuaciones, documentos, agenda } = datos;

  const eliminarExpediente = async () => {
    if (!window.confirm("¿Eliminar este expediente y todos sus datos? Esta acción no se puede deshacer.")) return;
    try {
      await api.eliminarExpediente(expediente.id);
      navigate("/expedientes");
    } catch (e) {
      setError(e.message);
    }
  };

  const agregarEtapa = (valores) => api.agregarEtapa(expediente.id, valores).then(recargar);
  const cambiarEstadoEtapa = (etapaId, estado) =>
    api.cambiarEstadoEtapa(expediente.id, etapaId, estado).then(recargar);
  const eliminarEtapa = (etapaId) => {
    if (!window.confirm("¿Eliminar esta etapa?")) return;
    api.eliminarEtapa(expediente.id, etapaId).then(recargar);
  };

  const agregarActuacion = (valores) => api.agregarActuacion(expediente.id, valores).then(recargar);
  const eliminarActuacion = (actId) => {
    if (!window.confirm("¿Eliminar esta actuación?")) return;
    api.eliminarActuacion(expediente.id, actId).then(recargar);
  };

  const subirDocumento = (formData) => api.subirDocumento(expediente.id, formData).then(recargar);
  const eliminarDocumento = (docId) => {
    if (!window.confirm("¿Eliminar este documento?")) return;
    api.eliminarDocumento(expediente.id, docId).then(recargar);
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
            Expediente {expediente.numero}
          </h1>
          <p className="text-sm text-slate-500 mt-1 break-words">
            {expediente.organo || "Sin órgano"}
            {expediente.materia ? ` · ${expediente.materia}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/expedientes/${expediente.id}/editar`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
          >
            ✏️ Editar
          </Link>
          <button
            type="button"
            onClick={eliminarExpediente}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors min-h-[44px]"
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>

      {recargando && <p className="text-xs text-slate-400">Actualizando...</p>}

      <ExpedienteSummary expediente={expediente} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <div className="space-y-4 sm:space-y-6 min-w-0">
          <EtapasModule
            etapas={etapas}
            expedienteId={expediente.id}
            cargando={recargando}
            onCambiarEstado={cambiarEstadoEtapa}
            onEliminar={eliminarEtapa}
            onAgregar={agregarEtapa}
          />
          <DocumentosModule
            documentos={documentos}
            expedienteId={expediente.id}
            cargando={recargando}
            onEliminar={eliminarDocumento}
            onSubir={subirDocumento}
          />
        </div>
        <div className="space-y-4 sm:space-y-6 min-w-0">
          <HistorialModule
            actuaciones={actuaciones}
            expedienteId={expediente.id}
            cargando={recargando}
            onEliminar={eliminarActuacion}
            onAgregar={agregarActuacion}
          />
          <AgendaModule eventos={agenda} />
        </div>
      </div>
    </>
  );
}
