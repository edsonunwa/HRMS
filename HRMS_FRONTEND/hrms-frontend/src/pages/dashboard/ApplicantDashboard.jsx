import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { jobsService, applicationsService } from '../../services/recruitmentService';
import styles from './ApplicantDashboard.module.css';

const STATUS_COLORS = { interview: '#005a9c', shortlisted: '#856404', review: '#856404', rejected: '#dc3545', hired: '#28a745', closed: '#dc3545' };
const STATUS_LABELS = { interview: 'INTERVIEW STAGE', shortlisted: 'SHORTLISTED', review: 'UNDER REVIEW', rejected: 'REJECTED', hired: 'HIRED', closed: 'CLOSED' };

export default function ApplicantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [appsData, jobsData] = await Promise.all([
          applicationsService.list(),
          jobsService.list(),
        ]);
        setApplications(Array.isArray(appsData) ? appsData : appsData.results || []);
        setJobs(Array.isArray(jobsData) ? jobsData : jobsData.results || []);
      } catch (err) {
        setError('Failed to load application data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const openJobs = jobs.filter((j) => j.status === 'open');
  const firstName = user?.first_name || 'Applicant';

  if (loading) {
    return (
      <DashboardLayout portalLabel="" searchPlaceholder="Search applications, jobs…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading applications…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout portalLabel="" searchPlaceholder="Search applications, jobs…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="" searchPlaceholder="Search applications, jobs…">
      {/* Welcome Banner */}
      <div className={styles.welcomeBanner}>
        <div>
          <h1 className={styles.welcomeTitle}>Welcome back, {firstName}!</h1>
          <p className={styles.welcomeSub}>
            You have {applications.length} application{applications.length !== 1 ? 's' : ''} on file.
            {openJobs.length > 0 && ` There ${openJobs.length === 1 ? 'is' : 'are'} ${openJobs.length} open position${openJobs.length !== 1 ? 's' : ''} available.`}
          </p>
          <div className={styles.welcomeBtns}>
            <button className={styles.btnPrimary} onClick={() => navigate('/recruitment')}>Browse Jobs</button>
            <button className={styles.btnOutline} onClick={() => navigate('/settings')}>Complete Profile</button>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          {/* My Applications */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span>🗂 My Applications</span>
              <button className={styles.viewAll}>View All →</button>
            </div>
            {applications.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No applications yet. Browse open positions to apply.
              </div>
            ) : (
              applications.slice(0, 5).map((app) => (
                <div key={app.id} className={styles.appRow}>
                  <div className={styles.appIcon}>📋</div>
                  <div className={styles.appInfo}>
                    <div className={styles.appTitle}>{app.job?.title || app.job_title || 'Position'}</div>
                    <div className={styles.appMeta}>
                      Applied: {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                      {app.job?.reference && ` • ${app.job.reference}`}
                    </div>
                  </div>
                  <div className={styles.appStatus}>
                    <span className={styles.statusBadge} style={{
                      background: app.status === 'rejected' || app.status === 'closed' ? '#fdecea' : app.status === 'interview' ? '#eaf0ff' : '#fffbe6',
                      color: STATUS_COLORS[app.status] || '#856404',
                    }}>
                      {STATUS_LABELS[app.status] || app.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Open Positions */}
          <div className={styles.card} style={{ marginTop: 'var(--space-md)' }}>
            <div className={styles.cardHeader}>
              <span>⭐ Open Positions</span>
            </div>
            {openJobs.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No open positions at this time.
              </div>
            ) : (
              <div className={styles.jobGrid}>
                {openJobs.slice(0, 4).map((job) => (
                  <div key={job.id} className={styles.jobCard}>
                    <div className={styles.jobHeader}>
                      <div className={styles.jobIcon}>💼</div>
                      <span className={styles.jobType}>{job.job_type || 'Full Time'}</span>
                    </div>
                    <div className={styles.jobTitle}>{job.title}</div>
                    <div className={styles.jobLocation}>{job.location || '—'} • {job.department_name || '—'}</div>
                    <div className={styles.jobFooter}>
                      <span className={styles.jobSalary}>{job.salary_range || '—'}</span>
                      <button className={styles.applyBtn} onClick={() => navigate('/recruitment')}>Apply Now</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.rightCol}>
          {/* Profile Strength */}
          <div className={styles.card}>
            <div className={styles.profileLabel}>PROFILE STRENGTH</div>
            <div className={styles.profilePct}>{user?.profile_photo ? '82%' : '45%'}</div>
            <div className={styles.profileRating}>{user?.profile_photo ? 'Good' : 'Needs Improvement'}</div>
            <div className={styles.profileBar}>
              <div className={styles.profileFill} style={{ width: user?.profile_photo ? '82%' : '45%' }} />
            </div>
            <p className={styles.profileTip}>
              {user?.profile_photo
                ? 'Add your skills and experience to increase your match rate.'
                : 'Upload a profile photo and complete your profile to stand out.'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className={styles.card}>
            <div className={styles.cardHeader}><span>📊 Summary</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#005a9c' }}>{applications.length}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>APPLICATIONS</div>
              </div>
              <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#28a745' }}>{openJobs.length}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>OPEN JOBS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        © 2024 National Water and Sewerage Corporation. All rights reserved. &nbsp;
        <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> · <a href="/contact">Contact Support</a>
      </div>
    </DashboardLayout>
  );
}