import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiCheck, FiMessageSquare } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { traineesService, trainingProgramsService } from '../../services/traineesService';
import styles from './InternDashboard.module.css';

export default function InternDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    async function loadData() {
      try {
        const [progData, traineeData] = await Promise.all([
          trainingProgramsService.list(),
          traineesService.list({ limit: 10 }),
        ]);
        setPrograms(Array.isArray(progData) ? progData : progData.results || []);
        setTrainees(Array.isArray(traineeData) ? traineeData : traineeData.results || []);
      } catch (err) {
        setError('Failed to load internship data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const firstName = user?.first_name || 'Intern';
  const myPrograms = programs.filter((p) => p.status === 'active' || p.status === 'in_progress');
  const activeGrads = trainees.filter((t) => t.status === 'active' || t.status === 'in_progress').length;

  if (loading) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search modules, tasks, resources…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading internship data…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search modules, tasks, resources…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search modules, tasks, resources…">
      {/* Welcome banner */}
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div className={styles.internTag}>INTERN · {greeting}</div>
          <h1 className={styles.bannerTitle}>{greeting}, {firstName}.</h1>
          <p className={styles.bannerSub}>
            {myPrograms.length > 0
              ? `You are enrolled in ${myPrograms.length} training program${myPrograms.length !== 1 ? 's' : ''}.`
              : 'Explore available training programs to get started.'}
          </p>
          <div className={styles.bannerProgress}>
            <div className={styles.bannerBar}>
              <div className={styles.bannerFill} style={{ width: `${myPrograms.length > 0 ? Math.min(myPrograms.length * 25, 100) : 0}%` }} />
            </div>
            <span className={styles.bannerPct}>In Progress</span>
          </div>
        </div>
        <div className={styles.bannerRight}>
          <div className={styles.daysLeft}>
            <div className={styles.daysNum}>{programs.length}</div>
            <div className={styles.daysSub}>Programs Available</div>
          </div>
          <button className={styles.downloadBtn} onClick={() => navigate('/trainees')}><FiDownload /> Resources</button>
        </div>
      </div>

      <div className={styles.topStats}>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{myPrograms.length}</div>
          <div className={styles.statLbl}>Active Programs</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{programs.length}</div>
          <div className={styles.statLbl}>Total Programs</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{activeGrads}</div>
          <div className={styles.statLbl}>Active Trainees</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{trainees.length}</div>
          <div className={styles.statLbl}>All Trainees</div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          {/* Training Programs */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span>📋 Training Programs</span>
              <span className={styles.taskCount}>{programs.length} programs</span>
            </div>
            {programs.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No programs available.
              </div>
            ) : (
              programs.slice(0, 6).map((prog) => (
                <div key={prog.id} className={styles.taskRow}>
                  <button className={`${styles.taskCheck} ${prog.status === 'completed' ? styles.checked : ''}`}>
                    {prog.status === 'completed' && <FiCheck size={10} />}
                  </button>
                  <div className={styles.taskBody}>
                    <div className={styles.taskText}>{prog.name || prog.title}</div>
                    <div className={`${styles.taskDue} ${prog.status === 'active' || prog.status === 'in_progress' ? styles.urgent : ''}`}>
                      {prog.status || 'Active'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.rightCol}>
          {/* Quick Info */}
          <div className={styles.supervisorCard}>
            <div className={styles.supLabel}>INTERN PROGRAM</div>
            <div className={styles.supRow}>
              <div className={styles.supAva}>{firstName[0]}</div>
              <div>
                <div className={styles.supName}>{user?.full_name || firstName}</div>
                <div className={styles.supRole}>Student Intern</div>
                <div className={styles.supEmail}>{user?.email || '—'}</div>
              </div>
            </div>
            <button className={styles.chatBtn} onClick={() => window.location.href = 'mailto:training@nwsc.co.ug'}><FiMessageSquare /> Contact Coordinator</button>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}><span>📅 Quick Summary</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className={styles.deadlineRow}>
                <div className={styles.ddDate} style={{ background: '#005a9c' }}>
                  <div className={styles.ddDay}>{programs.length}</div>
                  <div className={styles.ddMon}>PRG</div>
                </div>
                <div className={styles.ddLabel}>Available Programs</div>
              </div>
              <div className={styles.deadlineRow}>
                <div className={styles.ddDate} style={{ background: '#28a745' }}>
                  <div className={styles.ddDay}>{activeGrads}</div>
                  <div className={styles.ddMon}>ACT</div>
                </div>
                <div className={styles.ddLabel}>Active Trainees</div>
              </div>
            </div>
          </div>

          {/* Quick Resources */}
          <div className={styles.card}>
            <div className={styles.cardHeader}><span>🔗 Quick Resources</span></div>
            <div className={styles.resourceGrid}>
              {['Program Guide', 'HR Policy', 'Safety Handbook', 'Leave Request'].map(r => (
                <button key={r} className={styles.resourceBtn}>📄 {r}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        © 2024 National Water and Sewerage Corporation. All rights reserved. &nbsp;
        <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> · <a href="/help">Help Center</a>
      </div>
    </DashboardLayout>
  );
}