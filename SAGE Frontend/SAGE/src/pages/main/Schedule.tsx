import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_BASE_URL = 'http://localhost:5000';

// Helper to load external script on-demand without requiring npm install
const loadExternalScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
};

export default function Schedule() {
  const [selectedProgram, setSelectedProgram] = useState<'CS' | 'IT' | 'IS'>('CS');
  const [filterType, setFilterType] = useState<'Section' | 'Faculty' | 'Room' | 'Course'>('Section');
  const [activeFilter, setActiveFilter] = useState('BSCS 3-1');

  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [selectedProfModal, setSelectedProfModal] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportToast, setExportToast] = useState(false);

  // Reference to the schedule grid for symmetrical PDF rendering
  const scheduleGridRef = useRef<HTMLDivElement>(null);

  // Default schedule data per program (CS, IT, IS)
  const [scheduleDatabase, setScheduleDatabase] = useState<Record<'CS' | 'IT' | 'IS', any[]>>({
    CS: [
   
    ],
    IT: [
   
    ],
    IS: [
      
    ],
  });

  // Load latest generated schedule from backend if available
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/schedule/latest`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.schedule) && data.schedule.length > 0) {
          const grouped: Record<'CS' | 'IT' | 'IS', any[]> = { CS: [], IT: [], IS: [] };
          const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

          // Track occupied intervals per Section, Faculty, and Room to guarantee zero visual overlap
          const occupiedSection: Record<string, Array<{ start: number; end: number }>> = {};
          const occupiedProf: Record<string, Array<{ start: number; end: number }>> = {};
          const occupiedRoom: Record<string, Array<{ start: number; end: number }>> = {};

          const hasOverlap = (list: Array<{ start: number; end: number }> | undefined, s: number, e: number) =>
            (list || []).some(iv => s < iv.end && e > iv.start);

          data.schedule.forEach((row: any, idx: number) => {
            const progKey: 'CS' | 'IT' | 'IS' =
              row.program === 'BSCS' || String(row.section_id).startsWith('CS') || String(row.course_code).startsWith('CS')
                ? 'CS'
                : row.program === 'BSIS' || String(row.section_id).startsWith('IS') || String(row.course_code).startsWith('IS')
                ? 'IS'
                : 'IT';

            // Calculate exact block duration from lec_hours + lab_hours
            const lecHours = Number(row.lec_hours) || 0;
            const labHours = Number(row.lab_hours) || 0;
            const totalHours = lecHours + labHours;
            const blockDuration = totalHours >= 1 && totalHours <= 3 ? totalHours : totalHours > 3 ? 3 : 2;

            let startHour = 7;
            if (row.timeslot_id && String(row.timeslot_id).includes('-')) {
              const code = parseInt(String(row.timeslot_id).split('-')[1], 10);
              if (!isNaN(code)) startHour = Math.floor(code / 100);
            } else if (row.start_time) {
              startHour = parseInt(String(row.start_time).split(':')[0], 10) || 7;
            }
            startHour = Math.max(7, Math.min(20 - blockDuration, startHour));

            let assignedDay = row.day || 'Monday';
            const isOnline =
              assignedDay === 'Friday' ||
              String(row.modality_rule).toUpperCase() === 'ONLINE' ||
              String(row.room_id).toUpperCase().includes('ONLINE');
            const isLab =
              !isOnline &&
              (String(row.room_type).toLowerCase().includes('lab') ||
                String(row.room_id).toUpperCase().includes('LB') ||
                String(row.course_code).toUpperCase().includes('L'));

            const sectionId = row.section_id || 'IT1A';
            const profName = row.faculty_name || row.faculty_id || 'TBA';
            let roomId = isOnline ? 'ONLINE' : row.room_id || 'LEC-301';

            // Safety check: If an older DB record overlaps, shift it to the next available non-overlapping slot
            const checkSlotConflict = (d: string, sHour: number) => {
              const eHour = sHour + blockDuration;
              if (eHour > 20) return true;
              if (hasOverlap(occupiedSection[`${sectionId}-${d}`], sHour, eHour)) return true;
              if (hasOverlap(occupiedProf[`${profName}-${d}`], sHour, eHour)) return true;
              if (d !== 'Friday' && roomId !== 'ONLINE' && hasOverlap(occupiedRoom[`${roomId}-${d}`], sHour, eHour)) {
                return true;
              }
              return false;
            };

            if (checkSlotConflict(assignedDay, startHour)) {
              let foundAlternative = false;
              const candidateDays = [assignedDay, ...validDays.filter(d => d !== assignedDay)];
              for (const d of candidateDays) {
                if (foundAlternative) break;
                for (let h = 7; h <= 20 - blockDuration; h++) {
                  if (!checkSlotConflict(d, h)) {
                    assignedDay = d;
                    startHour = h;
                    if (d === 'Friday') roomId = 'ONLINE';
                    foundAlternative = true;
                    break;
                  }
                }
              }
            }

            const endHour = startHour + blockDuration;
            if (!occupiedSection[`${sectionId}-${assignedDay}`]) occupiedSection[`${sectionId}-${assignedDay}`] = [];
            occupiedSection[`${sectionId}-${assignedDay}`].push({ start: startHour, end: endHour });

            if (!occupiedProf[`${profName}-${assignedDay}`]) occupiedProf[`${profName}-${assignedDay}`] = [];
            occupiedProf[`${profName}-${assignedDay}`].push({ start: startHour, end: endHour });

            if (assignedDay !== 'Friday' && roomId !== 'ONLINE') {
              if (!occupiedRoom[`${roomId}-${assignedDay}`]) occupiedRoom[`${roomId}-${assignedDay}`] = [];
              occupiedRoom[`${roomId}-${assignedDay}`].push({ start: startHour, end: endHour });
            }

            grouped[progKey].push({
              id: row.schedule_id || idx + 1000,
              course: row.course_code,
              name: row.course_name || row.course_code,
              day: assignedDay,
              startTime: startHour,
              duration: blockDuration,
              room: roomId,
              prof: profName,
              type: assignedDay === 'Friday' || roomId === 'ONLINE' ? 'Online' : isLab ? 'Lab' : 'Lec',
              section: sectionId,
            });
          });

          setScheduleDatabase(prev => ({
            CS: grouped.CS.length > 0 ? grouped.CS : prev.CS,
            IT: grouped.IT.length > 0 ? grouped.IT : prev.IT,
            IS: grouped.IS.length > 0 ? grouped.IS : prev.IS,
          }));

          // Automatically switch to a program tab that has generated data
          const firstPopulatedProg = (['IT', 'CS', 'IS'] as const).find(p => grouped[p].length > 0);
          if (firstPopulatedProg) {
            setSelectedProgram(firstPopulatedProg);
            setActiveFilter(grouped[firstPopulatedProg][0].section);
          }
        }
      })
      .catch(() => {
        // Keep default scheduleDatabase if backend is offline
      });
  }, []);

  const currentScheduleData = scheduleDatabase[selectedProgram] || [];

  const glassPanel = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)',
  };




    /* View Schedule TAB Schedule Grid */

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const times = [
    { label: '7:00 AM', val: 7 }, { label: '8:00 AM', val: 8 }, { label: '9:00 AM', val: 9 },
    { label: '10:00 AM', val: 10 }, { label: '11:00 AM', val: 11 }, { label: '12:00 PM', val: 12 },
    { label: '1:00 PM', val: 13 }, { label: '2:00 PM', val: 14 }, { label: '3:00 PM', val: 15 },
    { label: '4:00 PM', val: 16 }, { label: '5:00 PM', val: 17 }, { label: '6:00 PM', val: 18 },
    { label: '7:00 PM', val: 19 }, { label: '8:00 PM', val: 20 }
  ];





    /* View Schedule TAB Section Selection */

  const facultyRecommendations = [
    { name: 'Prof. Cruz', stars: 3, desc: 'Best Match — Qualified, Available, Lowest Teaching Load, Matches Preferred Schedule.' },
    { name: 'Prof. Reyes', stars: 2, desc: 'Qualified, Available, Near Maximum Load.' },
    { name: 'Prof. Santos', stars: 1, desc: 'Qualified, Limited Availability.' }
  ];










  const getDayColumn = (dayStr: string) => days.indexOf(dayStr) + 2;
  const getTimeRow = (startHour: number) => (startHour - 7) + 2;

  const getFilterOptions = () => {
    const dynamicValues = Array.from(
      new Set(
        currentScheduleData.map(cls => {
          if (filterType === 'Section') return cls.section;
          if (filterType === 'Faculty') return cls.prof;
          if (filterType === 'Room') return cls.room;
          return cls.course;
        })
      )
    ).filter(Boolean);

    if (dynamicValues.length > 0) return dynamicValues;





    /* View Schedule TAB Section Selection */
    switch (filterType) {
      case 'Section':
        if (selectedProgram === 'CS') return [];
        if (selectedProgram === 'IT') return [];
        return [];
      case 'Faculty':
        return [];
      case 'Room':
        return [];
      case 'Course':
        if (selectedProgram === 'CS') return [];
        if (selectedProgram === 'IT') return [];
        return [];
      default:
        return [];
    }
  };










  const displayedSchedule = currentScheduleData.filter((cls) => {
    if (filterType === 'Section') return cls.section === activeFilter;
    if (filterType === 'Faculty') return cls.prof === activeFilter;
    if (filterType === 'Room') return cls.room === activeFilter;
    if (filterType === 'Course') return cls.course === activeFilter;
    return true;
  });

  const handleOpenEditModal = (block: any) => {
    setEditingBlock(block);
    setSelectedProfModal(block.prof);
  };

  // =========================================================================
  // FUNCTIONAL PDF EXPORT: SYMMETRICALLY CENTERED ON LANDSCAPE A4
  // =========================================================================
  const handleExportPDF = async () => {
    if (!scheduleGridRef.current || isExporting) return;
    setIsExporting(true);

    try {
      // 1. Load html2canvas and jsPDF dynamically
      await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

      const html2canvas = (window as any).html2canvas;
      const { jsPDF } = (window as any).jspdf;

      // 2. Build an off-screen symmetrical wrapper with a centered institutional header + full calendar grid
      const exportWrapper = document.createElement('div');
      exportWrapper.style.position = 'fixed';
      exportWrapper.style.top = '0';
      exportWrapper.style.left = '-9999px';
      exportWrapper.style.width = '1440px';
      exportWrapper.style.padding = '28px';
      exportWrapper.style.backgroundColor = '#ffffff';
      exportWrapper.style.boxSizing = 'border-box';
      exportWrapper.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
      exportWrapper.style.display = 'flex';
      exportWrapper.style.flexDirection = 'column';
      exportWrapper.style.alignItems = 'center';
      exportWrapper.style.justifyContent = 'center';

      // Centered PDF Header Banner
      const headerEl = document.createElement('div');
      headerEl.style.width = '100%';
      headerEl.style.textAlign = 'center';
      headerEl.style.marginBottom = '22px';
      headerEl.style.paddingBottom = '16px';
      headerEl.style.borderBottom = '2px solid #d4163c';
      headerEl.innerHTML = `
        <div style="font-size: 13px; font-weight: 800; color: #d4163c; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 4px;">
          Technological University of the Philippines — SAGE Scheduling System
        </div>
        <div style="font-size: 24px; font-weight: 800; color: #1a1630; margin-bottom: 6px;">
          Department Schedule Board (${selectedProgram === 'CS' ? 'BS Computer Science' : selectedProgram === 'IT' ? 'BS Information Technology' : 'BS Information Systems'})
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #4a3f7a;">
          ${filterType}: <span style="color: #d4163c;">${activeFilter}</span> &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()}
        </div>
      `;
      exportWrapper.appendChild(headerEl);

      // Clone the calendar grid so scrollbars/viewport clipping never cut off columns
      const clonedGrid = scheduleGridRef.current.cloneNode(true) as HTMLElement;
      clonedGrid.style.width = '100%';
      clonedGrid.style.minWidth = '100%';
      clonedGrid.style.margin = '0 auto';
      clonedGrid.style.boxShadow = 'none';
      exportWrapper.appendChild(clonedGrid);

      document.body.appendChild(exportWrapper);

      const PAGE_MARGIN_MM = 6;
      const printableRatio = (297 - PAGE_MARGIN_MM * 2) / (210 - PAGE_MARGIN_MM * 2);
      for (let i = 0; i < 2; i++) {
        exportWrapper.style.width = `${Math.round(exportWrapper.offsetHeight * printableRatio)}px`;
      }

      // 3. Capture high-DPI canvas of the wrapper
      const canvas = await html2canvas(exportWrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: exportWrapper.offsetWidth,
        height: exportWrapper.offsetHeight,
      });

      document.body.removeChild(exportWrapper);

      // 4. Create A4 Landscape PDF and mathematically center the image both horizontally & vertically
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();   // 297 mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 210 mm
      const margin = PAGE_MARGIN_MM;

      const maxPrintableWidth = pageWidth - margin * 2;
      const maxPrintableHeight = pageHeight - margin * 2;

      const imgRatio = canvas.width / canvas.height;
      let renderWidth = maxPrintableWidth;
      let renderHeight = renderWidth / imgRatio;

      if (renderHeight > maxPrintableHeight) {
        renderHeight = maxPrintableHeight;
        renderWidth = renderHeight * imgRatio;
      }

      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = (pageHeight - renderHeight) / 2;

      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');

      const safeFilename = `SAGE_Schedule_${selectedProgram}_${filterType}_${activeFilter.replace(/\s+/g, '_')}.pdf`;
      pdf.save(safeFilename);

      setIsExporting(false);
      setExportToast(true);
      setTimeout(() => setExportToast(false), 3000);
    } catch (error) {
      console.error('PDF Export Error:', error);
      setIsExporting(false);
      alert('Failed to export PDF. Please check your internet connection and try again.');
    }
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = e.target as HTMLFormElement;
    const data = new FormData(formData);
    const newRoom = data.get('room') as string;
    const newDay = data.get('day') as string;
    const newStartTime = parseInt(data.get('startTime') as string);
    const newDuration = parseInt(data.get('duration') as string) || editingBlock.duration;
    const newProf = selectedProfModal !== editingBlock.prof ? selectedProfModal : (data.get('prof') as string);

    // Hard Constraint 5: Operating Hours Boundary (7:00 AM - 8:00 PM)
    if (newStartTime + newDuration > 20) {
      setIsSaving(false);
      setEditingBlock(null);
      setConflictError(`Operating Hours Violation: Classes cannot extend beyond 8:00 PM.`);
      return;
    }

    // Hard Constraint 10: Friday Modality Lockdown
    if (newDay === 'Friday' && newRoom !== 'ONLINE') {
      setIsSaving(false);
      setEditingBlock(null);
      setConflictError(`Friday Modality Lockdown: Fridays are strictly dedicated to Online classes. No physical room (${newRoom}) can be assigned on Friday.`);
      return;
    }

    // Hard Constraint 4: Room Type Match
    if (newDay !== 'Friday' && editingBlock.type === 'Lab' && (newRoom.startsWith('LEC') || ['321', '324', '328'].includes(newRoom))) {
      setIsSaving(false);
      setEditingBlock(null);
      setConflictError(`Room Type Mismatch: Laboratory subject (${editingBlock.course}) cannot be plotted in a Lecture room (${newRoom}).`);
      return;
    }

    // Hard Constraint 1, 2, 3: Double-Booking Check against current schedule
    const hasConflict = currentScheduleData.some(cls => {
      if (cls.id === editingBlock.id || cls.day !== newDay) return false;
      const existingEnd = cls.startTime + cls.duration;
      const newEnd = newStartTime + newDuration;
      const overlaps = newStartTime < existingEnd && newEnd > cls.startTime;
      if (!overlaps) return false;

      if (cls.section === editingBlock.section) return true;
      if (cls.prof === newProf) return true;
      if (newRoom !== 'ONLINE' && cls.room === newRoom) return true;
      return false;
    });

    setTimeout(() => {
      setIsSaving(false);
      if (hasConflict) {
        setEditingBlock(null);
        setConflictError(`System blocked adjustment to ${newRoom} on ${newDay}. Violates hard constraints (Section, Faculty, or Room double-booking).`);
        return;
      }

      // Update state with valid manual adjustment
      setScheduleDatabase(prev => ({
        ...prev,
        [selectedProgram]: prev[selectedProgram].map(cls =>
          cls.id === editingBlock.id
            ? {
                ...cls,
                room: newRoom,
                day: newDay,
                startTime: newStartTime,
                duration: newDuration,
                prof: newProf,
                type: newRoom === 'ONLINE' ? 'Online' : cls.type === 'Online' ? 'Lec' : cls.type,
              }
            : cls
        ),
      }));

      setEditingBlock(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }, 500);
  };

  return (
    <div className="fade-up" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin-animation { animation: spin 1s linear infinite; }
      `}</style>

      {createPortal(
        <div style={{ position: 'fixed', top: showSuccessToast ? '2rem' : '-100px', left: '50%', transform: 'translateX(-50%)', opacity: showSuccessToast ? 1 : 0, pointerEvents: showSuccessToast ? 'auto' : 'none', background: '#20a783', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 25px rgba(32,167,131,0.4)', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', zIndex: 9999 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
          Manual adjustment and duration saved successfully!
        </div>,
        document.body
      )}

      {createPortal(
        <div style={{ position: 'fixed', top: exportToast ? '2rem' : '-100px', left: '50%', transform: 'translateX(-50%)', opacity: exportToast ? 1 : 0, pointerEvents: exportToast ? 'auto' : 'none', background: '#20a783', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 25px rgba(32,167,131,0.4)', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', zIndex: 9999 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
          Schedule PDF exported successfully!
        </div>,
        document.body
      )}

      {/* HEADER CONTROLS WITH PROGRAM SELECTOR */}
      <div style={{ ...glassPanel, padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.25rem 0' }}>Department Schedule Board ({selectedProgram})</h2>
          <p style={{ fontSize: '0.9rem', color: '#7a6f9a', margin: 0 }}>Review and manually adjust AI-generated schedules with dynamic time allocation.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* PROGRAM TABS */}
          <div style={{ display: 'flex', background: '#e5e7eb', padding: '0.3rem', borderRadius: '10px', gap: '0.2rem' }}>
            {(['CS', 'IT', 'IS'] as const).map(prog => (
              <button
                key={prog}
                onClick={() => {
                  setSelectedProgram(prog);
                  const progData = scheduleDatabase[prog] || [];
                  if (progData.length > 0) {
                    if (filterType === 'Section') setActiveFilter(progData[0].section);
                    else if (filterType === 'Faculty') setActiveFilter(progData[0].prof);
                    else if (filterType === 'Room') setActiveFilter(progData[0].room);
                    else setActiveFilter(progData[0].course);
                  } else {
                    setActiveFilter(prog === 'CS' ? 'BSCS 3-1' : prog === 'IT' ? 'BSIT 3-1' : 'BSIS 3-1');
                  }
                }}
                style={{ background: selectedProgram === prog ? '#fff' : 'transparent', color: selectedProgram === prog ? '#d4163c' : '#4b5563', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', boxShadow: selectedProgram === prog ? '0 2px 6px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
              >
                {prog}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.3rem' }}>
            {['Section', 'Faculty', 'Room', 'Course'].map((type) => {
              const getFirstOptionForType = (t: string) => {
                const firstItem = currentScheduleData[0];
                if (firstItem) {
                  if (t === 'Section') return firstItem.section;
                  if (t === 'Faculty') return firstItem.prof;
                  if (t === 'Room') return firstItem.room;
                  if (t === 'Course') return firstItem.course;
                }
                switch(t) {
                  case 'Section': return selectedProgram === 'CS' ? 'BSCS 3-1' : selectedProgram === 'IT' ? 'BSIT 3-1' : 'BSIS 3-1';
                  case 'Faculty': return 'Dr. Dela Cruz';
                  case 'Room': return 'LAB-401';
                  case 'Course': return selectedProgram === 'CS' ? 'CS311' : selectedProgram === 'IT' ? 'IT311' : 'IS311';
                  default: return '';
                }
              };

              return (
                <button 
                  key={type}
                  onClick={() => {
                    setFilterType(type as any);
                    setActiveFilter(getFirstOptionForType(type));
                  }}
                  style={{ background: filterType === type ? '#fff' : 'transparent', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: filterType === type ? 700 : 600, fontSize: '0.85rem', color: filterType === type ? '#d4163c' : '#6b7280', cursor: 'pointer', boxShadow: filterType === type ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                >
                  {type}
                </button>
              );
            })}
          </div>
          
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 700, color: '#1a1630', cursor: 'pointer', background: '#fff', minWidth: '160px' }}>
            {getFilterOptions().map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            style={{ background: '#1a1630', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 700, cursor: isExporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isExporting ? 0.8 : 1 }}
          >
            {isExporting ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin-animation"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            )}
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* STABLE CALENDAR GRID */}
      <div style={{ ...glassPanel, padding: '1.5rem', overflowX: 'auto' }}>
        <div
          ref={scheduleGridRef}
          style={{ display: 'grid', gridTemplateColumns: '80px repeat(6, 1fr)', gridTemplateRows: '50px repeat(14, 75px)', gap: '1px', background: 'rgba(26,22,48,0.1)', border: '1px solid rgba(26,22,48,0.1)', borderRadius: '12px', overflow: 'hidden', minWidth: '1100px' }}
        >
          <div style={{ background: '#f8f9fa', gridColumn: '1 / 2', gridRow: '1 / 2' }}></div>

          {days.map((day, idx) => (
            <div key={day} style={{ background: '#f8f9fa', gridColumn: `${idx + 2} / ${idx + 3}`, gridRow: '1 / 2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#4a3f7a', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
              {day}
            </div>
          ))}

          {times.map((time, timeIdx) => {
            const row = timeIdx + 2;
            return (
              <React.Fragment key={time.val}>
                <div style={{ background: '#fff', gridColumn: '1 / 2', gridRow: `${row} / ${row + 1}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#7a6f9a' }}>
                  {time.label}
                </div>
                {days.map((day, dayIdx) => {
                  const col = dayIdx + 2;
                  return (
                    <div key={`${day}-${time.val}`} style={{ background: '#fff', gridColumn: `${col} / ${col + 1}`, gridRow: `${row} / ${row + 1}`, borderBottom: '1px dashed rgba(26,22,48,0.05)' }}></div>
                  );
                })}
              </React.Fragment>
            );
          })}

          {displayedSchedule.map((cls) => {
            const isOnline = cls.type === 'Online';
            const isLab = cls.type === 'Lab';
            const blockStyle = { background: isOnline ? 'rgba(122, 63, 186, 0.15)' : isLab ? 'rgba(32, 167, 131, 0.15)' : 'rgba(212, 22, 60, 0.1)', borderLeft: `4px solid ${isOnline ? '#7a3fba' : isLab ? '#20a783' : '#d4163c'}`, color: isOnline ? '#4b1d7d' : isLab ? '#11634d' : '#8a1a21' };

            return (
              <div 
                key={cls.id} onClick={() => handleOpenEditModal(cls)} className="schedule-block"
                style={{ gridColumn: `${getDayColumn(cls.day)} / ${getDayColumn(cls.day) + 1}`, gridRow: `${getTimeRow(cls.startTime)} / span ${cls.duration}`, background: blockStyle.background, borderLeft: blockStyle.borderLeft, borderRadius: '6px', margin: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', zIndex: 10 }}
                title="Click to manually adjust time, duration, room, or faculty"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: blockStyle.color }}>{cls.course}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#fff', padding: '0.2rem 0.5rem', borderRadius: '12px', color: blockStyle.color }}>{cls.duration}h • {cls.type}</span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.9, marginBottom: 'auto', lineHeight: 1.2 }}>{cls.name}</div>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 600, opacity: 0.8 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>{cls.room}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 600, opacity: 0.8 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>{cls.prof}</div>
                  {(filterType === 'Faculty' || filterType === 'Room') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 800, color: blockStyle.color, marginTop: '0.2rem' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      {cls.section}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingBlock && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 22, 48, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={handleSaveAdjustment} className="fade-up" style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '580px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.5rem' }}>Manual Adjustment</h3>
            <p style={{ fontSize: '0.9rem', color: '#7a6f9a', margin: '0 0 2rem' }}>Editing {editingBlock.course} ({editingBlock.section})</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1630', display: 'block' }}>Faculty Reassignment</label>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#20a783', background: 'rgba(32,167,131,0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="#20a783" stroke="#20a783" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> AI Decision-Aid</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '170px', overflowY: 'auto', border: '1px solid rgba(26,22,48,0.1)', borderRadius: '12px', padding: '0.5rem', background: '#f8f9fa' }}>
                  {facultyRecommendations.map((prof) => {
                    const isSelected = selectedProfModal === prof.name;
                    return (
                      <div key={prof.name} onClick={() => setSelectedProfModal(prof.name)} style={{ padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer', background: isSelected ? '#fff' : 'transparent', border: isSelected ? '1px solid #20a783' : '1px solid transparent', boxShadow: isSelected ? '0 2px 8px rgba(32,167,131,0.15)' : 'none', transition: 'all 0.2s', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '0.1rem', marginTop: '0.2rem', width: '45px', flexShrink: 0 }}>
                           {Array(3).fill(0).map((_, i) => <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < prof.stars ? "#f59e0b" : "none"} stroke={i < prof.stars ? "#f59e0b" : "#cbd5e1"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>)}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? '#20a783' : '#1a1630', marginBottom: '0.2rem' }}>{prof.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#7a6f9a', lineHeight: 1.4 }}>{prof.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Assigned Room</label>
                <select name="room" defaultValue={editingBlock.room} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none', cursor: 'pointer' }}>
                  <option value="LAB-401">LAB-401</option><option value="LAB-402">LAB-402</option><option value="LEC-301">LEC-301</option><option value="LEC-305">LEC-305</option><option value="LB1">LB1</option><option value="321">321</option><option value="324">324</option><option value="328">328</option><option value="ONLINE">ONLINE (Virtual)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Day</label>
                <select name="day" defaultValue={editingBlock.day} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none', cursor: 'pointer' }}>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Start Time</label>
                <select name="startTime" defaultValue={editingBlock.startTime} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none', cursor: 'pointer' }}>
                  {times.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Duration (Hours)</label>
                <select name="duration" defaultValue={editingBlock.duration} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none', cursor: 'pointer' }}>
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="3">3 Hours (Standard Block)</option>
                </select>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' }}>
              <button type="button" onClick={() => setEditingBlock(null)} disabled={isSaving} style={{ background: 'transparent', color: '#7a6f9a', border: 'none', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', padding: '0.5rem 1rem' }}>Cancel</button>
              <button type="submit" disabled={isSaving} style={{ background: '#20a783', color: '#fff', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '10px', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(32,167,131,0.2)' }}>
                {isSaving ? 'Validating...' : 'Validate & Save'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* CONFLICT ERROR MODAL */}
      {conflictError && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 22, 48, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-up" style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(212,22,60,0.3)', borderTop: '6px solid #d4163c' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(212,22,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4163c', flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
              <div><h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.2rem' }}>Hard Constraint Violation</h3><p style={{ fontSize: '0.85rem', color: '#d4163c', fontWeight: 700, margin: 0 }}>Manual edit rejected by the system.</p></div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '0.95rem', color: '#4a3f7a', lineHeight: 1.5, fontWeight: 600, marginBottom: '2.5rem' }}>{conflictError}</div>
            <button onClick={() => setConflictError(null)} style={{ width: '100%', background: '#d4163c', color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'background 0.2s' }}>Revert Changes</button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}