-- ============================================
-- LexFlow Pro - Migración SQLite → PostgreSQL
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla: expedientes
CREATE TABLE IF NOT EXISTS expedientes (
  id SERIAL PRIMARY KEY,
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

-- Tabla: etapas
CREATE TABLE IF NOT EXISTS etapas (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  fecha_inicio TEXT,
  fecha_fin TEXT,
  notas TEXT
);

-- Tabla: actuaciones
CREATE TABLE IF NOT EXISTS actuaciones (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  notas TEXT
);

-- Tabla: documentos
CREATE TABLE IF NOT EXISTS documentos (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  archivo TEXT NOT NULL,
  tipo TEXT,
  fecha TEXT
);

-- Tabla: agenda
CREATE TABLE IF NOT EXISTS agenda (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER REFERENCES expedientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'otro',
  fecha TEXT NOT NULL,
  hora TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  notas TEXT
);

-- ============================================
-- Datos ficticios
-- ============================================

INSERT INTO expedientes (numero, tipo, organo, materia, cliente, contraparte, estado, fecha_ingreso, fecha_cierre, descripcion, ultima_consulta) VALUES
  ('EXP-2025-001', 'judicial', 'Juzgado Nacional de 1a Instancia en lo Civil N 15', 'Cobro de pesos', 'Garcia, Juan', 'Paredes S.A.', 'activo', '2025-01-15', NULL, 'Expediente por cobro de deuda comercial', '2026-08-08 21:09'),
  ('EXP-2025-002', 'administrativo', 'Direccion General de Asuntos Administrativos', 'Reclamo administrativo', 'Rodriguez, Maria', 'Municipalidad de Rosario', 'activo', '2025-03-20', NULL, 'Reclamo por resolucion administrativa adversa', '2026-08-05 14:30'),
  ('EXP-2024-003', 'judicial', 'Juzgado Nacional de 1a Instancia del Trabajo N 32', 'Despido sin causa', 'Lopez, Pedro', 'Transportes Rapido S.R.L.', 'cerrado', '2024-06-10', '2025-11-28', 'Sentencia firme. Indemnizacion pagada.', '2025-11-28 09:15'),
  ('EXP-2025-004', 'judicial', 'Juzgado Nacional de 1a Instancia en lo Penal N 8', 'Defraudacion', 'Ministerio Publico', 'Fernandez, Carlos', 'activo', '2025-07-01', NULL, 'Audiencia programada para marzo 2026', NULL),
  ('EXP-2025-005', 'judicial', 'Juzgado de Familia N 12', 'Alimentos', 'Perez, Laura', 'Perez, Martin', 'suspendido', '2025-09-10', NULL, 'Tramite suspendido por conciliacion', '2026-07-20 10:00');

-- Etapas
INSERT INTO etapas (expediente_id, nombre, estado, fecha_inicio, fecha_fin, notas) VALUES
  (1, 'Demanda', 'completada', '2025-01-15', '2025-01-20', 'Demanda presentada'),
  (1, 'Traslado', 'en_curso', '2025-01-25', NULL, 'Corrido traslado a demandado'),
  (1, 'Pruebas', 'pendiente', NULL, NULL, NULL),
  (2, 'Reclamo administrativo', 'completada', '2025-03-20', '2025-03-25', 'Reclamo presentado'),
  (2, 'Resolucion', 'en_curso', '2025-04-01', NULL, 'Esperando resolucion'),
  (3, 'Demanda', 'completada', '2024-06-10', '2024-06-15', NULL),
  (3, 'Pruebas', 'completada', '2024-07-01', '2024-09-30', NULL),
  (3, 'Sentencia', 'completada', '2025-11-15', '2025-11-28', 'Sentencia firme'),
  (4, 'Acusacion', 'en_curso', '2025-07-15', NULL, 'En preparacion'),
  (5, 'Mediacion', 'pendiente', NULL, NULL, 'Pendiente de programar');

-- Actuaciones
INSERT INTO actuaciones (expediente_id, fecha, tipo, descripcion, notas) VALUES
  (1, '2025-01-15', 'escrito', 'Presentacion de demanda por cobro de pesos', 'Monto reclamado: $5.000.000'),
  (1, '2025-01-25', 'notificacion', 'Notificacion a demandado via cedula', NULL),
  (1, '2025-02-10', 'audiencia', 'Audiencia de conciliacion - no hubo acuerdo', 'Se continua con el proceso'),
  (2, '2025-03-20', 'escrito', 'Presentacion de reclamo administrativo', NULL),
  (2, '2025-05-15', 'resolucion', 'Resolucion denegatoria - recurso de apelacion', 'Plazo: 30 dias'),
  (3, '2024-06-10', 'escrito', 'Demanda por despido sin causa', 'Indemnizacion solicitada'),
  (3, '2025-11-28', 'resolucion', 'Sentencia firme - favorable al actor', 'Monto concedido: $3.200.000'),
  (4, '2025-07-01', 'escrito', 'Formalizacion de cargos', NULL),
  (4, '2025-08-20', 'notificacion', 'Notificacion de fecha de audiencia', 'Audiencia: 15/03/2026'),
  (5, '2025-09-10', 'escrito', 'Demanda de alimentos', 'Cuota mensual solicitada: $150.000');

-- Documentos
INSERT INTO documentos (expediente_id, nombre, archivo, tipo, fecha) VALUES
  (1, 'Demanda.pdf', 'demanda_exp001.pdf', 'escrito', '2025-01-15'),
  (1, 'Contrato.pdf', 'contrato_exp001.pdf', 'prueba', '2025-01-15'),
  (2, 'Reclamo.pdf', 'reclamo_exp002.pdf', 'escrito', '2025-03-20'),
  (2, 'Resolucion.pdf', 'resolucion_exp002.pdf', 'resolucion', '2025-05-15'),
  (3, 'Sentencia.pdf', 'sentencia_exp003.pdf', 'resolucion', '2025-11-28'),
  (4, 'Acusacion.pdf', 'acusacion_exp004.pdf', 'escrito', '2025-07-15'),
  (5, 'Demanda_alimentos.pdf', 'demanda_exp005.pdf', 'escrito', '2025-09-10');

-- Agenda
INSERT INTO agenda (expediente_id, titulo, tipo, fecha, hora, estado, notas) VALUES
  (1, 'Audiencia de pruebas', 'audiencia', '2026-03-15', '10:00', 'pendiente', 'Sala 3'),
  (1, 'Vencimiento presentacion de pruebas', 'vencimiento', '2026-02-28', NULL, 'pendiente', 'Plazo final'),
  (2, 'Plazo recurso de apelacion', 'vencimiento', '2026-02-15', NULL, 'pendiente', '30 dias desde resolucion'),
  (4, 'Audiencia de pruebas penales', 'audiencia', '2026-03-15', '09:00', 'pendiente', 'Juzgado Penal N 8'),
  (5, 'Sesion de mediacion', 'audiencia', '2026-02-20', '14:00', 'pendiente', 'Centro de mediacion'),
  (3, 'Cierre de expediente', 'otro', '2025-11-28', '12:00', 'realizada', 'Expediente archivado');
