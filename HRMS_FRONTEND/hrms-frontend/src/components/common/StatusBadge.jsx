import React from 'react';
import PropTypes from 'prop-types';
import styles from './StatusBadge.module.css';

const COLOR_BY_STATUS = {
  green: ['approved', 'active', 'completed', 'filled', 'hired', 'accepted', 'passed', 'open', 'confirmed'],
  red: ['rejected', 'terminated', 'cancelled', 'suspended', 'failed', 'no_show', 'declined'],
  amber: ['pending', 'submitted', 'draft', 'vacant', 'probation', 'on_leave', 'extended'],
  blue: ['shortlisted', 'interview', 'offered', 'reviewed', 'self_assessed', 'moderated', 'evaluated', 'under_review'],
  gray: ['withdrawn', 'closed', 'frozen', 'retired', 'recalled', 'idle'],
};

function colorFor(status) {
  const key = (status || '').toLowerCase();
  for (const [color, statuses] of Object.entries(COLOR_BY_STATUS)) {
    if (statuses.includes(key)) return color;
  }
  return 'gray';
}

function StatusBadge({ status, label }) {
  const color = colorFor(status);
  const text = label || (status || '').replace(/_/g, ' ');
  return (
    <span className={`${styles.pill} ${styles[color]}`}>
      {text}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string,
  label: PropTypes.string,
};

export default StatusBadge;