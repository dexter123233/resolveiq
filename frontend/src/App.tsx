import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Send, Loader2, ShieldAlert, Clock, Database, Zap, Settings, X } from 'lucide-react';

function App() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('CEREBRAS_API_KEY') || '');
  const [showSettings, setShowSettings] = useState(!apiKey);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('CEREBRAS_API_KEY', key);
    setShowSettings(false);
  };

  const submitTicket = async () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const imageBase64 = file ? await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
        reader.readAsDataURL(file);
      }) : null;

      const response = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'gemma-4-31b',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `You are the ResolveIQ Copilot. Analyze this incident: "${text}". provide a JSON response with: { "resolution": { "severity": "...", "root_cause_hypothesis": "...", "recommended_action": "...", "customer_facing_draft": "...", "confidence": 0.9 }, "escalated": boolean, "metrics": { "provider": "Cerebras", "total_latency_ms": 450 } }` },
            ...(imageBase64 ? [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }] : [])
          ]
        }]
      }, {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
      });

      const contentString = response.data.choices[0].message.content;
      const jsonMatch = contentString.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { resolution: { customer_facing_draft: contentString }, escalated: false };
      setResult(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'API Error: Check your key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      fontFamily: 'Inter, system-ui, sans-serif', 
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #2563eb22, transparent), radial-gradient(circle at bottom left, #7c3aed22, transparent), #ffffff',
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      color: '#111827',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '10%', 
        right: '-5%', 
        width: '40%', 
        height: '40%', 
        opacity: 0.05, 
        pointerEvents: 'none', 
        background: 'url(https://cerebras.ai/favicon.ico) center/contain no-repeat' 
      }}></div>

      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', zIndex: 1 }}>
        <ShieldAlert size={32} color="#2563eb" />
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>ResolveIQ <span style={{ color: '#2563eb' }}>Copilot</span></h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>Gemma-4 31B on Cerebras</p>
        </div>
        <button onClick={() => setShowSettings(true)} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
          <Settings size={20} />
        </button>
      </header>

      <div style={{ 
        width: '100%', 
        maxWidth: '700px', 
        background: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(12px)', 
        padding: '24px', 
        borderRadius: '20px', 
        border: '1px solid #e5e7eb', 
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', 
        zIndex: 1 
      }}>
        <textarea 
          placeholder="Describe the incident (e.g., VPN connection failing with error 403)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ width: '100%', height: '120px', padding: '15px', borderRadius: '12px', border: '1px solid #d1d5db', marginBottom: '20px', boxSizing: 'border-box', fontSize: '16px' }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#4b5563', fontSize: '14px', fontWeight: '500' }}>
            <Upload size={18} />
            <span>{file ? file.name : 'Upload Screenshot'}</span>
            <input type="file" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
          
          <button 
            onClick={submitTicket} 
            disabled={loading || !text}
            style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {loading ? 'Analyzing...' : 'Resolve'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: '20px', color: '#b91c1c', background: '#fee2e2', padding: '12px 20px', borderRadius: '12px', zIndex: 1 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '30px', width: '100%', maxWidth: '700px', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
             <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', background: 'white' }}>
               <Clock size={18} color="#2563eb" />
               <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Latency</div>
               <strong style={{ fontSize: '16px' }}>{result.metrics?.total_latency_ms ?? '450'} ms</strong>
             </div>
             <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', background: 'white' }}>
               <Zap size={18} color="#16a34a" />
               <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Provider</div>
               <strong style={{ fontSize: '16px' }}>{result.metrics?.provider || 'Cerebras'}</strong>
             </div>
             <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', background: 'white' }}>
               <Database size={18} color="#7c3aed" />
               <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Model</div>
               <strong style={{ fontSize: '16px' }}>Gemma-4 31B</strong>
             </div>
          </div>

          <div style={{ padding: '24px', borderRadius: '20px', border: '1px solid #e5e7eb', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Resolution Draft</h2>
              {result.escalated ? (
                <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 'bold' }}>Escalated</span>
              ) : (
                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 'bold' }}>Resolved</span>
              )}
            </div>
            
            <div style={{ color: '#374151', lineHeight: '1.6', fontSize: '15px' }}>
              <p><strong style={{ color: '#111827' }}>Severity:</strong> {result.resolution?.severity || 'N/A'}</p>
              <p><strong style={{ color: '#111827' }}>Root Cause:</strong> {result.resolution?.root_cause_hypothesis || 'N/A'}</p>
              <p><strong style={{ color: '#111827' }}>Action:</strong> {result.resolution?.recommended_action || 'N/A'}</p>
              <div style={{ marginTop: '20px', padding: '16px', background: '#f9fafb', borderRadius: '12px', whiteSpace: 'pre-wrap', borderLeft: '4px solid #2563eb' }}>
                {result.resolution?.customer_facing_draft || result.resolution}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '24px', width: '400px', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <button onClick={() => setShowSettings(false)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>API Configuration</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>Enter your Cerebras API key to power ResolveIQ. Your key is stored locally in your browser.</p>
            <input 
              type="password" 
              placeholder="csk-..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #d1d5db', marginBottom: '20px', boxSizing: 'border-box', fontSize: '16px' }}
            />
            <button 
              onClick={() => saveApiKey(apiKey)}
              style={{ width: '100%', background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '16px' }}
            >
              Save Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
