import { useRef, useState } from "react";

export default function DocumentosModule({ documentos, expedienteId, cargando, onEliminar, onSubir }) {
  const inputRef = useRef(null);
  const [tipoDoc, setTipoDoc] = useState("");
  const [arrastrando, setArrastrando] = useState(false);

  const subir = (archivo) => {
    if (!archivo) return;
    const formData = new FormData();
    formData.append("archivo", archivo);
    if (tipoDoc) formData.append("tipo_documento", tipoDoc);
    onSubir(formData);
  };

  const onArchivoSeleccionado = (e) => {
    const archivo = e.target.files?.[0];
    if (archivo) subir(archivo);
    e.target.value = "";
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <header className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <h2 className="text-base font-semibold text-slate-900">📄 Documentos Adjuntos</h2>
      </header>

      <div className="px-4 sm:px-5 space-y-2">
        {documentos.length === 0 && (
          <p className="text-sm text-slate-400 italic">Sin documentos adjuntos.</p>
        )}
        {documentos.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
          >
            <span className="text-lg" aria-hidden>
              📎
            </span>
            <div className="flex-1 min-w-0">
              <a
                href={doc.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-blue-700 hover:underline truncate block"
                title={doc.nombre}
              >
                {doc.nombre}
              </a>
              <p className="text-xs text-slate-500">
                {[doc.tipo, doc.fecha].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEliminar(doc.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg px-2 py-1 text-sm transition-colors"
              aria-label={`Eliminar ${doc.nombre}`}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <div className="px-4 sm:px-5 py-4 space-y-2.5">
        <input
          type="text"
          placeholder="Tipo de documento (ej. demanda, poder, resolución)"
          value={tipoDoc}
          onChange={(e) => setTipoDoc(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            arrastrando
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            subir(e.dataTransfer.files?.[0]);
          }}
        >
          <span className="text-2xl" aria-hidden>
            📁
          </span>
          <span className="text-sm text-slate-600">
            Arrastra y suelta aquí tus documentos
          </span>
          <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            {cargando ? "Subiendo..." : "Examinar equipo"}
          </span>
          <input type="file" ref={inputRef} className="sr-only" onChange={onArchivoSeleccionado} />
        </label>
      </div>
    </section>
  );
}

