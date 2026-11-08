import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Screen } from '../../types';

export default function ServicePortal({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [activeFilter, setActiveFilter] = useState('BSCS 3-1');
  
  // 1. PINALITAN: Imbes na isAdding (boolean), object na ang gagamitin natin para alam natin kung anong subject ang pinili
  const [selectedPendingSubject, setSelectedPendingSubject] = useState<{ id: string, code: string, name: string, duration: number, section: string } | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 2. BAGONG STATE: Ito ang "To-Do List" o Pending Subjects na galing sa Database (CSV)
  const [pendingSubjects, setPendingSubjects] = useState([
    { id: 'p1', code: 'MATH202', name: 'Calculus 2', duration: 3, section: 'BSCS 3-1' },
    { id: 'p2', code: 'PE102', name: 'Physical Education 2', duration: 2, section: 'BSCS 3-1' },
    { id: 'p3', code: 'MATH202', name: 'Calculus 2', duration: 3, section: 'BSCS 3-2' },
  ]);

  const glassPanel = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '20px',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const times = [
    { label: '7:00 AM', val: 7 }, { label: '8:00 AM', val: 8 }, { label: '9:00 AM', val: 9 },
    { label: '10:00 AM', val: 10 }, { label: '11:00 AM', val: 11 }, { label: '12:00 PM', val: 12 },
    { label: '1:00 PM', val: 13 }, { label: '2:00 PM', val: 14 }, { label: '3:00 PM', val: 15 },
    { label: '4:00 PM', val: 16 }, { label: '5:00 PM', val: 17 }, { label: '6:00 PM', val: 18 },
    { label: '7:00 PM', val: 19 }, { label: '8:00 PM', val: 20 }
  ];

  const lockedSchedule = [
    { id: 1, course: 'CS311', name: 'Software Engineering 1', day: 'Monday', startTime: 8, duration: 3, room: 'LAB-401', prof: 'Dr. Dela Cruz', type: 'Lab', section: 'BSCS 3-1' },
    { id: 2, course: 'CS312', name: 'Artificial Intelligence', day: 'Tuesday', startTime: 13, duration: 3, room: 'LAB-402', prof: 'Prof. Santos', type: 'Lab', section: 'BSCS 3-1' },
    { id: 3, course: 'CS313', name: 'Automata Theory', day: 'Wednesday', startTime: 9, duration: 3, room: 'LEC-305', prof: 'Dr. Reyes', type: 'Lec', section: 'BSCS 3-1' },
  ];

  const [serviceSchedule, setServiceSchedule] = useState<any[]>([]);

  const getDayColumn = (dayStr: string) => days.indexOf(dayStr) + 2;
  const getTimeRow = (startHour: number) => (startHour - 7) + 2;

  const filteredLocked = lockedSchedule.filter(s => s.section === activeFilter);
  const filteredService = serviceSchedule.filter(s => s.section === activeFilter);
  const filteredPending = pendingSubjects.filter(s => s.section === activeFilter); // Filtered list para sa sidebar

  // Kapag na-delete, ibabalik sa To-Do List
  const handleDeleteService = (id: number) => {
    if (isSubmitted) return;
    const itemToDelete = serviceSchedule.find(s => s.id === id);
    if (itemToDelete) {
      setPendingSubjects([...pendingSubjects, { id: `p-${itemToDelete.id}`, code: itemToDelete.course, name: itemToDelete.name, duration: itemToDelete.duration, section: itemToDelete.section }]);
      setServiceSchedule(serviceSchedule.filter(s => s.id !== id));
    }
  };

  const handlePlotSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted || !selectedPendingSubject) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const day = formData.get('day') as string;
    const startTime = parseInt(formData.get('startTime') as string);
    const room = formData.get('room') as string;
    const faculty = formData.get('faculty') as string;
    
    // Ang duration ay manggagaling na mismo sa selected pending subject (naka-lock)
    const duration = selectedPendingSubject.duration;

    if (startTime + duration > 20) {
      setConflictError(`Operating Hours Violation: Classes cannot extend beyond 8:00 PM.`);
      setSelectedPendingSubject(null);
      return;
    }

    const hasCSConflict = filteredLocked.some(cs => {
      if (cs.day !== day) return false;
      const csEnd = cs.startTime + cs.duration;
      const newEnd = startTime + duration;
      return startTime < csEnd && newEnd > cs.startTime;
    });

    const hasServiceConflict = filteredService.some(srv => {
      if (srv.day !== day) return false;
      const srvEnd = srv.startTime + srv.duration;
      const newEnd = startTime + duration;
      return startTime < srvEnd && newEnd > srv.startTime;
    });

    if (hasCSConflict) {
      setSelectedPendingSubject(null);
      setConflictError(`Hard Constraint Violation (Core Overlap): The Computer Science Department has a locked core subject scheduled for ${activeFilter} during ${day} at this time slot.`);
    } else if (hasServiceConflict) {
      setSelectedPendingSubject(null);
      setConflictError(`Hard Constraint Violation (Service Overlap): This time slot conflicts with another service subject already plotted for ${activeFilter}.`);
    } else {
      // Idagdag sa schedule grid
      setServiceSchedule([...serviceSchedule, {
        id: Date.now(),
        course: selectedPendingSubject.code,
        name: selectedPendingSubject.name,
        day,
        startTime,
        duration,
        room,
        prof: faculty,
        type: 'Lec',
        section: activeFilter
      }]);

      // Alisin mula sa To-Do List
      setPendingSubjects(pendingSubjects.filter(p => p.id !== selectedPendingSubject.id));
      setSelectedPendingSubject(null);

      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    }
  };

  const handleFinalizeSubmit = () => {
    setIsSubmitted(true);
    setShowConfirmModal(false);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 4000);
  };

  const isFinalizeDisabled = filteredPending.length > 0 || isSubmitted;

  return (
    <div className="fade-up" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
      
      {createPortal(
        <div style={{ position: 'fixed', top: successToast ? '2rem' : '-100px', left: '50%', transform: 'translateX(-50%)', opacity: successToast ? 1 : 0, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', background: isSubmitted ? '#10b981' : '#0284c7', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 10px 25px rgba(2,132,199,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isSubmitted ? 'Schedule successfully finalized and submitted to CS Department!' : 'Service subject successfully plotted with complete details!'}
        </div>,
        document.body
      )}

      {/* HEADER BAR */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '16px', padding: '1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: isSubmitted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)', color: isSubmitted ? '#10b981' : '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.2rem', letterSpacing: '0.02em' }}>Restricted Service Portal (Phase 2 External View)</h1>
            <p style={{ fontSize: '0.85rem', margin: 0, color: '#94a3b8', fontWeight: 600 }}>
              Active Token Access: <span style={{ color: '#38bdf8' }}>Mathematics / PE Department</span> • Status: <span style={{ color: isSubmitted ? '#10b981' : '#f59e0b' }}>{isSubmitted ? 'Finalized & Submitted' : 'Encoding in Progress'}</span>
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', outline: 'none', fontWeight: 700, color: '#0f172a', cursor: 'pointer', background: '#f8fafc' }}>
            <option value="BSCS 3-1">Target: BSCS 3-1</option>
            <option value="BSCS 3-2">Target: BSCS 3-2</option>
          </select>

          {!isSubmitted ? (
            <button 
              onClick={() => setShowConfirmModal(true)} 
              disabled={isFinalizeDisabled}
              title={isFinalizeDisabled ? "Please plot all pending subjects first" : "Submit Schedule"}
              style={{ background: isFinalizeDisabled ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 800, cursor: isFinalizeDisabled ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
            >
              {isFinalizeDisabled ? 'Complete Tasks to Finalize' : 'Finalize & Submit'}
            </button>
          ) : (
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 800, border: '1px solid #10b981' }}>
              ✓ Locked & Submitted
            </span>
          )}

          <button onClick={() => setScreen('reports')} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            Exit Portal
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        
        {/* PENDING SUBJECTS SIDEBAR (TO-DO LIST) */}
        <div style={{ width: '320px', ...glassPanel, flexShrink: 0, padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Pending Subjects
            <span style={{ background: filteredPending.length > 0 ? '#fee2e2' : '#d1fae5', color: filteredPending.length > 0 ? '#ef4444' : '#10b981', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem' }}>
              {filteredPending.length} left
            </span>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {filteredPending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ marginBottom: '0.5rem' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>All subjects plotted!</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>You can now finalize the schedule.</div>
              </div>
            ) : (
              filteredPending.map(sub => (
                <div 
                  key={sub.id} 
                  onClick={() => !isSubmitted && setSelectedPendingSubject(sub)}
                  style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', cursor: isSubmitted ? 'not-allowed' : 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s', opacity: isSubmitted ? 0.6 : 1 }}
                  onMouseOver={e => !isSubmitted && (e.currentTarget.style.borderColor = '#38bdf8', e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 6px 12px rgba(56,189,248,0.15)')}
                  onMouseOut={e => !isSubmitted && (e.currentTarget.style.borderColor = '#e2e8f0', e.currentTarget.style.transform = 'none', e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0369a1' }}>{sub.code}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{sub.duration} Hrs</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>{sub.name}</div>
                  {!isSubmitted && <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>+ Click to plot schedule</div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* SERVICE PORTAL GRID */}
        <div style={{ ...glassPanel, padding: '1.5rem', overflowX: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(6, 1fr)', gridTemplateRows: '50px repeat(14, 75px)', gap: '1px', background: 'rgba(15,23,42,0.1)', border: '1px solid rgba(15,23,42,0.1)', borderRadius: '12px', overflow: 'hidden', minWidth: '800px' }}>
            
            <div style={{ background: '#f8fafc', gridColumn: '1 / 2', gridRow: '1 / 2' }}></div>

            {days.map((day, idx) => (
              <div key={day} style={{ background: '#f8fafc', gridColumn: `${idx + 2} / ${idx + 3}`, gridRow: '1 / 2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#334155', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                {day}
              </div>
            ))}

            {times.map((time, timeIdx) => {
              const row = timeIdx + 2;
              return (
                <React.Fragment key={time.val}>
                  <div style={{ background: '#fff', gridColumn: '1 / 2', gridRow: `${row} / ${row + 1}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                    {time.label}
                  </div>
                  {days.map((day, dayIdx) => {
                    const col = dayIdx + 2;
                    return (
                      <div key={`${day}-${time.val}`} style={{ background: '#fff', gridColumn: `${col} / ${col + 1}`, gridRow: `${row} / ${row + 1}`, borderBottom: '1px dashed rgba(15,23,42,0.05)' }}></div>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {filteredLocked.map((cls) => (
              <div key={`locked-${cls.id}`} style={{ gridColumn: `${getDayColumn(cls.day)} / ${getDayColumn(cls.day) + 1}`, gridRow: `${getTimeRow(cls.startTime)} / span ${cls.duration}`, background: '#f1f5f9', borderLeft: '4px solid #94a3b8', borderRadius: '6px', margin: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', cursor: 'not-allowed', opacity: 0.85, zIndex: 10 }} title="Locked CS Core Subject (Read-Only)">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#475569' }}>{cls.course}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 'auto' }}>{cls.name}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>🔒 Locked by CS Dept</div>
              </div>
            ))}

            {filteredService.map((cls) => (
              <div key={`service-${cls.id}`} style={{ gridColumn: `${getDayColumn(cls.day)} / ${getDayColumn(cls.day) + 1}`, gridRow: `${getTimeRow(cls.startTime)} / span ${cls.duration}`, background: isSubmitted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(56, 189, 248, 0.15)', borderLeft: `4px solid ${isSubmitted ? '#10b981' : '#0284c7'}`, borderRadius: '6px', margin: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', zIndex: 11, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isSubmitted ? '#047857' : '#0369a1' }}>{cls.course}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 800, 
                      background: isSubmitted ? '#10b981' : '#0284c7', 
                      color: '#fff', 
                      padding: '0.15rem 0.4rem', 
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      display: 'inline-block'
                    }}>
                      {isSubmitted ? 'Submitted' : `${cls.duration}h Service`}
                    </span>
                    {!isSubmitted && (
                      <button 
                        onClick={() => handleDeleteService(cls.id)} 
                        title="Remove Subject"
                        style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', width: '20px', height: '20px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isSubmitted ? '#065f46' : '#0c4a6e', marginBottom: 'auto' }}>{cls.name}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSubmitted ? '#047857' : '#0369a1' }}>{cls.room} • {cls.prof}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* PLOT SERVICE SUBJECT MODAL (Naka-lock ang code at name galing sa To-Do List) */}
      {selectedPendingSubject && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={handlePlotSubject} className="fade-up" style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>Plot Service Subject</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 2rem' }}>Configure time and venue for {activeFilter}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>Subject Code</label>
                <input type="text" value={selectedPendingSubject.code} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f1f5f9', color: '#64748b' }} readOnly />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>Subject Name</label>
                <input type="text" value={selectedPendingSubject.name} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f1f5f9', color: '#64748b' }} readOnly />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>Duration (Locked)</label>
                <input type="text" value={`${selectedPendingSubject.duration} Hours`} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f1f5f9', color: '#64748b' }} readOnly />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>Day</label>
                <select name="day" style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>Start Time</label>
                <select name="startTime" style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
                  {times.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>Assigned Room</label>
                <input 
                  name="room" 
                  type="text" 
                  placeholder="Enter designated room" 
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} 
                  required 
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>Assigned Faculty / Instructor</label>
                <input name="faculty" type="text" defaultValue="Prof. Villanueva" style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' }}>
              <button type="button" onClick={() => setSelectedPendingSubject(null)} style={{ background: 'transparent', color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer', padding: '0.5rem 1rem' }}>Cancel</button>
              <button type="submit" style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Validate & Plot</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {showConfirmModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-up" style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(16,185,129,0.3)', borderTop: '6px solid #10b981' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>Finalize and Submit Schedule?</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, margin: '1rem 0' }}>
              Once finalized, your encoding window will close, your plotted service subjects will be officially locked, and the Computer Science Department will be notified.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => setShowConfirmModal(false)} style={{ background: 'transparent', color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer', padding: '0.5rem 1rem' }}>Cancel</button>
              <button onClick={handleFinalizeSubmit} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Yes, Submit Schedule</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {conflictError && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-up" style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(225,29,72,0.4)', borderTop: '6px solid #e11d48' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>Constraint Violation Blocked</h3>
            <div style={{ background: '#fff1f2', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fecdd3', fontSize: '0.95rem', color: '#9f1239', lineHeight: 1.5, fontWeight: 600, margin: '1.5rem 0' }}>
              {conflictError}
            </div>
            <button onClick={() => setConflictError(null)} style={{ width: '100%', background: '#e11d48', color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
              Acknowledge & Try Another Slot
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}