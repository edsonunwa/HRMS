"""Database configuration builder."""
from pathlib import Path
from urllib.parse import parse_qsl, urlparse

from decouple import config


BASE_DIR = Path(__file__).resolve().parent.parent.parent


def get_db_config():
    database_url = config("DATABASE_URL", default="")

    if database_url:
        parsed_url = urlparse(database_url)
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed_url.path.lstrip("/"),
            "USER": parsed_url.username or "",
            "PASSWORD": parsed_url.password or "",
            "HOST": parsed_url.hostname or "",
            "PORT": parsed_url.port or 5432,
            "OPTIONS": dict(parse_qsl(parsed_url.query)),
        }

    db_engine = config("DB_ENGINE", default="sqlite").lower()

    if db_engine == "mysql":
        return {
            "ENGINE":   "django.db.backends.mysql",
            "NAME":     config("DB_NAME",     default="hrms_db"),
            "USER":     config("DB_USER",     default="root"),
            "PASSWORD": config("DB_PASSWORD", default=""),
            "HOST":     config("DB_HOST",     default="127.0.0.1"),
            "PORT":     config("DB_PORT",     default="3306"),
            "OPTIONS":  {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
        }

    # Default: SQLite
    return {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME":   config("DB_NAME", default=BASE_DIR / "db.sqlite3"),
    }
