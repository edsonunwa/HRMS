import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight, FiZap } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { ROLES } from '../../utils/constants';
import styles from './Login.module.css';

const DEMO_USERS = [
  { role: ROLES.ADMIN,            username: 'admin',       first_name: 'Dativah .',    last_name: '',         role_display: 'System Administrator'   },
  { role: ROLES.HR_DIRECTOR,      username: 'hr_director', first_name: 'Director',    last_name: 'HR',       role_display: 'HR Director'             },
  { role: ROLES.HR_OFFICER,       username: 'hr_officer',  first_name: 'Moriison',       last_name: 'Senior dev', role_display: 'Senior HR Officer'       },
  { role: ROLES.DEPARTMENT_HEAD,  username: 'dept_head',   first_name: 'Mark',      last_name: 'BPO', role_display: 'Regional Operations Mgr' },
  { role: ROLES.SENIOR_MANAGEMENT,username: 'senior_mgmt', first_name: 'uncle bob',        last_name: 'kachere',role_display: 'Managing Director'      },
  { role: ROLES.BOARD,            username: 'board',       first_name: 'Board',       last_name: 'Member',   role_display: 'Board of Directors'      },
  { role: ROLES.EMPLOYEE,         username: 'employee',    first_name: 'Alex',        last_name: 'Mwanje',   role_display: 'Principal Engineer'      },
  
];

function Login() {
  const { login, demoLogin, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const dashboardPath = await login(form.username, form.password);
      const loggedInUser = authService.getCurrentUser();
      if (loggedInUser?.must_change_password) {
        navigate('/reset-password', { replace: true });
      } else {
        navigate(from || dashboardPath, { replace: true });
      }
    } catch {
      // error shown via context
    }
  }

  function handleDemo(mockUser) {
    const path = demoLogin(mockUser);
    navigate(path, { replace: true });
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        {!imgError ? (
          <img
            src="/nwsc-logo.png"
            alt="NWSC Logo"
            className={styles.logo}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.logoFallback}><img src="/logo.png" alt="Company Logo" className="h-16 w-auto mx-auto" /></div>
        )}

        <h1 className={styles.title}>NATIONAL WATER AND SEWERAGE CORPORATION</h1>
        <p className={styles.subtitle}>Human Resource Management System</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <div className={styles.alert} role="alert">{error}</div>}

          {/* Username */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldHeader}>
              <label htmlFor="username" className={styles.label}>Username</label>
              <span className={styles.required}>Required</span>
            </div>
            <div className={styles.inputWrap}>
              <FiUser className={styles.inputIcon} />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={form.username}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter your username"
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldHeader}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <a href="/forgot-password" className={styles.forgotLink}>Forgot?</a>
            </div>
            <div className={styles.inputWrap}>
              <FiLock className={styles.inputIcon} />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="••••••••"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.username || !form.password}
            className={styles.submitBtn}
          >
            {loading ? 'Signing in…' : 'Login'} <FiArrowRight />
          </button>
        </form>

        <p className={styles.createAccount}>
          Don&apos;t have an account? <a href="/register">Contact the system administrator</a>
        </p>

        <hr className={styles.divider} />

        

        <div className={styles.footerLinks}>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/help">Help Center</a>
          
        </div>
        <h1 className={styles.title}>WATER IS LIFE</h1>
      </div>
    </div>
  );
}

export default Login;
