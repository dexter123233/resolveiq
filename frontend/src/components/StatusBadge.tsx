import React from 'react';

interface StatusBadgeProps {
  escalated: boolean;
}

const baseStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: '99px',
  fontSize: '12px',
  fontWeight: 'bold',
};

const escalatedStyle: React.CSSProperties = {
  ...baseStyle,
  background: '#fee2e2',
  color: '#dc2626',
};

const resolvedStyle: React.CSSProperties = {
  ...baseStyle,
  background: '#dcfce7',
  color: '#16a34a',
};

function StatusBadge({ escalated }: StatusBadgeProps) {
  return (
    <span style={escalated ? escalatedStyle : resolvedStyle}>
      {escalated ? 'Escalated' : 'Resolved'}
    </span>
  );
}

export default StatusBadge;
