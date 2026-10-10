import { useLocation } from "react-router-dom";
import { useMemo } from "react";

function buildCrumb(pathname) {
  if (pathname === "/") return ["Panel General"];
  if (pathname === "/expedientes") return ["Expedientes"];
  if (pathname === "/expedientes/nuevo") return ["Expedientes", "Nuevo expediente"];
  if (/^\/expedientes\/\d+\/editar$/.test(pathname)) return ["Expedientes", "Editar expediente"];
  if (/^\/expedientes\/\d+$/.test(pathname)) return ["Expedientes", "Detalle de expediente"];
  if (pathname === "/agenda") return ["Agenda / Plazos"];
  if (pathname === "/agenda/nuevo") return ["Agenda / Plazos", "Nuevo evento"];
  if (/^\/agenda\/\d+\/editar$/.test(pathname)) return ["Agenda / Plazos", "Editar evento"];
  if (pathname === "/clientes") return ["Clientes"];
  if (pathname === "/ajustes") return ["Ajustes"];
  if (pathname === "/ajustes/usuarios") return ["Ajustes", "Usuarios"];
  if (pathname === "/ajustes/mi-cuenta") return ["Ajustes", "Mi cuenta"];
  return ["LexFlow Pro"];
}

export default function Header({ onMenu = () => {} }) {
  const { pathname } = useLocation();
  const crumb = useMemo(() => buildCrumb(pathname), [pathname]);

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center gap-3">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Abrir menú"
        className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
      >
        ☰
      </button>
      <nav className="text-sm text-slate-500 min-w-0 truncate" aria-label="Ruta de navegación">
        {crumb.map((parte, i) => (
          <span key={`${parte}-${i}`}>
            {i > 0 && <span className="mx-2 text-slate-300">/</span>}
            <span className={i === crumb.length - 1 ? "font-medium text-slate-700" : ""}>
              {parte}
            </span>
          </span>
        ))}
      </nav>
    </header>
  );
}
