import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) {
      setError("Credenciales inválidas. Verifica tu email y contraseña.");
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-8 h-8 rounded bg-blue-500" aria-hidden />
          <span className="font-bold text-2xl text-slate-900">LexFlow Pro</span>
        </div>
        <h1 className="text-lg font-semibold text-slate-800">Iniciar sesión</h1>
        <p className="text-sm text-slate-500 mt-1 mb-5">
          Accede con tu cuenta para gestionar los expedientes.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {cargando ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
