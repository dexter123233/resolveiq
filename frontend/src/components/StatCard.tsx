import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '14px',
  background: 'white',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  marginTop: '8px',
};

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div style={cardStyle}>
      {icon}
      <div style={labelStyle}>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

export default StatCard;
