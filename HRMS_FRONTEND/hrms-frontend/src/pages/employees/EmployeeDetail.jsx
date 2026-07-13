import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/common/StatusBadge';
import { employeesService } from '../../services/employeesService';
import styles from './EmployeeDetail.module.css';

function Field({ label, value }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value ?? '—'}</span>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    employeesService.get(id)
      .then(setEmployee)
      .catch((err) => {
        const code = err.response?.status;
        if (code === 404 || code === 403) {
          setError('not_found');
        } else {
          setError('failed');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (!loading && error === 'not_found') {
    return (
      <DashboardLayout portalLabel="Workforce" searchPlaceholder="Search employees…">
        <button className={styles.back} onClick={() => navigate('/workforce')}>
          <FiArrowLeft /> Back to Workforce
        </button>
        <div className={styles.notFound}>
          <span className={styles.notFoundCode}>404</span>
          <p>This employee record doesn't exist or you don't have access to it.</p>
          <button className={styles.back} onClick={() => navigate('/workforce')}>Go back</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="Workforce" searchPlaceholder="Search employees…">
      <button className={styles.back} onClick={() => navigate('/workforce')}>
        <FiArrowLeft /> Back to Workforce
      </button>

      {loading && <div className={styles.empty}>Loading…</div>}
      {error === 'failed' && <div className={styles.errorBanner}>Failed to load employee record. Please try again.</div>}

      {employee && (
        <div className={styles.page}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.title}>{employee.full_name}</h1>
              <p className={styles.sub}>{employee.employee_id} · {employee.position_title || employee.position?.title || '—'}</p>
            </div>
            <StatusBadge status={employee.employment_status} />
          </div>

          <div className={styles.grid}>
            {/* Personal Details */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Personal Details</h2>
              <Field label="Full Name" value={employee.full_name} />
              <Field label="Employee ID" value={employee.employee_id} />
              <Field label="Gender" value={employee.gender === 'M' ? 'Male' : employee.gender === 'F' ? 'Female' : employee.gender === 'O' ? 'Other' : employee.gender} />
              <Field label="Date of Birth" value={employee.date_of_birth} />
              <Field label="National ID" value={employee.national_id} />
              <Field label="Nationality" value={employee.nationality} />
              <Field label="Address" value={employee.address} />
              <Field label="Next of Kin" value={employee.next_of_kin} />
              <Field label="Next of Kin Contact" value={employee.next_of_kin_contact} />
            </div>

            {/* Employment Details */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Employment Details</h2>
              <Field label="Department" value={employee.department_name || employee.department?.name || '—'} />
              <Field label="Position" value={employee.position_title || employee.position?.title || '—'} />
              <Field label="Grade" value={employee.grade?.title || employee.grade || '—'} />
              <Field label="Supervisor" value={employee.supervisor_name || '—'} />
              <Field label="Employment Status" value={<StatusBadge status={employee.employment_status} />} />
              <Field label="Contract Type" value={employee.contract_type} />
              <Field label="Join Date" value={employee.join_date} />
              <Field label="Confirmation Date" value={employee.confirmation_date || '—'} />
              <Field label="Termination Date" value={employee.termination_date || '—'} />
              <Field label="Basic Salary" value={employee.basic_salary ? `UGX ${Number(employee.basic_salary).toLocaleString()}` : '—'} />
            </div>

            {/* Tax & Social Security */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Tax & Social Security</h2>
              <Field label="TIN Number" value={employee.tin_number || '—'} />
              <Field label="NSSF Number" value={employee.nssf_number || '—'} />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}