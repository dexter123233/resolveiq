import React from 'react';

interface PipelineStepProps {
  label: string;
}

const stepStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  border: '1px solid #e5e7eb',
  padding: '10px 12px',
  borderRadius: '8px',
  background: 'white',
};

const statusStyle: React.CSSProperties = {
  color: '#16a34a',
  fontWeight: 600,
};

function PipelineStep({ label }: PipelineStepProps) {
  return (
    <div style={stepStyle}>
      <span>{label}</span>
      <span style={statusStyle}>done</span>
    </div>
  );
}

export default PipelineStep;
