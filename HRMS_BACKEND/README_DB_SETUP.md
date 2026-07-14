# Database Configuration Guide

## Overview

The backend now supports an optional **Neon/PostgreSQL** connection through `DATABASE_URL`, while keeping **SQLite** as the default local database.

## Current Configuration

### Default: SQLite

The application is configured to use **SQLite** by default when `DATABASE_URL` is not set. No additional setup is required.

**`.env` settings:**

```env
DATABASE_URL=
DB_ENGINE=sqlite
DB_NAME=hrms_db.sqlite3
```

The SQLite database file will be created at: `HRMS_BACKEND/db.sqlite3`

### Using Neon / PostgreSQL

To use Neon, set `DATABASE_URL` to the connection string provided by Neon:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

When `DATABASE_URL` is present, it overrides the local SQLite settings.

### Optional MySQL

If you still want to use MySQL locally, set `DB_ENGINE=mysql` and provide the MySQL fields in `.env`.

## Virtual Environment Setup

If you're getting import errors for `python-decouple`, follow these steps:

### 1. Activate your virtual environment

```bash
# On macOS/Linux
source venv/bin/activate

# OR if using .venv
source .venv/bin/activate

# On Windows
venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Verify installation

```bash
python -c "import decouple; print('decouple version:', decouple.__version__)"
```

If this fails, install it directly:

```bash
pip install python-decouple
```

## Troubleshooting

### Issue: "No module named 'decouple'"

**Solution:**

```bash
# Make sure virtual environment is activated
source venv/bin/activate  # or your venv path

# Install the package
pip install python-decouple

# Verify
python -c "import decouple; print('OK')"
```

### Issue: "No module named 'config'"

This means the local `config` module isn't being found. Ensure:

1. You're running from the `HRMS_BACKEND` directory
2. The file `HRMS_BACKEND/config/__init__.py` exists
3. The file `HRMS_BACKEND/config/database.py` exists

### Issue: Database connection errors

**For SQLite:**

- Check file permissions in `HRMS_BACKEND/` directory
- Ensure the directory is writable

**For PostgreSQL / Neon:**

- Verify the `DATABASE_URL` value is correct
- Ensure the `psycopg2` package is installed
- Keep `sslmode=require` in the Neon URL

**For MySQL:**

- Verify MySQL server is running: `mysql -u root -p`
- Check credentials in `.env` match your MySQL setup
- Ensure MySQL user has database creation privileges

## Testing the Configuration

Run Django's system checks:

```bash
python manage.py check
```

If successful, you'll see:

```
System check identified no issues (0 silenced).
```

## Quick Reference

| Setting        | SQLite (Default)  | Neon / PostgreSQL | MySQL           |
| -------------- | ----------------- | ----------------- | --------------- |
| `DATABASE_URL` | _(empty)_         | required          | _(empty)_       |
| `DB_ENGINE`    | `sqlite`          | ignored           | `mysql`         |
| `DB_NAME`      | `hrms_db.sqlite3` | from URL          | `hrms_db`       |
| `DB_USER`      | _(not needed)_    | from URL          | `root`          |
| `DB_PASSWORD`  | _(not needed)_    | from URL          | `your_password` |
| `DB_HOST`      | _(not needed)_    | from URL          | `localhost`     |
| `DB_PORT`      | _(not needed)_    | from URL          | `3306`          |

## Files Modified

1. `.env.example` - Added database engine option
2. `config/database.py` - Dynamic database configuration
3. `config/__init__.py` - Module initialization
4. `hrms_project/settings/base.py` - Uses dynamic config
