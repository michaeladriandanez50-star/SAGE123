import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Screen } from '../../types';

export default function Dashboard({ setScreen }: { setScreen: (s: Screen) => void }) {
  // Modal States
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  // State para sa Live Database Stats
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalRooms: 0,
    totalClasses: 0,
    totalConflicts: 0,
    pending: 0,                    
    facultyAssignedPercent: 0,     
    timeSlotUtilizationPercent: 0,
    roomsUtilized: 0
  });

  // Function para gawing maganda basahin ang oras ("Today at 02:45 PM")
  const formatLogDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const timeForm = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today at ${timeForm}`;
    if (isYesterday) return `Yesterday at ${timeForm}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeForm}`;
  };

  // ISANG MALINIS NA useEffect PARA KUNIN ANG STATS AT LOGS
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Kunin ang Stats
        const statsRes = await fetch('http://localhost:5000/api/dashboard-stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Kunin ang Logs
        const logsRes = await fetch('http://localhost:5000/api/logs');
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };

    fetchDashboardData();
  }, []);

  // Reusable styling
  const glassCard = {
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '20px',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
  };

  const headerStyle = {
    fontSize: '0.85rem', fontWeight: 700, color: '#1a1630', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', marginBottom: '1rem', marginLeft: '0.5rem'
  };

  const labelStyle = { fontSize: '0.95rem', fontWeight: 700, color: '#1a1630' };
  const valueStyle = { fontSize: '2.2rem', fontWeight: 800, color: '#d4163c', marginBottom: '0.25rem' };

  return (
    <div className="fade-up" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', transition: 'all 0.3s' }}>      
      
      {/* OVERVIEW SECTION */}
      <section>
        <h2 style={headerStyle}>Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          <div style={glassCard}>
            <span style={valueStyle}>{stats.pending}</span>
            <span style={labelStyle}>Pending Subjects</span>
          </div>
          <div style={glassCard}>
            <span style={valueStyle}>{stats.totalConflicts}</span>
            <span style={labelStyle}>Total Conflicts</span>
          </div>
          <div style={glassCard}>
            <span style={valueStyle}>{stats.totalFaculty}</span>
            <span style={labelStyle}>Total Faculty</span>
          </div>
          <div style={glassCard}>
            <span style={valueStyle}>{stats.totalRooms}</span>
            <span style={labelStyle}>Total Rooms</span>
          </div>
        </div>
      </section>

      {/* MIDDLE SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        
        {/* Conflict Summary */}
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={headerStyle}>Conflict Summary</h2>
          <div style={{ ...glassCard, flex: 1, padding: '2.5rem' }}>
            <div style={{ position: 'relative', width: '140px', height: '140px', borderRadius: '50%', background: stats.totalConflicts > 0 ? 'conic-gradient(#f59e0b 0% 70%, #d4163c 70% 100%)' : 'conic-gradient(#20a783 0% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1a1630', lineHeight: 1 }}>{stats.totalConflicts}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7a6f9a', marginTop: '4px' }}>Total</span>
              </div>
            </div>
            <button 
              onClick={() => setScreen('conflict')}
              className="btn-red" 
              style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', cursor: 'pointer', transition: 'all 0.2s', background: stats.totalConflicts > 0 ? '#d4163c' : '#20a783', boxShadow: stats.totalConflicts > 0 ? '0 8px 20px rgba(212,22,60,0.3)' : '0 8px 20px rgba(32,167,131,0.3)', border: 'none' }}
            >
              {stats.totalConflicts > 0 ? 'Go to Check Conflicts' : 'Schedule is Conflict-Free'}
            </button>
          </div>
        </section>

        {/* RECENT ACTIVITY SECTION - Pinalitan ng database data */}
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={headerStyle}>Recent Activity</h2>
          <div style={{ ...glassCard, flex: 1, alignItems: 'flex-start', textAlign: 'left', padding: '2rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', flex: 1 }}>
              {logs.length === 0 ? (
                <div style={{ fontSize: '0.95rem', color: '#7a6f9a', fontStyle: 'italic', padding: '1rem' }}>No recent activities found in the database.</div>
              ) : (
                logs.slice(0, 4).map((item, i) => (
                  <div key={item.log_id || i} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.85rem 1.25rem', background: 'rgba(255,255,255,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: item.status === 'warn' ? 'rgba(212,22,60,0.15)' : item.status === 'info' ? 'rgba(2,132,199,0.15)' : 'rgba(32,167,131,0.15)', border: item.status === 'warn' ? '1px solid rgba(212,22,60,0.3)' : item.status === 'info' ? '1px solid rgba(2,132,199,0.3)' : '1px solid rgba(32,167,131,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.status === 'warn' ? '#d4163c' : item.status === 'info' ? '#0284c7' : '#20a783', fontWeight: 'bold' }}>
                      {item.status === 'warn' ? '!' : item.status === 'info' ? 'i' : '✓'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1630' }}>{item.title}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{formatLogDate(item.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                onClick={() => setShowActivityModal(true)}
                style={{ background: 'transparent', border: '1.5px solid rgba(26,22,48,0.2)', color: '#1a1630', padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(26,22,48,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                View all activity
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* SCHEDULE QUICK ACTIONS */}
      <section>
        <h2 style={headerStyle}>Schedule Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          <div style={glassCard}>
            <span style={valueStyle}>{stats.totalClasses}</span>
            <span style={labelStyle}>Total Classes</span>
          </div>
          <div style={glassCard}>
            <span style={valueStyle}>{stats.facultyAssignedPercent}%</span>
            <span style={labelStyle}>Faculty Assigned</span>
          </div>
          <div style={glassCard}>
            <span style={valueStyle}>{stats.roomsUtilized}</span>
            <span style={labelStyle}>Rooms Utilized</span>
          </div>
          <div style={glassCard}>
            <span style={valueStyle}>{stats.timeSlotUtilizationPercent}%</span>
            <span style={labelStyle}>Time Slot Utilization</span>
          </div>
        </div>
      </section>

      {/* ACTIVITY LOG HISTORY MODAL - Pinalitan din ng database data */}
      {showActivityModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 22, 48, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-up" style={{ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ background: '#f8f9fa', padding: '1.5rem 2rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1630', margin: 0 }}>System Activity Log</h3>
              <button onClick={() => setShowActivityModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>

            <div style={{ padding: '2rem', flex: 1, maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                
                {logs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>No activity logs to display.</div>
                ) : (
                  logs.map((item, i) => (
                    <div key={item.log_id || i} style={{ display: 'flex', gap: '1.25rem', padding: '1rem 0', borderBottom: i === logs.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: item.status === 'warn' ? 'rgba(212,22,60,0.1)' : item.status === 'info' ? 'rgba(2,132,199,0.1)' : 'rgba(32,167,131,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.status === 'warn' ? '#d4163c' : item.status === 'info' ? '#0284c7' : '#20a783', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {item.status === 'warn' ? <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path> : item.status === 'info' ? <circle cx="12" cy="12" r="10"></circle> : <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>}
                          {item.status === 'warn' ? <><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></> : item.status === 'info' ? <><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></> : <polyline points="22 4 12 14.01 9 11.01"></polyline>}
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1630', marginBottom: '0.2rem' }}>{item.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.4rem' }}>{item.detail}</div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>{formatLogDate(item.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
    </div>
  );
}