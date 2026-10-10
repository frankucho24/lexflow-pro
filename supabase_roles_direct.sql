-- ============================================================
-- LexFlow Pro — Roles SIN backend (solo Netlify + Supabase)
-- Usa este archivo EN VEZ de supabase_roles.sql si NO vas a
-- desplegar server.py en Render.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nombre TEXT,
    rol TEXT NOT NULL DEFAULT 'abogado' CHECK (rol IN ('admin', 'abogado', 'secretario')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles read own or all" ON profiles;
DROP POLICY IF EXISTS "profiles insert own" ON profiles;
DROP POLICY IF EXISTS "profiles admin write" ON profiles;

-- Todos los logueados leen (para mostrar nombre/rol en el menú)
CREATE POLICY "profiles read own or all" ON profiles
    FOR SELECT TO authenticated USING (true);

-- Cada usuario puede crear SU propio perfil (alta inicial)
CREATE POLICY "profiles insert own" ON profiles
    FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Admins (marcados en app_metadata.rol='admin') gestionan todos.
-- Se usa app_metadata y NO la tabla profiles para evitar recursión
-- en las políticas RLS.
CREATE POLICY "profiles admin write" ON profiles
    FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- ------------------------------------------------------------
-- Marcarte como admin (1 vez, cambia el email):
--   1) El rol del menú y de las políticas sale de app_metadata.
--   2) El nombre visible sale de profiles (paso 2 anterior).
-- ------------------------------------------------------------
-- UPDATE auth.users
-- SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rol":"admin"}'::jsonb
-- WHERE email = 'danielmsd821@gmail.com';

-- Verificación:
-- SELECT email, raw_app_meta_data->>'rol' AS rol_jwt FROM auth.users;
-- SELECT email, nombre, rol FROM profiles;
--
-- IMPORTANTE Auth → Providers → Email: deja "Confirm email" en OFF
-- para que las cuentas creadas desde Ajustes → Usuarios entren
-- directo con la contraseña temporal (sin link de confirmación).
-- Reset de clave ajena sin backend: el usuario usa "Forgot password"
-- o el admin le envía recovery con:
--   supabase.auth.resetPasswordForEmail(email)
