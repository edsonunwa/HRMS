# Database Configuration Guide

## Overview
The backend now supports both **SQLite** (default) and **MySQL** databases. You can switch between them by editing the `.env` file.

## Current Configuration

### Default: SQLite
The application is configured to use **SQLite** by default. No additional setup is required.

**`.env` settings:**
```env
DB_ENGINE=sqlite
DB_NAME=hrms_db.sqlite3
```

The SQLite database file will be created at: `HRMS_BACKEND/db.sqlite3`

### Switching to MySQL

To use MySQL instead of SQLite, edit your `.env` file:

```env
DB_ENGINE=mysql
DB_NAME=hrms_db
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
```

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

| Setting | SQLite (Default) | MySQL |
|---------|------------------|-------|
| `DB_ENGINE` | `sqlite` | `mysql` |
| `DB_NAME` | `hrms_db.sqlite3` | `hrms_db` |
| `DB_USER` | *(not needed)* | `root` |
| `DB_PASSWORD` | *(not needed)* | `your_password` |
| `DB_HOST` | *(not needed)* | `localhost` |
| `DB_PORT` | *(not needed)* | `3306` |

## Files Modified

1. `.env.example` - Added database engine option
2. `config/database.py` - Dynamic database configuration
3. `config/__init__.py` - Module initialization
4. `hrms_project/settings/base.py` - Uses dynamic config