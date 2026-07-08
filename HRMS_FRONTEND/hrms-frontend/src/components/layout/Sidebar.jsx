import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiUsers, FiClock, FiTrendingUp, FiRepeat, FiAward,
  FiBriefcase, FiBook, FiBarChart2, FiSettings, FiHelpCircle,
  FiLogOut, FiPlus,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_DASHBOARD_MAP } from '../../utils/constants';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { icon: <FiUsers />,      label: 'Workforce',              path: '/workforce' },
  { icon: <FiTrendingUp />, label: 'Manpower Planning',      path: '/manpower' },
  { icon: <FiBriefcase />,  label: 'Recruitment',            path: '/recruitment' },
  { icon: <FiClock />,      label: 'Leave Management',       path: '/leave' },
  { icon: <FiRepeat />,     label: 'Transfers & Rotation',   path: '/transfers' },
  { icon: <FiAward />,      label: 'Performance Evaluation', path: '/evaluation' },
  { icon: <FiBook />,       label: 'Trainees & Interns',     path: '/trainees' },
  { icon: <FiBarChart2 />,  label: 'Reports',                path: '/reports' },
  { icon: <FiSettings />,   label: 'Settings',                path: '/settings', adminOnly: true },
];

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === ROLES.ADMIN);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const dashboardPath = user ? ROLE_DASHBOARD_MAP[user.role] : '/login';

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand} onClick={() => navigate(dashboardPath)} style={{ cursor: 'pointer' }}>
        <div className={styles.brandIcon}>N</div>
        <div className={styles.brandText}>
          <div className={styles.brandName}>NWSC HRMS</div>
          <div className={styles.brandSub}>Reliable Governance</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.navItem}${isActive ? ` ${styles.active}` : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* New Request */}
      <button className={styles.newRequestBtn} onClick={() => navigate('/leave?action=new')}>
        <FiPlus /> New Request
      </button>

      {/* Bottom links */}
      <div className={styles.bottom}>
        <a href="mailto:support@nwsc.co.ug" className={styles.bottomLink}>
          <FiHelpCircle /> Help Center
        </a>
        <button className={styles.bottomLink} onClick={handleLogout}>
          <FiLogOut /> Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;