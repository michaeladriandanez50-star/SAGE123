import React, { useState } from 'react';
import { Screen } from '../../types';

export default function Reports({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [copied, setCopied] = useState(false);
  const [selectedDept, setSelectedDept] = useState('Mathematics Department');
  
  // State para ma-track kung aling report ang bukas ang export dropdown
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [tokens, setTokens] = useState([
    { id: 1, dept: 'Mathematics Department', code: 'sec_math2026tup', expiry: '2026-10-02', status: 'Active' },
    { id: 2, dept: 'Physics Department', code: 'sec_phys9918tup', expiry: '2026-10-05', status: 'Active' }
  ]);

  const glassPanel = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)',
  };

  const currentTokenUrl = `https://sage-tup.edu.ph/service-portal/token?key=sec_${selectedDept.toLowerCase().substring(0,4)}_${Math.random().toString(36).substring(2, 8)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentTokenUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRevokeToken = (id: number) => {
    setTokens(tokens.map(t => t.id === id ? { ...t, status: 'Revoked' } : t));
  };

  const handleExportAction = (reportName: string, format: 'Excel' | 'PDF') => {
    setOpenDropdown(null);
    alert(`Exporting ${reportName} as ${format}...`);
  };

  // Helper function para sa bawat row ng report na may iisang export button + dropdown
  const renderReportItem = (id: string, title: string, subtitle: string, isAlert = false) => {
    const isOpen = openDropdown === id;

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#fff', borderRadius: '10px', border: isAlert ? '1px solid #fee2e2' : '1px solid #e5e7eb', position: 'relative' }}>
        <div>
          <div style={{ fontWeight: 800, color: isAlert ? '#991b1b' : '#1a1630', fontSize: '0.85rem' }}>{title}</div>
          <div style={{ fontSize: '0.7rem', color: isAlert ? '#b91c1c' : '#7a6f9a' }}>{subtitle}</div>
        </div>
        
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setOpenDropdown(isOpen ? null : id)}
            style={{ background: isAlert ? '#dc2626' : '#1a1630', color: '#fff', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            Export ▾
          </button>

          {isOpen && (
            <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: '110px', overflow: 'hidden' }}>
              <div 
                onClick={() => handleExportAction(title, 'Excel')} 
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                📊 Excel
              </div>
              <div 
                onClick={() => handleExportAction(title, 'PDF')} 
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#1a1630', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                📄 PDF
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fade-up" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* HEADER */}
      <div style={{ ...glassPanel, padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.25rem 0' }}>Reports & Institutional Exports</h2>
          <p style={{ fontSize: '0.9rem', color: '#7a6f9a', margin: 0 }}>Generate official documentation, faculty workloads, matrix reports, and external encoding links.</p>
        </div>
      </div>

      {/* GRID SECTION: REPORTS VS TOKENIZED LINKS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' }}>
        
        {/* LEFT COLUMN: ORGANIZED INSTITUTIONAL REPORTS */}
        <div style={{ ...glassPanel, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.25rem' }}>Institutional Reports & Document Generation</h3>
            <p style={{ fontSize: '0.85rem', color: '#7a6f9a', margin: 0 }}>Clean, categorized records for registrar, department heads, and accreditation.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.4rem' }}>
            
            {/* GROUP 1: TIMETABLES & MATRICES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timetables & Facility Matrices</div>
              
              {renderReportItem('r1', 'Master Department Schedule', 'Complete grid layout for all sections.')}
              {renderReportItem('r2', 'Section-Specific Timetable', 'Filtered schedule per student batch.')}
              {renderReportItem('r3', 'Faculty Individual Schedule', 'Weekly teaching loads per professor.')}
              {renderReportItem('r4', 'Room Timetable & Utilization Matrix', 'Lab vs Lecture occupancy analytics.')}
            </div>

            {/* GROUP 2: FACULTY WORKLOAD & OVERLOADS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#20a783', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faculty Workload & Overload Reports</div>
              
              {renderReportItem('r5', 'Department Summary of Load', 'Aggregated units and preparation metrics.')}
              {renderReportItem('r6', 'Individual Faculty Load Summary', 'Detailed breakdown per faculty member.')}
              {renderReportItem('r7', 'Faculty Overload Compliance Report', 'Flags teachers exceeding regular thresholds.', true)}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: TOKENIZED LINK GENERATOR & ACCESS MANAGEMENT */}
        <div style={{ ...glassPanel, display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(224,242,254,0.5))' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0369a1', margin: '0 0 0.25rem' }}>Phase 2: External Service Access</h3>
            <p style={{ fontSize: '0.85rem', color: '#0284c7', margin: 0 }}>Generate secure, tokenized links for sister departments to plot minor subjects.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: '0.4rem' }}>Select Target Department</label>
              <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bae6fd', outline: 'none', background: '#fff', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                <option value="Mathematics Department">Mathematics Department (Math / Calculus)</option>
                <option value="Physics Department">Physics Department (Natural Sciences)</option>
                <option value="General Education Department">General Education Department (GE Core)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: '0.4rem' }}>Secure Tokenized URL</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={currentTokenUrl} 
                  style={{ flex: 1, minWidth: '180px', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #bae6fd', background: '#f8fafc', color: '#334155', fontSize: '0.8rem', outline: 'none' }} 
                />
                <button 
                  onClick={handleCopyLink}
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, fontSize: '0.85rem' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button 
                  onClick={() => setScreen('service-portal')}
                  style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '0.75rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Open Portal
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.4rem', lineHeight: 1.4 }}>
                * Grants restricted read-write access only to open time slots for {selectedDept}.
              </p>
            </div>

            {/* ACTIVE TOKENS MANAGEMENT LIST */}
            <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0369a1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Active Department Access Tokens</span>
                <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0284c7', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>{tokens.filter(t => t.status === 'Active').length} Active</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '130px', overflowY: 'auto' }}>
                {tokens.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{item.dept}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Status: <span style={{ color: item.status === 'Active' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{item.status}</span></div>
                    </div>
                    {item.status === 'Active' ? (
                      <button onClick={() => handleRevokeToken(item.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                        Revoke
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Revoked</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}