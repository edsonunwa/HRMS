import React from 'react';
import PropTypes from 'prop-types';
import styles from './DataTable.module.css';

/**
 * Generic table: columns = [{ key, label, render?(row) }], rows = [{...}],
 * optional onRowClick(row), optional actions(row) rendering a trailing actions cell.
 */
function DataTable({ columns, rows, loading, onRowClick, actions, emptyMessage }) {
  if (loading) {
    return <div className={styles.empty}>Loading…</div>;
  }
  if (!rows || rows.length === 0) {
    return <div className={styles.empty}>{emptyMessage || 'No records found.'}</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map((col) => <th key={col.key}>{col.label}</th>)}
          {actions && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className={onRowClick ? styles.rowClickable : styles.row}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((col) => (
              <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
            ))}
            {actions && (
              <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                <div className={styles.actionsCellInner}>
                  {actions(row)}
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

DataTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.node.isRequired,
    render: PropTypes.func,
  })).isRequired,
  rows: PropTypes.array,
  loading: PropTypes.bool,
  onRowClick: PropTypes.func,
  actions: PropTypes.func,
  emptyMessage: PropTypes.string,
};

export default DataTable;
