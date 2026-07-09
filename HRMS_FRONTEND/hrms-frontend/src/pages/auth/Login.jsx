import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import styles from './Login.module.css';

function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <img
            src="/logo.png"
            alt="NWSC Logo"
            className={styles.logo}
          />

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
