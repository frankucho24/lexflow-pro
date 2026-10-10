import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { miPerfil } from "../adminApi";

const NAV_ITEMS = [
  { to: "/", icon: "📊", label: "Panel General" },
  { to: "/expedientes", icon: "📂", label: "Expedientes" },
  { to: "/agenda", icon: "📅", label: "Agenda / Plazos" },
  { to: "/clientes", icon: "👥", label: "Clientes" },
  { to: "/ajustes", icon: "⚙️", label: "Ajustes" },
  { to: "/ajustes/usuarios", icon: "🔑", label: "Usuarios", adminOnly: true },
];

function NavLinkItem({ item, onNavegar }) {
  const base =
    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 min-h-[48px]";
  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavegar}
      className={({ isActive }) =>
        `${base} ${
          isActive
            ? "bg-slate-800 text-blue-400 border-blue-500"
            : "text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200"
        }`
      }
    >
      <span aria-hidden>{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

export default function Sidebar({ abierto = false, onNavegar = () => {} }) {
  const navigate = useNavigate();
  const [sesionTxt, setSesionTxt] = useState("Sesión…");
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    miPerfil()
      .then(({ user, perfil }) => {
        if (!user) return;
        const nombre = perfil?.nombre || user.email || "Sesión";
        const rol = perfil?.rol ? ` · ${perfil.rol}` : "";
        setSesionTxt(`Sesión: ${nombre}${rol}`);
        setEsAdmin(perfil?.es_admin === true);
      })
      .catch(() => {});
  }, []);

  const salir = async () => {
    await supabase.auth.signOut();
    onNavegar();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={`w-64 max-w-[85vw] bg-slate-900 text-white flex flex-col shrink-0 z-40
        fixed inset-y-0 left-0 transition-transform duration-200
        ${abierto ? "translate-x-0" : "-translate-x-full"}
        lg:static lg:translate-x-0 lg:h-full`}
    >
      <div className="flex items-center justify-between gap-2.5 px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-6 h-6 rounded bg-blue-500 shrink-0" aria-hidden />
          <span className="font-bold text-xl truncate">LexFlow Pro</span>
        </div>
        <button
          type="button"
          onClick={onNavegar}
          aria-label="Cerrar menú"
          className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.filter((item) => !item.adminOnly || esAdmin).map((item) => (
          <NavLinkItem key={item.label} item={item} onNavegar={onNavegar} />
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-800 space-y-2">
        <p className="text-xs text-slate-500 truncate">{sesionTxt}</p>
        <button
          type="button"
          onClick={salir}
          className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded px-2 py-2 transition-colors min-h-[44px]"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
