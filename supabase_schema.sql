-- ============================================================
-- LexFlow Pro — Esquema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS expedientes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('judicial', 'administrativo')),
    organo TEXT,
    materia TEXT,
    cliente TEXT,
    contraparte TEXT,
    estado TEXT NOT NULL DEFAULT 'activo',
    fecha_ingreso TEXT,
    fecha_cierre TEXT,
    descripcion TEXT,
    ultima_consulta TEXT
);

CREATE TABLE IF NOT EXISTS etapas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expediente_id BIGINT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    fecha_inicio TEXT,
    fecha_fin TEXT,
    notas TEXT
);

CREATE TABLE IF NOT EXISTS actuaciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expediente_id BIGINT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    notas TEXT
);

CREATE TABLE IF NOT EXISTS documentos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expediente_id BIGINT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    archivo TEXT NOT NULL,
    tipo TEXT,
    fecha TEXT
);

CREATE TABLE IF NOT EXISTS agenda (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expediente_id BIGINT REFERENCES expedientes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'otro',
    fecha TEXT NOT NULL,
    hora TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    notas TEXT
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_expedientes_tipo ON expedientes(tipo);
CREATE INDEX IF NOT EXISTS idx_expedientes_estado ON expedientes(estado);
CREATE INDEX IF NOT EXISTS idx_expedientes_numero ON expedientes(numero);
CREATE INDEX IF NOT EXISTS idx_etapas_exp ON etapas(expediente_id);
CREATE INDEX IF NOT EXISTS idx_actuaciones_exp ON actuaciones(expediente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_exp ON documentos(expediente_id);
CREATE INDEX IF NOT EXISTS idx_agenda_exp ON agenda(expediente_id);
CREATE INDEX IF NOT EXISTS idx_agenda_fecha ON agenda(fecha);

-- ============================================================
-- Seguridad: RLS activado SIN políticas (denegar acceso directo).
-- Todo el acceso pasa por el backend (server.py) con la
-- service key, que valida el JWT de Supabase Auth.
-- ============================================================
ALTER TABLE expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE actuaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
