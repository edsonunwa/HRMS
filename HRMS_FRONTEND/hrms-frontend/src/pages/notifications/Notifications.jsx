import React, { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiExternalLink } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { notificationsService } from '../../services/notificationsService';
import styles from './Notifications.module.css';

const TYPE_CONFIG = {
  info:    { icon: 'ℹ️', color: 'blue', label: 'Info' },
  success: { icon: '✅', color: 'green', label: 'Success' },
  warning: { icon: '⚠️', color: 'orange', label: 'Warning' },
  danger:  { icon: '🔴', color: 'red', label: 'Alert' },
};

const CATEGORY_LABELS = {
  leave: 'Leave',
  transfer: 'Transfer',
  recruitment: 'Recruitment',
  payroll: 'Payroll',
  evaluation: 'Evaluation',
  system: 'System',
  general: 'General',
};

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getAll();
      // Handle both paginated and non-paginated responses
      const notificationsList = Array.isArray(data) ? data : (data.results || []);
      setNotifications(notificationsList);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (e, notifId) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(notifId);
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      notificationsService.markAsRead(notif.id).then(() => {
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        );
      }).catch(console.error);
    }

    if (notif.link) {
      window.location.href = notif.link;
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout portalLabel="Notifications" searchPlaceholder="Search notifications…">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Notifications</h1>
            <p className={styles.sub}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              className={styles.markAllButton}
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead}
            >
              <FiCheck />
              {markingAllRead ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'unread' ? styles.active : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'read' ? styles.active : ''}`}
            onClick={() => setFilter('read')}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {loading ? (
            <div className={styles.loading}>Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className={styles.empty}>
              <FiBell />
              <h3>No notifications found</h3>
              <p>
                {filter === 'all'
                  ? "You don't have any notifications yet."
                  : filter === 'unread'
                  ? 'All notifications have been read.'
                  : 'No read notifications yet.'}
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {filteredNotifications.map(notif => {
                const typeConfig = TYPE_CONFIG[notif.notif_type] || TYPE_CONFIG.info;
                return (
                  <div
                    key={notif.id}
                    className={`${styles.notificationItem} ${!notif.is_read ? styles.unread : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className={styles.notificationIcon}>
                      <span className={`${styles.typeIcon} ${styles[typeConfig.color]}`}>
                        {typeConfig.icon}
                      </span>
                    </div>
                    <div className={styles.notificationBody}>
                      <div className={styles.notificationHeader}>
                        <span className={styles.category}>
                          {CATEGORY_LABELS[notif.category] || notif.category}
                        </span>
                        <span className={styles.time}>
                          {formatTimeAgo(notif.created_at)}
                        </span>
                      </div>
                      <div className={styles.notificationTitle}>
                        {notif.title}
                      </div>
                      <div className={styles.notificationMessage}>
                        {notif.message}
                      </div>
                    </div>
                    <div className={styles.notificationActions}>
                      {!notif.is_read && (
                        <button
                          className={styles.markReadButton}
                          onClick={(e) => handleMarkAsRead(e, notif.id)}
                          title="Mark as read"
                        >
                          <FiCheck />
                        </button>
                      )}
                      {notif.link && (
                        <FiExternalLink className={styles.linkIcon} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}