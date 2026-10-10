import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import Panel from "./pages/Panel.jsx";
import Expedientes from "./pages/Expedientes.jsx";
import ExpedienteDetalle from "./pages/ExpedienteDetalle.jsx";
import ExpedienteFormulario from "./pages/ExpedienteFormulario.jsx";
import Agenda from "./pages/Agenda.jsx";
import EventoFormulario from "./pages/EventoFormulario.jsx";
import Placeholder from "./pages/Placeholder.jsx";
import Ajustes from "./pages/Ajustes.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import MiCuenta from "./pages/MiCuenta.jsx";
import Login from "./pages/Login.jsx";
import { supabase } from "./supabase.js";
import { miPerfil } from "./adminApi.js";

function RequireAuth({ children }) {
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEstado(data.session ? "ok" : "no");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setEstado(sesion ? "ok" : "no");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (estado === "cargando") {
    return <p className="p-6 text-slate-500">Verificando sesión...</p>;
  }
  if (estado === "no") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    miPerfil()
      .then(({ perfil }) => setEstado(perfil?.es_admin ? "ok" : "no"))
      .catch(() => setEstado("no"));
  }, []);

  if (estado === "cargando") {
    return <p className="p-6 text-slate-500">Verificando permisos...</p>;
  }
  if (estado === "no") {
    return (
      <section className="bg-white border border-amber-200 rounded-xl p-6 shadow-sm text-center">
        <h1 className="font-bold text-slate-900">Acceso restringido</h1>
        <p className="text-sm text-slate-500 mt-1">
          Este módulo es solo para administradores.
        </p>
      </section>
    );
  }
  return children;
}

function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden
        />
      )}
      <Sidebar abierto={menuAbierto} onNavegar={() => setMenuAbierto(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1400px] mx-auto w-full">
            <Routes>
              <Route path="/" element={<Panel />} />
              <Route path="/expedientes" element={<Expedientes />} />
              <Route path="/expedientes/nuevo" element={<ExpedienteFormulario />} />
              <Route path="/expedientes/:id" element={<ExpedienteDetalle />} />
              <Route path="/expedientes/:id/editar" element={<ExpedienteFormulario />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/agenda/nuevo" element={<EventoFormulario />} />
              <Route path="/agenda/:id/editar" element={<EventoFormulario />} />
              <Route path="/clientes" element={<Placeholder titulo="Clientes" />} />
              <Route path="/ajustes" element={<Ajustes />} />
              <Route path="/ajustes/mi-cuenta" element={<MiCuenta />} />
              <Route
                path="/ajustes/usuarios"
                element={
                  <RequireAdmin>
                    <Usuarios />
                  </RequireAdmin>
                }
              />
              <Route path="*" element={<Placeholder titulo="Página no encontrada" />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
