"""Shared helper functions used across HRMS apps."""
import random
import string
from datetime import date


def generate_employee_id():
    """Generate NWSC-YYMM-NNNN style employee ID, guaranteed unique."""
    from apps.employees.models import Employee
    today = date.today()
    prefix = f"NWSC-{today.strftime('%y%m')}-"
    for _ in range(10):
        candidate = prefix + "".join(random.choices(string.digits, k=4))
        if not Employee.objects.filter(employee_id=candidate).exists():
            return candidate
    raise RuntimeError('Could not generate a unique employee ID after 10 attempts.')


def generate_reference_number(prefix="REF"):
    """Generic reference number for jobs, transfers, etc., guaranteed unique."""
    from apps.recruitment.models import JobPosting
    today = date.today()
    for _ in range(10):
        candidate = f"{prefix}-{today.year}-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not JobPosting.objects.filter(reference_no=candidate).exists():
            return candidate
    raise RuntimeError(f'Could not generate a unique reference number for prefix "{prefix}" after 10 attempts.')


def get_financial_year(d=None):
    """Return financial year string e.g. '2024/25'. FY starts July 1."""
    d = d or date.today()
    start = d.year if d.month >= 7 else d.year - 1
    return f"{start}/{str(start + 1)[-2:]}"


def age_from_dob(dob):
    """Calculate age in years from a date of birth."""
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))