import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, miPerfil, TIENE_BACKEND } from "../adminApi";

export default function Ajustes() {
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    miPerfil()
      .then(({ perfil }) => setPerfil(perfil))
      .catch(() => setPerfil(null));
  }, []);

  const esAdmin = perfil?.es_admin;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ajustes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">👤 Mi cuenta</h2>
          <p className="text-sm text-slate-500 mt-1">
            {perfil ? `${perfil.email} · rol ${perfil.rol}` : "Ver tu sesión y cambiar tu contraseña."}
          </p>
          <Link
            to="/ajustes/mi-cuenta"
            className="mt-3 inline-flex px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700 min-h-[44px] items-center"
          >
            Abrir mi cuenta
          </Link>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">👥 Usuarios y contraseñas</h2>
          <p className="text-sm text-slate-500 mt-1">
            {esAdmin
              ? "Crear cuentas para el equipo, resetear contraseñas y asignar roles."
              : "Solo administradores. Si no ves el módulo, pide a tu admin que te promueva."}
          </p>
          {esAdmin ? (
            <Link
              to="/ajustes/usuarios"
              className="mt-3 inline-flex px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 min-h-[44px] items-center"
            >
              Gestionar usuarios
            </Link>
          ) : (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              {TIENE_BACKEND
                ? "Requiere rol admin. Pide a tu admin que te promueva."
                : "Requiere rol admin (app_metadata + profiles). Ejecuta supabase_roles_direct.sql y márcate admin."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
