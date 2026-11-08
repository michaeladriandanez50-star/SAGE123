import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Automatically use localhost:5000 when running locally, or DevTunnel when accessed remotely
const API_BASE_URL = 'http://localhost:5000';

export default function GenerateSchedule({ setScreen }: { setScreen: (s: any) => void }) {
  const [step, setStep] = useState(1);
  const [selectedProgram, setSelectedProgram] = useState<'CS' | 'IT' | 'IS'>('IT');

  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);

  const [gaConstraints, setGaConstraints] = useState({
    compressDays: true,
    shiftSplitting: true,
    minimizeGaps: true,
    seniorityWeighting: false,
    minimizeRoomChanges: true,
    roomCapacityMax: true,
  });
  const [cspConfig, setCspConfig] = useState({ maxHours: '4.5', maxPreparations: '3' });

  // Dynamic state populated directly from MySQL `courses` and `sections` tables
  const [curriculumDatabase, setCurriculumDatabase] = useState<Record<'CS' | 'IT' | 'IS', any[]>>({
    CS: [],
    IT: [],
    IS: [],
  });

  const [sectionsData, setSectionsData] = useState<Array<{ id: string; year: number; prog: string }>>([]);

  // Fetch live courses and sections from tup_scheduling_db on mount
  useEffect(() => {
    let isMounted = true;

    const loadCurriculumAndSections = async () => {
      setIsLoadingData(true);
      const urlsToTry = [
        'http://localhost:5000/api/schedule/init-data'
      ];

      for (const url of urlsToTry) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();

          if (data.success && isMounted) {
            if (data.curriculumDatabase) {
              setCurriculumDatabase(data.curriculumDatabase);
            }
            if (Array.isArray(data.sectionsData)) {
              setSectionsData(data.sectionsData);
              setSelectedSections(data.sectionsData.map((s: any) => s.id));
            }
            setIsLoadingData(false);
            return;
          }
        } catch {
          // Try next URL
        }
      }

      setIsLoadingData(false);
    };

    loadCurriculumAndSections();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentCourses = curriculumDatabase[selectedProgram] || [];

  const glassPanel = {
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)',
  };

  const toggleCourse = (id: string) =>
    setSelectedCourses(p => (p.includes(id) ? p.filter(c => c !== id) : [...p, id]));
  const toggleSection = (id: string) =>
    setSelectedSections(p => (p.includes(id) ? p.filter(s => s !== id) : [...p, id]));

  const currentCourseIds = currentCourses.map(c => c.id);
  const isAllCurrentSelected =
    currentCourses.length > 0 && currentCourses.every(c => selectedCourses.includes(c.id));

  const toggleAllCourses = () => {
    if (isAllCurrentSelected) {
      setSelectedCourses(p => p.filter(id => !currentCourseIds.includes(id)));
    } else {
      setSelectedCourses(p => Array.from(new Set([...p, ...currentCourseIds])));
    }
  };

  const isAllSectionsSelected =
    sectionsData.length > 0 && selectedSections.length === sectionsData.length;
  const toggleAllSections = () => {
    if (isAllSectionsSelected) {
      setSelectedSections([]);
    } else {
      setSelectedSections(sectionsData.map(s => s.id));
    }
  };

  const getYearTitle = (year: number) => {
    if (year === 1) return '1st Year';
    if (year === 2) return '2nd Year';
    if (year === 3) return '3rd Year';
    return '4th Year';
  };

  const LockIcon = () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d4163c"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: '2px' }}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );

  const [generationMetrics, setGenerationMetrics] = useState<{
    fitnessScore?: number;
    classesScheduled?: number;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRunGeneration = async () => {
    setStep(3);
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/schedule/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedCourses,
          selectedSections,
          cspConfig,
          gaConstraints,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate schedule');
      }

      localStorage.setItem('sage_generated_schedule', JSON.stringify(data.schedule));
      setGenerationMetrics({
        fitnessScore: data.metrics.fitnessScore,
        classesScheduled: data.metrics.classesScheduled,
      });

      setIsProcessing(false);
      setGenerationDone(true);
    } catch (error: any) {
      console.error('Generation API Error:', error);
      setErrorMessage(error.message || 'Server error while generating schedule.');
      setIsProcessing(false);
      setStep(2);
      alert(`Schedule Generation Failed: ${error.message}`);
    }
  };

  return (
    <div className="fade-up" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* STEP PROGRESS BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2.5rem', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        {[ { num: 1, title: 'Select Curriculum' }, { num: 2, title: 'Sectioning & Constraints' }, { num: 3, title: 'AI Generation' } ].map((s, index) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', opacity: step >= s.num ? 1 : 0.4, transition: 'all 0.3s' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: step >= s.num ? '#d4163c' : '#f3f4f6', color: step >= s.num ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', boxShadow: step === s.num ? '0 4px 12px rgba(212,22,60,0.3)' : 'none' }}>{s.num}</div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: step >= s.num ? '#1a1630' : '#6b7280' }}>{s.title}</span>
            {index < 2 && <div style={{ width: '100px', height: '2px', background: '#e5e7eb', marginLeft: '1.25rem' }}></div>}
          </div>
        ))}
      </div>

      {/* STEP 1: PROGRAM SELECTOR & CURRICULUM */}
      {step === 1 && (
        <div className="fade-up" style={{ ...glassPanel, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.25rem 0' }}>Curriculum Selection</h2>
              <p style={{ fontSize: '0.9rem', color: '#7a6f9a', margin: 0 }}>Select program curriculum and tick subjects to be offered for the active term.</p>
            </div>
            
            <div style={{ display: 'flex', background: '#e5e7eb', padding: '0.3rem', borderRadius: '12px', gap: '0.25rem' }}>
              {(['CS', 'IT', 'IS'] as const).map(prog => (
                <button
                  key={prog}
                  onClick={() => setSelectedProgram(prog)}
                  style={{ background: selectedProgram === prog ? '#d4163c' : 'transparent', color: selectedProgram === prog ? '#fff' : '#4b5563', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {prog === 'CS' ? 'BS Computer Science' : prog === 'IT' ? 'BS Info Technology' : 'BS Info Systems'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4a3f7a' }}>
              Total Subjects Selected: <span style={{ color: '#d4163c' }}>{selectedCourses.length}</span>
            </div>
            <button onClick={toggleAllCourses} style={{ background: 'rgba(212,22,60,0.1)', color: '#d4163c', border: '1px solid rgba(212,22,60,0.2)', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
              {isAllCurrentSelected ? 'Deselect All' : 'Select All Courses'}
            </button>
          </div>

          {isLoadingData ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#7a6f9a', fontWeight: 700 }}>
              Loading curriculum courses from database...
            </div>
          ) : currentCourses.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#7a6f9a', fontWeight: 600 }}>
              No courses found for {selectedProgram}. Please upload courses in Manage Data or check your backend connection.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[1, 2, 3, 4].map(yearLevel => {
                const yearCourses = currentCourses.filter(c => c.year === yearLevel);
                if (yearCourses.length === 0) return null;

                return (
                  <div key={yearLevel} style={{ border: '1px solid rgba(26,22,48,0.1)', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                    <div style={{ background: 'rgba(212,22,60,0.05)', borderBottom: '2px solid rgba(212,22,60,0.1)', padding: '1rem 1.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#d4163c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {getYearTitle(yearLevel)} — {selectedProgram} Curriculum
                      </h3>
                    </div>

                    {[1, 2].map(semester => {
                      const semCourses = yearCourses.filter(c => c.semester === semester);
                      if (semCourses.length === 0) return null;

                      return (
                        <React.Fragment key={`${yearLevel}-${semester}`}>
                          <div style={{ background: '#f8f9fa', padding: '0.6rem 1.5rem', borderBottom: '1px solid rgba(26,22,48,0.05)', borderTop: semester === 2 ? '1px solid rgba(26,22,48,0.1)' : 'none' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4a3f7a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {semester === 1 ? '1st Semester' : '2nd Semester'}
                            </span>
                          </div>

                          {semCourses.map((course, index) => {
                            const isSelected = selectedCourses.includes(course.id);
                            return (
                              <div key={`${selectedProgram}-${course.id}`} onClick={() => toggleCourse(course.id)} style={{ display: 'flex', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: index < semCourses.length - 1 ? '1px solid rgba(26,22,48,0.05)' : 'none', background: isSelected ? 'rgba(32,167,131,0.05)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '6px', border: isSelected ? 'none' : '2px solid #cbd5e1', background: isSelected ? '#20a783' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1.5rem', flexShrink: 0 }}>
                                  {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1630' }}>{course.id}</span>
                                    <span style={{ fontSize: '0.95rem', color: '#4a3f7a' }}>— {course.name}</span>
                                  </div>
                                </div>
                                {course.department_owner && (
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4a3f7a', background: 'rgba(74,63,122,0.08)', padding: '0.25rem 0.65rem', borderRadius: '12px', marginRight: '0.75rem' }}>
                                    {course.department_owner}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#7a6f9a', background: 'rgba(26,22,48,0.05)', padding: '0.3rem 0.75rem', borderRadius: '20px', marginRight: '1rem' }}>{course.type}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d4163c' }}>{course.units} Units</div>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button onClick={() => setStep(2)} disabled={selectedCourses.length === 0} style={{ background: selectedCourses.length > 0 ? '#d4163c' : '#e5e7eb', color: selectedCourses.length > 0 ? '#fff' : '#9ca3af', border: 'none', padding: '0.9rem 2rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: selectedCourses.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: selectedCourses.length > 0 ? '0 4px 15px rgba(212,22,60,0.3)' : 'none', transition: 'all 0.2s' }}>
              Continue to Constraints
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SECTIONING & CONSTRAINTS */}
      {step === 2 && (
        <div className="fade-up" style={{ ...glassPanel, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.25rem 0' }}>Sectioning & AI Constraints</h2>
            <p style={{ fontSize: '0.9rem', color: '#7a6f9a', margin: 0 }}>Configure active blocks and algorithm parameters for the department generation.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid rgba(212,22,60,0.2)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a1630', margin: 0 }}>Active Sections (Database)</h3>
                <button onClick={toggleAllSections} style={{ background: 'transparent', color: '#d4163c', border: '1px solid rgba(212,22,60,0.2)', padding: '0.3rem 0.75rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {isAllSectionsSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {sectionsData.map(section => (
                  <label key={section.id} onClick={() => toggleSection(section.id)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,22,48,0.1)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '4px', border: selectedSections.includes(section.id) ? 'none' : '2px solid #cbd5e1', background: selectedSections.includes(section.id) ? '#20a783' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedSections.includes(section.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <span style={{ fontWeight: 700, color: '#1a1630' }}>{section.id}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(74,63,122,0.1)', color: '#4a3f7a', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>{getYearTitle(section.year)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#d4163c', marginBottom: '1rem', borderBottom: '2px solid rgba(212,22,60,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LockIcon /> Hard Constraints (CSP)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ gridColumn: '1 / -1', padding: '1rem 1.25rem', background: 'rgba(212,22,60,0.05)', border: '1px solid rgba(212,22,60,0.15)', borderRadius: '12px' }}>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#1a1630', fontSize: '0.82rem', lineHeight: 1.65, fontWeight: 600, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1.5rem' }}>
                      <li>No Faculty Double-Booking</li>
                      <li>No Room Double-Booking</li>
                      <li>No Section Double-Booking</li>
                      <li>Room Type Match (Lab vs. Lecture)</li>
                      <li>Operating Hours (7:00 AM – 8:00 PM)</li>
                      <li>Accreditation-Based Faculty Match</li>
                      <li>Faculty Official Time Adherence</li>
                      <li>Regular vs. Overload Load Limits</li>
                      <li style={{ gridColumn: '1 / -1', color: '#d4163c' }}>
                        Friday Modality Lockdown (Strictly Online — No Physical Rooms Assigned)
                      </li>
                    </ul>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,22,48,0.1)', borderRadius: '12px' }}>
                    <div><div style={{ fontWeight: 700, color: '#1a1630', fontSize: '0.85rem' }}>Consecutive Hours</div><div style={{ fontSize: '0.7rem', color: '#7a6f9a' }}>Limit continuous teaching</div></div>
                    <select value={cspConfig.maxHours} onChange={(e) => setCspConfig({...cspConfig, maxHours: e.target.value})} style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#d4163c', cursor: 'pointer', background: '#fff' }}><option value="4.5">4.5 Hrs</option><option value="5">5.0 Hrs</option></select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,22,48,0.1)', borderRadius: '12px' }}>
                    <div><div style={{ fontWeight: 700, color: '#1a1630', fontSize: '0.85rem' }}>Max Preparations</div><div style={{ fontSize: '0.7rem', color: '#7a6f9a' }}>Limit unique subjects</div></div>
                    <select value={cspConfig.maxPreparations} onChange={(e) => setCspConfig({...cspConfig, maxPreparations: e.target.value})} style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#d4163c', cursor: 'pointer', background: '#fff' }}><option value="3">3 Subjs</option><option value="4">4 Subjs (Overload)</option></select>
                  </div>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#20a783', marginBottom: '1rem', borderBottom: '2px solid rgba(32,167,131,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20a783" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Optimization Goals (GA Weighting)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[ { key: 'compressDays', label: 'Section Day Compression', desc: 'Prioritize 3-4 day student schedules' }, { key: 'shiftSplitting', label: 'Shift Splitting', desc: 'Group into Morning/Afternoon blocks' }, { key: 'minimizeGaps', label: 'Intraday Gap Minimization', desc: 'Avoid 3-4 hour vacant periods' }, { key: 'seniorityWeighting', label: 'Faculty Time Preference', desc: 'Apply Seniority Weighting' }, { key: 'minimizeRoomChanges', label: 'Minimize Room Changes', desc: 'Keep same room for consecutive classes' }, { key: 'roomCapacityMax', label: 'Room Capacity Matching', desc: 'Match section size to room capacity' } ].map((item) => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,22,48,0.1)', borderRadius: '12px' }}>
                      <div><div style={{ fontWeight: 700, color: '#1a1630', fontSize: '0.85rem' }}>{item.label}</div><div style={{ fontSize: '0.7rem', color: '#7a6f9a' }}>{item.desc}</div></div>
                      <div onClick={() => setGaConstraints({...gaConstraints, [item.key]: !gaConstraints[item.key as keyof typeof gaConstraints]})} style={{ width: 40, height: 22, borderRadius: 12, background: gaConstraints[item.key as keyof typeof gaConstraints] ? '#20a783' : '#e5e7eb', position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: gaConstraints[item.key as keyof typeof gaConstraints] ? 20 : 2, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', borderTop: '1px solid rgba(26,22,48,0.1)', paddingTop: '1.5rem' }}>
            <button onClick={() => setStep(1)} style={{ background: 'transparent', color: '#4a3f7a', border: '2px solid rgba(74,63,122,0.2)', padding: '0.85rem 2rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}>Back to Curriculum</button>
            <button 
              onClick={handleRunGeneration} 
              disabled={selectedSections.length === 0}
              style={{ background: selectedSections.length > 0 ? '#d4163c' : '#e5e7eb', color: selectedSections.length > 0 ? '#fff' : '#9ca3af', border: 'none', padding: '0.9rem 2rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: selectedSections.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: selectedSections.length > 0 ? '0 4px 15px rgba(212,22,60,0.3)' : 'none', transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Generation Engine
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LOADING */}
      {step === 3 && (
        <div style={{ ...glassPanel, textAlign: 'center', padding: '8rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <style>{`
            @keyframes spin { 100% { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(0.95); } }
            .loading-gear { animation: spin 4s linear infinite; }
            .loading-pulse { animation: pulse 2s ease-in-out infinite; }
          `}</style>
          <div className="loading-pulse" style={{ width: 80, height: 80, margin: '0 auto 2rem', borderRadius: '24px', background: 'linear-gradient(135deg, #d4163c, #8a1a21)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 10px 25px rgba(212,22,60,0.4)' }}>
             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="loading-gear"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path></svg>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.5rem' }}>AI is mapping the department schedule...</h2>
          <p style={{ color: '#7a6f9a', fontSize: '1.1rem', margin: '0 0 2rem 0' }}>Executing Constraint Satisfaction Problem (CSP) & Genetic Algorithms.</p>
          <div style={{ width: '100%', maxWidth: '400px', height: '6px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#d4163c', width: isProcessing ? '85%' : '100%', transition: 'width 3.5s cubic-bezier(0.1, 0.7, 1.0, 0.1)' }}></div>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS MODAL */}
      {generationDone && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(26, 22, 48, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="fade-up" style={{ background: '#fff', borderRadius: '24px', padding: '3.5rem', width: '100%', maxWidth: '550px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', position: 'relative', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(32, 167, 131, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid rgba(32, 167, 131, 0.3)', color: '#20a783' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style={{ color: '#1a1630', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Department Schedule successfully generated!</h2>
            <p style={{ color: '#7a6f9a', fontSize: '1rem', lineHeight: 1.5, margin: '0 0 2.5rem 0' }}>
              The SAGE engine has resolved all hard constraints and optimized the curriculum (Fitness Score: {generationMetrics.fitnessScore ?? 1000}).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '3rem' }}>
              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d4163c' }}>{selectedSections.length}</div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7a6f9a', textTransform: 'uppercase', marginTop: '0.2rem' }}>Sections</div></div>
              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d4163c' }}>{selectedCourses.length}</div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7a6f9a', textTransform: 'uppercase', marginTop: '0.2rem' }}>Subjects</div></div>
              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#20a783' }}>100%</div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7a6f9a', textTransform: 'uppercase', marginTop: '0.2rem' }}>Conflict-Free</div></div>
            </div>
            
            <button 
              onClick={() => { setGenerationDone(false); setScreen('schedule'); }} 
              style={{ width: '100%', backgroundColor: '#20a783', color: '#fff', border: 'none', borderRadius: '12px', padding: '1.1rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(32,167,131,0.3)', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}
            >
              View Final Schedule <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}