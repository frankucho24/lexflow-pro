import os
from datetime import date

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

TIPOS_EXPEDIENTE = ["judicial", "administrativo"]
ESTADOS_EXPEDIENTE = ["activo", "suspendido", "cerrado"]
ESTADOS_ETAPA = ["pendiente", "en_curso", "completada"]
ESTADOS_AGENDA = ["pendiente", "realizada", "cancelada"]
TIPOS_ACTUACION = ["escrito", "audiencia", "resolucion", "notificacion", "otro"]


def get_connection():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def init_db():
    sql_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrations", "lexflow.sql")
    if not os.path.exists(sql_path):
        return
    conn = get_connection()
    try:
        cur = conn.cursor()
        with open(sql_path, "r", encoding="utf-8") as f:
            sql = f.read()
        cur.execute(sql)
        conn.commit()
    except psycopg2.errors.DuplicateTable:
        conn.rollback()
    except Exception:
        conn.rollback()
    finally:
        conn.close()


def hoy():
    return date.today().isoformat()
