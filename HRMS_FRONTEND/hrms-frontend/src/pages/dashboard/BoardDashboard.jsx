import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiCalendar } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { reportsService } from '../../services/reportsService';
import { employeesService, departmentsService } from '../../services/employeesService';
import styles from './BoardDashboard.module.css';

export default function BoardDashboard() {
  const navigate = useNavigate();
  const [headcount, setHeadcount] = useState(null);
  const [recruitment, setRecruitment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [hc, rec, depts] = await Promise.all([
          reportsService.getHeadcount(),
          reportsService.getRecruitment(),
          departmentsService.list(),
        ]);
        setHeadcount(hc);
        setRecruitment(rec);
        setDepartments(Array.isArray(depts) ? depts : depts.results || []);
      } catch (err) {
        setError('Failed to load governance data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const total = headcount?.total || 0;
  const byContract = headcount?.by_contract || [];
  const byGender = headcount?.by_gender || [];

  const permanentStaff = byContract.find((c) => c.contract_type === 'permanent')?.count || 0;
  const contractStaff = byContract.find((c) => c.contract_type === 'contract')?.count || 0;
  const maleCount = byGender.find((g) => g.gender === 'M')?.count || 0;
  const femaleCount = byGender.find((g) => g.gender === 'F')?.count || 0;

  if (loading) {
    return (
      <DashboardLayout portalLabel="Board Secretariat" searchPlaceholder="Search resolutions, reports, metrics…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading dashboard…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout portalLabel="Board Secretariat" searchPlaceholder="Search resolutions, reports, metrics…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="Board Secretariat" searchPlaceholder="Search resolutions, reports, metrics…">
      <div className={styles.header}>
        <div>
          <p className={styles.overline}>BOARD OF DIRECTORS — NWSC UGANDA</p>
          <h1 className={styles.title}>Governance & Performance Dashboard</h1>
          <p className={styles.sub}>Workforce Analytics Summary</p>
        </div>
        <div className={styles.headerBtns}>
          <button className={styles.btnOutline} onClick={() => navigate('/reports')}><FiDownload /> Board Pack</button>
          <button className={styles.btnPrimary} onClick={() => navigate('/workforce')}><FiCalendar /> View Workforce</button>
        </div>
      </div>

      {/* KPI grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiVal}>{total.toLocaleString()}</div>
          <div className={styles.kpiLabel}>Total Workforce</div>
          <div className={styles.kpiSub}>Active employees</div>
          <span className={`${styles.kpiTag} ${styles.tagOk}`}>ACTIVE</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiVal}>{departments.length}</div>
          <div className={styles.kpiLabel}>Departments</div>
          <div className={styles.kpiSub}>Organisational units</div>
          <span className={`${styles.kpiTag} ${styles.tagOk}`}>ACTIVE</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiVal}>{maleCount}</div>
          <div className={styles.kpiLabel}>Male Staff</div>
          <div className={styles.kpiSub}>{total > 0 ? Math.round((maleCount / total) * 100) : 0}% of workforce</div>
          <span className={`${styles.kpiTag} ${styles.tagOk}`}>REPORTED</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiVal}>{femaleCount}</div>
          <div className={styles.kpiLabel}>Female Staff</div>
          <div className={styles.kpiSub}>{total > 0 ? Math.round((femaleCount / total) * 100) : 0}% of workforce</div>
          <span className={`${styles.kpiTag} ${styles.tagOk}`}>REPORTED</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiVal}>{permanentStaff.toLocaleString()}</div>
          <div className={styles.kpiLabel}>Permanent Staff</div>
          <div className={styles.kpiSub}>Full-time employees</div>
          <span className={`${styles.kpiTag} ${styles.tagOk}`}>PERMANENT</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiVal}>{contractStaff.toLocaleString()}</div>
          <div className={styles.kpiLabel}>Contract Staff</div>
          <div className={styles.kpiSub}>Fixed-term employees</div>
          <span className={`${styles.kpiTag} ${styles.tagOk}`}>CONTRACT</span>
        </div>
      </div>

      <div className={styles.threeCol}>
        {/* Department Distribution */}
        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <div className={styles.cardHeader}>
            <span>Department Headcount</span>
          </div>
          {headcount?.by_dept && headcount.by_dept.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Active Staff</th>
                  <th>% of Workforce</th>
                </tr>
              </thead>
              <tbody>
                {headcount.by_dept.slice(0, 10).map((d) => (
                  <tr key={d.name}>
                    <td>{d.name}</td>
                    <td>{d.active}</td>
                    <td>{total > 0 ? Math.round((d.active / total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No department data available.</div>
          )}
        </div>

        {/* Contract & Gender Summary */}
        <div className={styles.card}>
          <div className={styles.cardHeader}><span>Workforce Composition</span></div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Contract Type</div>
            {byContract.length > 0 ? byContract.map((c) => (
              <div key={c.contract_type} className={styles.meetItem} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{c.contract_type || 'Unknown'}</span>
                  <strong>{c.count}</strong>
                </div>
              </div>
            )) : <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No data</div>}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Gender</div>
            {byGender.length > 0 ? byGender.map((g) => (
              <div key={g.gender} className={styles.meetItem} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{g.gender === 'M' ? 'Male' : g.gender === 'F' ? 'Female' : 'Other'}</span>
                  <strong>{g.count}</strong>
                </div>
              </div>
            )) : <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No data</div>}
          </div>
        </div>
      </div>

      {/* Recruitment Summary */}
      {recruitment && (
        <div className={styles.card} style={{ marginTop: 'var(--space-md)' }}>
          <div className={styles.cardHeader}><span>📋 Recruitment Overview</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#005a9c' }}>{recruitment.total_jobs || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total Jobs</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>{recruitment.open_jobs || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Open Jobs</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#856404' }}>{recruitment.total_applications || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Applications</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>{recruitment.hired || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Hired</div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}