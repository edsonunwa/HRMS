import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { traineesService, trainingProgramsService, traineeCoursesService } from '../../services/traineesService';
import styles from './GradTraineeDashboard.module.css';

export default function GradTraineeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainee, setTrainee] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [progData, traineeData] = await Promise.all([
          trainingProgramsService.list(),
          traineesService.list({ limit: 5 }),
        ]);
        setPrograms(Array.isArray(progData) ? progData : progData.results || []);
        // Try to find current user as trainee
        const trainees = Array.isArray(traineeData) ? traineeData : traineeData.results || [];
        const me = trainees.find((t) => t.user === user?.id || t.email === user?.email);
        if (me) {
          setTrainee(me);
          const courseData = await traineeCoursesService.list(me.id);
          setCourses(Array.isArray(courseData) ? courseData : courseData.results || []);
        }
      } catch (err) {
        setError('Failed to load trainee data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const firstName = user?.first_name || 'Trainee';
  const completedCourses = courses.filter((c) => c.status === 'completed').length;
  const totalCourses = courses.length;
  const progress = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  if (loading) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search courses, certificates…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading trainee data…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search courses, certificates…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search courses, certificates…">
      <div className={styles.topRow}>
        <div className={styles.welcomeCard}>
          <div className={styles.memberTag}>GRADUATE TRAINEE</div>
          <h1 className={styles.welcomeTitle}>Welcome back, {firstName}.</h1>
          <p className={styles.welcomeSub}>
            {totalCourses > 0
              ? `You have completed ${completedCourses} of ${totalCourses} courses (${progress}% overall progress).`
              : 'Explore available training programs to start your learning journey.'}
          </p>
          <button className={styles.continueBtn} onClick={() => navigate('/trainees')}>Continue Learning</button>
        </div>

        <div className={styles.progressPanel}>
          <div className={styles.progressLabel}>LEARNING PROGRESS</div>
          <div className={styles.progressHours}>{completedCourses} <span>COURSES COMPLETED</span></div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.progressStats}>
            <div><div className={styles.psVal}>{totalCourses}</div><div className={styles.psLbl}>Total Courses</div></div>
            <div><div className={styles.psVal}>{programs.length}</div><div className={styles.psLbl}>Programs</div></div>
          </div>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.leftCol}>
          {/* Current Programs */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span>Training Programs</span>
              <button className={styles.viewAll}>VIEW ALL →</button>
            </div>
            {programs.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No training programs available.</div>
            ) : (
              <div className={styles.courseGrid}>
                {programs.slice(0, 4).map((prog) => (
                  <div key={prog.id} className={styles.courseCard}>
                    <span className={styles.courseTag} style={{ background: '#005a9c' }}>
                      {prog.program_type || 'TRAINING'}
                    </span>
                    <div className={styles.courseImg} />
                    <div className={styles.courseTitle}>{prog.name || prog.title}</div>
                    <div className={styles.courseTime}>
                      {prog.duration_days ? `${prog.duration_days} days` : prog.start_date ? `Starts ${new Date(prog.start_date).toLocaleDateString()}` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}><span>My Courses</span></div>
          {courses.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No courses assigned yet.
            </div>
          ) : (
            courses.slice(0, 5).map((course) => (
              <div key={course.id} className={styles.liveItem}>
                <div className={styles.liveTime}>{course.status || 'Active'}</div>
                <div className={styles.liveTitle}>{course.course_name || course.title || 'Course'}</div>
                <div className={styles.liveSub}>
                  {course.progress ? `${course.progress}% complete` : 'In progress'}
                </div>
              </div>
            ))
          )}

          {/* Next Milestone */}
          <div className={styles.milestoneCard}>
            <div className={styles.mileTitle}>🏆 Learning Summary</div>
            <p className={styles.mileSub}>
              {totalCourses > 0
                ? `You have ${totalCourses - completedCourses} remaining course${totalCourses - completedCourses !== 1 ? 's' : ''} to complete.`
                : 'Enroll in a program to start tracking your progress.'}
            </p>
            <div className={styles.mileProgress}>
              <div className={styles.mileBar}><div className={styles.mileFill} style={{ width: `${progress}%` }} /></div>
              <span className={styles.mileCount}>{completedCourses}/{totalCourses} COMPLETED</span>
            </div>
            <div className={styles.milePct}>{progress}%</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}