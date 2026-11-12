import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ["SUPABASE_DB_URL"]
MIGRATIONS_DIR = Path(__file__).parent / "migrations"

def run_migrations():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        create table if not exists schema_migrations (
            filename text primary key,
            applied_at timestamptz not null default now()
        );
    """)

    cur.execute("select filename from schema_migrations;")
    applied = {row[0] for row in cur.fetchall()}

    for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if sql_file.name in applied:
            print(f"Skipping {sql_file.name} (already applied)")
            continue
        print(f"Applying {sql_file.name}...")
        cur.execute(sql_file.read_text())
        cur.execute("insert into schema_migrations (filename) values (%s);", (sql_file.name,))

    cur.close()
    conn.close()
    print("Done.")

if __name__ == "__main__":
    run_migrations()