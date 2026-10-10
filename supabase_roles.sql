-- ============================================================
-- LexFlow Pro — Roles y administración (Opción A)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Requiere: supabase_schema.sql ya ejecutado.
-- Crea la tabla profiles vinculada a auth.users.
-- La app usa:
--   * Frontend (anon key): solo LEE profiles (para saber si soy admin).
--   * Backend server.py (service key): CREA/ACTUALIZA/BORRA
--     usuarios Auth + profiles. Nadie puede auto-darse admin
--     desde el frontend porque no hay política de escritura para
--     authenticated.
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
CREATE POLICY "profiles read own or all" ON profiles
    FOR SELECT TO authenticated USING (true);

-- Sin políticas INSERT/UPDATE/DELETE para authenticated:
-- solo service_role (backend) puede escribir. Esto evita que un
-- usuario se promueva a admin desde el navegador.

-- Promover a admin tu cuenta actual (ejecutar tras crear el
-- usuario en Authentication → Users). Cambia el email:
-- INSERT INTO profiles (id, email, nombre, rol)
-- SELECT id, email, 'Dra. Martínez', 'admin' FROM auth.users
-- WHERE email = 'danielmsd821@gmail.com'
-- ON CONFLICT (id) DO UPDATE SET rol = 'admin', email = EXCLUDED.email;
