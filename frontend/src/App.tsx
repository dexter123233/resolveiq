import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Send, Loader2, ShieldAlert, Clock, Database, Zap } from 'lucide-react';
import StatCard from './components/StatCard';
import PipelineStep from './components/PipelineStep';
import StatusBadge from './components/StatusBadge';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const submitTicket = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    const formData = new FormData();
    formData.append('text', text);
    if (file) formData.append('image', file);

    try {
      const response = await axios.post(`${API_URL}/api/resolve`, formData);
      setResult(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error resolving ticket');
    } finally {
      setLoading(false);
    }
  };

  const pipelineSteps = result
    ? [
        'Triage',
        result.image_received ? 'Vision' : 'Vision skipped',
        'Retrieval',
        'Response',
        result.escalated ? 'Escalation mocked' : 'Escalation skipped',
      ]
    : [];

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '980px', margin: '32px auto', padding: '20px', color: '#111827' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <ShieldAlert size={32} color="#2563eb" />
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>ResolveIQ Copilot</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280' }}>Gemma 4 31B on Cerebras for multimodal incident response</p>
        </div>
      </header>

      <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <textarea 
          placeholder="Describe the incident (e.g., VPN connection failing with error 403)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ width: '100%', height: '120px', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '15px', boxSizing: 'border-box' }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#4b5563', fontSize: '14px' }}>
            <Upload size={18} />
            <span>{file ? file.name : 'Upload Screenshot'}</span>
            <input type="file" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
          
          <button 
            onClick={submitTicket} 
            disabled={loading || !text}
            style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {loading ? 'Analyzing...' : 'Resolve'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: '16px', color: '#b91c1c', background: '#fee2e2', padding: '12px', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <StatCard
              icon={<Clock size={18} color="#2563eb" />}
              label="Total latency"
              value={`${result.metrics?.total_latency_ms ?? '-'} ms`}
            />
            <StatCard
              icon={<Zap size={18} color="#16a34a" />}
              label="Provider"
              value={result.metrics?.provider}
            />
            <StatCard
              icon={<Database size={18} color="#7c3aed" />}
              label="Citations"
              value={result.resolution?.citations?.join(', ') || 'None'}
            />
          </div>

          <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Resolution Draft</h2>
            <StatusBadge escalated={result.escalated} />
          </div>
          
          <div style={{ color: '#374151', lineHeight: '1.6' }}>
            <p><strong>Severity:</strong> {result.resolution?.severity}</p>
            <p><strong>Root cause:</strong> {result.resolution?.root_cause_hypothesis}</p>
            <p><strong>Recommended action:</strong> {result.resolution?.recommended_action}</p>
            <p><strong>Confidence:</strong> {Math.round((result.resolution?.confidence || 0) * 100)}%</p>
            <div style={{ marginTop: '16px', padding: '14px', background: '#f9fafb', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
              {result.resolution?.customer_facing_draft}
            </div>
          </div>
          </div>

          <div style={{ marginTop: '16px', display: 'grid', gap: '8px' }}>
            {pipelineSteps.map((step) => (
              <PipelineStep key={step} label={step} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
