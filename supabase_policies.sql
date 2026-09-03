-- ============================================================
-- LexFlow Pro — Políticas RLS para acceso directo del frontend
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Requiere: supabase_schema.sql ya ejecutado.
-- La app usa login único compartido: usuarios autenticados
-- tienen acceso total. El acceso anónimo sigue denegado.
-- ============================================================

-- Limpieza por si se ejecuta más de una vez
DROP POLICY IF EXISTS "auth full access" ON expedientes;
DROP POLICY IF EXISTS "auth full access" ON etapas;
DROP POLICY IF EXISTS "auth full access" ON actuaciones;
DROP POLICY IF EXISTS "auth full access" ON documentos;
DROP POLICY IF EXISTS "auth full access" ON agenda;
DROP POLICY IF EXISTS "auth read documentos" ON storage.objects;
DROP POLICY IF EXISTS "auth insert documentos" ON storage.objects;
DROP POLICY IF EXISTS "auth delete documentos" ON storage.objects;

-- Tablas: acceso total para usuarios con sesión iniciada
CREATE POLICY "auth full access" ON expedientes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full access" ON etapas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full access" ON actuaciones
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full access" ON documentos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full access" ON agenda
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket "documentos" (privado): leer, subir y borrar
-- solo con sesión iniciada. Los enlaces firmados los genera el cliente.
CREATE POLICY "auth read documentos" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "auth insert documentos" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "auth delete documentos" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'documentos');
