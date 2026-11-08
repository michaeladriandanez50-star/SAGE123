import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function Conflict({ setScreen }: { setScreen: (s: any) => void }) {
  const [activeTab, setActiveTab] = useState<'All' | 'Faculty' | 'Room' | 'Section'>('All');
  const [isScanning, setIsScanning] = useState(false);
  
  // BAGONG STATE: Para sa custom alert kapag bawal i-dismiss
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // GINAWANG STATE ANG DATA PARA PWEDENG MA-DELETE
  const [issues, setIssues] = useState([
    { 
      id: 'C-001', type: 'Warning', category: 'Room', target: 'LAB-401', 
      issue: 'Room Capacity Warning', detail: 'Assigned section (45 students) slightly exceeds the optimal room capacity (40 workstations). System applied a flexible baseline.',
      suggestion: 'If possible, transfer class to LAB-402 (50 workstations capacity).' 
    },
    { 
        
      id: 'C-002', type: 'Warning', category: 'Section', target: 'BSCS 3-1', 
      issue: 'Intraday Gap Violation', detail: 'This section has a 4-hour vacant gap on Wednesdays (12:00 PM - 4:00 PM).',
      suggestion: 'Move CS313 to 1:00 PM to close the gap.' 
    },
    { 
      id: 'C-003', type: 'Critical', category: 'Room', target: 'LEC-305', 
      issue: 'Room Type Mismatch', detail: 'CS311 is a Laboratory subject but is assigned to a standard Lecture room.',
      suggestion: 'Must transfer class to an available Laboratory room.'
    },
    { 
      id: 'C-004', type: 'Critical', category: 'Faculty', target: 'Dr. Dela Cruz', 
      issue: 'Faculty Double Booking', detail: 'Assigned to BSCS 3-1 and BSCS 4-1 at the exact same Monday 8:00 AM time slot.',
      suggestion: 'Must reassign one of the subjects to a different available faculty.'
    }
  ]);

  const filteredConflicts = activeTab === 'All' ? issues : issues.filter(c => c.category === activeTab);

  // LOGIC PARA SA DISMISS BUTTON
  const handleDismiss = (id: string, type: string) => {
    if (type === 'Critical') {
      // Bawal i-dismiss ang Hard Constraints!
      setAlertMessage("Critical violations (Hard Constraints) cannot be ignored. You must resolve this in the schedule editor.");
      return;
    }
    // Kung Warning lang, tanggalin sa listahan
    setIssues(issues.filter(issue => issue.id !== id));
  };

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2000); 
  };

  const glassPanel = { background: 'rgba(255, 255, 255, 0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '20px', padding: '2rem', boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)' };

  return (
    <div className="fade-up" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ ...glassPanel, padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.25rem 0' }}>Conflict Detection & Diagnostics</h2>
          <p style={{ fontSize: '0.9rem', color: '#7a6f9a', margin: 0 }}>Run a full system sweep to identify constraint violations and optimization issues.</p>
        </div>
        <button onClick={handleScan} disabled={isScanning} style={{ background: isScanning ? '#e5e7eb' : '#1a1630', color: isScanning ? '#9ca3af' : '#fff', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '12px', fontWeight: 700, cursor: isScanning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.2s', boxShadow: isScanning ? 'none' : '0 4px 15px rgba(26,22,48,0.2)' }}>
          {isScanning ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="spin-animation"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>}
          {isScanning ? 'Running Diagnostic Sweep...' : 'Run Full Diagnostic Sweep'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <div style={{ ...glassPanel, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {issues.filter(i => i.type === 'Critical').length > 0 ? (
            /* PULANG ALERT ICON KAPAG FAILED/MAY CRITICAL */
            <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(212,22,60,0.15)', color: '#d4163c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            </div>
          ) : (
            /* BERDENG CHECK ICON KAPAG PASADO LAHAT */
            <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(32,167,131,0.15)', color: '#20a783', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7a6f9a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Hard Constraints</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: issues.filter(i => i.type === 'Critical').length > 0 ? '#d4163c' : '#1a1630' }}>
              {issues.filter(i => i.type === 'Critical').length === 0 ? '100% Passed' : 'Failed'}
            </div>
          </div>
        </div>
        <div style={{ ...glassPanel, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(212,22,60,0.15)', color: '#d4163c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
          <div><div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7a6f9a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Critical Overlaps</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1630' }}>{issues.filter(i => i.type === 'Critical').length} Issues</div></div>
        </div>
        <div style={{ ...glassPanel, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
          <div><div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7a6f9a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Optimization Warnings</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1630' }}>{issues.filter(i => i.type === 'Warning').length} Alerts</div></div>
        </div>
      </div>

      <div style={{ ...glassPanel, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.8)', display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.3)' }}>
          {['All', 'Faculty', 'Room', 'Section'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ background: activeTab === tab ? '#fff' : 'transparent', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: activeTab === tab ? 800 : 600, fontSize: '0.85rem', color: activeTab === tab ? '#d4163c' : '#7a6f9a', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
              {tab === 'All' ? 'All Issues' : `${tab} Violations`}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '500px' }}>
          {filteredConflicts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#7a6f9a' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(32,167,131,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#20a783' }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#1a1630' }}>All Clear!</h3>
              <p style={{ margin: 0 }}>No conflicts detected for this category.</p>
            </div>
          ) : (
            filteredConflicts.map(conflict => (
              <div key={conflict.id} style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', background: '#fff', borderRadius: '16px', border: `1px solid ${conflict.type === 'Critical' ? 'rgba(212,22,60,0.3)' : 'rgba(245,158,11,0.3)'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: conflict.type === 'Critical' ? 'rgba(212,22,60,0.1)' : 'rgba(245,158,11,0.1)', color: conflict.type === 'Critical' ? '#d4163c' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1630' }}>{conflict.target}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, background: conflict.type === 'Critical' ? '#d4163c' : '#f59e0b', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '12px', textTransform: 'uppercase' }}>{conflict.type}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7a6f9a', borderLeft: '1px solid #e5e7eb', paddingLeft: '0.75rem' }}>{conflict.category} Analysis</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4a3f7a', marginBottom: '0.4rem' }}>{conflict.issue}</div>
                  <div style={{ fontSize: '0.85rem', color: '#7a6f9a', lineHeight: 1.5, marginBottom: '1rem' }}>{conflict.detail}</div>
                  <div style={{ background: 'rgba(32,167,131,0.05)', border: '1px dashed rgba(32,167,131,0.3)', padding: '0.85rem 1rem', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20a783" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}>
                      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                      <path d="M9 18h6"></path><path d="M10 22h4"></path>
                    </svg>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#20a783', textTransform: 'uppercase', marginBottom: '0.2rem' }}>AI Resolution Suggestion</div>
                      <div style={{ fontSize: '0.85rem', color: '#11634d', fontWeight: 600 }}>{conflict.suggestion}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                  {/* OPEN IN EDITOR ROUTING */}
                  <button onClick={() => setScreen('schedule')} style={{ background: '#1a1630', color: '#fff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}>
                    Open in Editor
                  </button>
                  {/* DISMISS LOGIC */}
                  <button onClick={() => handleDismiss(conflict.id, conflict.type)} style={{ background: 'transparent', color: '#7a6f9a', border: '1px solid #cbd5e1', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ALERT MODAL KAPAG BAWAL I-DISMISS ANG CRITICAL ISSUE */}
      {alertMessage && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 22, 48, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-up" style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(212,22,60,0.3)', borderTop: '6px solid #d4163c', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(212,22,60,0.1)', color: '#d4163c', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.5rem' }}>Action Blocked</h3>
            <p style={{ fontSize: '0.95rem', color: '#7a6f9a', lineHeight: 1.5, margin: '0 0 2rem' }}>{alertMessage}</p>
            <button onClick={() => setAlertMessage(null)} style={{ width: '100%', background: '#d4163c', color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}>
              Understood
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}