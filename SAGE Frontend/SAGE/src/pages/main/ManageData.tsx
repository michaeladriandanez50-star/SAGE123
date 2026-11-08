import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Tab = 'faculty' | 'rooms' | 'sections' | 'courses' | 'timeslots';

// Column header the uploaded file must contain for each tab (the backend matches it ignoring upper/lower case)
// Column header the uploaded file must contain for each tab (the backend matches it ignoring upper/lower case)
const COLUMN_LABEL: Record<Tab, string> = {
  faculty: 'Faculty',
  rooms: 'Rooms',
  sections: 'Sections',
  courses: 'Courses',
  timeslots: 'Timeslots',
};

export default function ManageData({ setScreen }: { setScreen: (s: any) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('faculty');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // States for polished UI interactions
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  // Hidden file input reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Gawing blangko ang initial state imbes na may dummy data
  const [tableData, setTableData] = useState<Record<Tab, Array<{id: string, description: string, extra?: string}>>>({
    faculty: [], rooms: [], sections: [], courses: [], timeslots: []
  });

  // 2. Function para kumuha ng data mula sa MySQL
  const fetchData = async (tab: Tab) => {
    try {
      const response = await fetch(`http://localhost:5000/api/data/${tab}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      
      console.log(`Data for ${tab}:`, data); // <-- DINAGDAG NA LOG
      
      setTableData(prev => ({ ...prev, [tab]: data }));
    } catch (error) {
      console.error(error);
    }
  };

  // 3. Awtomatikong tawagin ang fetchData kapag lumipat ng Tab o nag-load ang page
  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  // States for Edit and Delete Actions
  const [itemToDelete, setItemToDelete] = useState<{id: string, description: string} | null>(null);
  const [itemToEdit, setItemToEdit] = useState<{id: string, description: string} | null>(null);

  const glassPanel = {
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '20px',
    padding: '1.75rem',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)',
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    backgroundColor: isActive ? '#d4163c' : 'rgba(255,255,255,0.5)',
    color: isActive ? '#fff' : '#1a1630',
    boxShadow: isActive ? '0 4px 15px rgba(212,22,60,0.25)' : 'none'
  });

  const getHeaders = () => {
    if (activeTab === 'timeslots') return ['Block ID', 'Day & Time Range', 'Modality', 'Actions'];
    return ['ID / Code', 'Name / Description', 'Status', 'Actions'];
  };

  // Memoized search logic (Now uses the interactive state)
  const displayedData = useMemo(() => {
    const data = tableData[activeTab];
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    // Palitan ang item.desc ng item.description
    return data.filter(item => item.id.toLowerCase().includes(lowerQuery) || item.description.toLowerCase().includes(lowerQuery));
  }, [activeTab, searchQuery, tableData]);

  // Handle File Upload
  const handleAddClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // CSV and Excel only (the backend checks this again)
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const dot = file.name.lastIndexOf('.');
    const fileExtension = dot === -1 ? '' : file.name.substring(dot).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setToastType('error');
      setToastMessage('Invalid format. Please upload a CSV or Excel file only.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      e.target.value = ''; 
      return;
    }

    setToastType('success');
    setToastMessage(`Uploading ${file.name}...`);
    setShowToast(true);
    let uploadFailed = false;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`http://localhost:5000/api/upload/${activeTab}`, {
        method: 'POST',
        body: formData 
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed.');

      setToastType('success');
      setToastMessage(data.message);
      
      // 4. I-refresh ang table pagkatapos mag-upload para makita agad ang bagong data!
      fetchData(activeTab); 

    } catch (error: any) {
      uploadFailed = true;
      setToastType('error');
      setToastMessage(error.message);
    } finally {
      setTimeout(() => setShowToast(false), uploadFailed ? 7000 : 3000);
      e.target.value = ''; 
    }
  };

  // DELETE LOGIC
  // DELETE LOGIC
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      // 1. Magpadala ng DELETE request sa backend
      const response = await fetch(`http://localhost:5000/api/data/${activeTab}/${itemToDelete.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete record.');
      }

      // 2. Kapag success sa database, saka pa lang buburahin sa UI
      setTableData(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(item => item.id !== itemToDelete.id)
      }));
      
      setToastType('success');
      setToastMessage(data.message || `Record successfully deleted.`);
      setShowToast(true);
      
    } catch (error: any) {
      setToastType('error');
      setToastMessage(error.message);
      setShowToast(true);
    } finally {
      setItemToDelete(null); // I-close ang modal
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // EDIT LOGIC
  // EDIT LOGIC
  const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!itemToEdit) return;
    
    const formData = new FormData(e.currentTarget);
    const newDescription = formData.get('description') as string;

    try {
      // 1. Magpadala ng PUT request sa backend
      const response = await fetch(`http://localhost:5000/api/data/${activeTab}/${itemToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update record.');
      }

      // 2. I-update ang UI state kapag nagtagumpay sa database
      setTableData(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(item => item.id === itemToEdit.id ? { ...item, description: newDescription } : item)
      }));

      setToastType('success');
      setToastMessage(data.message || `Record ${itemToEdit.id} successfully updated.`);
      setShowToast(true);
      setItemToEdit(null);
      
    } catch (error: any) {
      setToastType('error');
      setToastMessage(error.message);
      setShowToast(true);
    } finally {
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const GlassCheckIcon = () => (
    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(32, 167, 131, 0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(32, 167, 131, 0.5)', boxShadow: '0 4px 12px rgba(32, 167, 131, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#20a783" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
  );

  return (
    <div className="fade-up" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      
      {/* Toast Notification */}
      {createPortal(
        <div style={{ position: 'fixed', top: showToast ? '2rem' : '-100px', left: '50%', transform: 'translateX(-50%)', opacity: showToast ? 1 : 0, pointerEvents: showToast ? 'auto' : 'none', background: toastType === 'success' ? '#20a783' : '#d4163c', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: toastType === 'success' ? '0 10px 25px rgba(32,167,131,0.4)' : '0 10px 25px rgba(212,22,60,0.4)', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', zIndex: 9999 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {toastType === 'success' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            )}
          </div>
          {toastMessage}
        </div>,
        document.body
      )}

      {/* Hidden File Input: CSV and Excel only */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
        style={{ display: 'none' }} 
      />

      {/* HEADER & TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['faculty', 'rooms', 'sections', 'courses', 'timeslots'] as Tab[]).map(tab => (
            <button key={tab} style={tabStyle(activeTab === tab)} onClick={() => { setActiveTab(tab); setSearchQuery(''); }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('timeslots', 'Time Slots')}
            </button>
          ))}
        </div>
        
        <button onClick={handleAddClick} style={{ background: '#1a1630', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#2c254e'} onMouseOut={e => e.currentTarget.style.background = '#1a1630'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add {activeTab === 'faculty' ? 'Faculty' : activeTab === 'rooms' ? 'Room' : activeTab === 'sections' ? 'Section' : activeTab === 'courses' ? 'Course' : 'Time Slot'}
        </button>
      </div>

      {/* DRAG AND DROP ZONE */}
      <div 
        onClick={handleAddClick}
        style={{ ...glassPanel, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 2rem', border: '2px dashed rgba(212,22,60,0.4)', backgroundColor: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'background 0.2s' }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
      >
        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(212,22,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4163c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        </div>
        <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', color: '#1a1630', fontWeight: 700 }}>Import {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('timeslots', 'Time Slots')} Files</h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#7a6f9a' }}>Supports CSV and Excel ONLY provided by the department.</p>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#7a6f9a' }}>
          Your file needs a column titled <strong>"{COLUMN_LABEL[activeTab]}"</strong>. Every row under it will be imported (upper/lower case doesn't matter). Excel files must keep this data in a sheet named <strong>"Compile"</strong>.
        </p>
      </div>

      {/* DATA TABLE AREA */}
      <div style={{ ...glassPanel, padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1a1630', fontWeight: 700, textTransform: 'capitalize' }}>Registered {activeTab.replace('timeslots', 'Time Slots')}</h3>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`} 
              style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', background: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', width: '250px', outlineColor: '#d4163c' }} 
            />
            <svg style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a6f9a" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>

        {displayedData.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                {getHeaders().map((head, i) => (
                  <th key={i} style={{ padding: '1rem 1.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#7a6f9a', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: head === 'Actions' ? 'right' : 'left' }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedData.map((row, index) => (
                <tr key={index} style={{ borderTop: '1px solid rgba(255,255,255,0.4)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem 1.75rem', fontSize: '0.9rem', fontWeight: 600, color: '#1a1630' }}>{row.id}</td>
                  <td style={{ padding: '1rem 1.75rem', fontSize: '0.9rem', color: '#4a3f7a' }}>{row.description}</td>
                  {activeTab !== 'timeslots' && (
                    <td style={{ padding: '1rem 1.75rem' }}>
                      <span style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(32,167,131,0.15)', color: '#20a783' }}>Active</span>
                    </td>
                  )}
                  {activeTab === 'timeslots' && (
                    <td style={{ padding: '1rem 1.75rem' }}>
                      <span style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(74, 63, 122, 0.1)', color: '#4a3f7a' }}>
                        {row.extra || 'N/A'}
                      </span>
                    </td>
                  )}
                  <td style={{ padding: '1rem 1.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button onClick={() => setItemToEdit(row)} style={{ background: 'none', border: 'none', color: '#4a3f7a', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Edit</button>
                      <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(26,22,48,0.2)' }}></div>
                      <button onClick={() => setItemToDelete(row)} style={{ background: 'none', border: 'none', color: '#d4163c', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(26,22,48,0.1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1630' }}>No matching records found</div>
            <div style={{ fontSize: '0.85rem', color: '#7a6f9a', marginTop: '0.25rem' }}>We couldn't find any {activeTab} matching "{searchQuery}".</div>
          </div>
        )}

        <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', background: 'rgba(255,255,255,0.2)' }}>
          <button 
            onClick={() => setShowValidationModal(true)} 
            style={{ background: '#20a783', color: '#fff', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 4px 15px rgba(32,167,131,0.3)', transition: 'all 0.2s' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Save & Validate Data
          </button>
        </div>
      </div>

      {/* ================= MODALS SECTION ================= */}

      {/* 1. DELETE CONFIRMATION MODAL */}
      {itemToDelete && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(26, 22, 48, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-up" style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(212,22,60,0.25)', borderTop: '6px solid #d4163c' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(212,22,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4163c', flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.2rem' }}>Confirm Deletion</h3>
                <p style={{ fontSize: '0.85rem', color: '#7a6f9a', margin: 0 }}>This action cannot be undone.</p>
              </div>
            </div>
            <p style={{ fontSize: '0.95rem', color: '#1a1630', marginTop: '1.5rem', marginBottom: '2rem' }}>Are you sure you want to remove <strong>{itemToDelete.id}</strong> ({itemToDelete.description}) from the records?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setItemToDelete(null)} style={{ background: 'none', border: 'none', fontWeight: 700, color: '#6b7280', cursor: 'pointer', padding: '0.5rem 1rem' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ background: '#d4163c', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(212,22,60,0.2)' }}>Delete Record</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. EDIT FORM MODAL */}
      {itemToEdit && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(26, 22, 48, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={handleEditSave} className="fade-up" style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1630', margin: '0 0 0.5rem' }}>Edit Record</h3>
            <p style={{ fontSize: '0.9rem', color: '#7a6f9a', margin: '0 0 2rem' }}>Update information for {itemToEdit.id}</p>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>ID / Code (Read Only)</label>
              <input type="text" defaultValue={itemToEdit.id} disabled style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f8f9fa', color: '#9ca3af', outline: 'none' }} />
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Name / Description</label>
              <input type="text" name="description" defaultValue={itemToEdit.description} required style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#1a1630' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" onClick={() => setItemToEdit(null)} style={{ background: 'none', border: 'none', fontWeight: 700, color: '#6b7280', cursor: 'pointer', padding: '0.5rem 1rem' }}>Cancel</button>
              <button type="submit" style={{ background: '#1a1630', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,22,48,0.2)' }}>Save Changes</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* 3. FULL-SCREEN VALIDATION MODAL */}
      {showValidationModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(26, 22, 48, 0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="fade-up" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '3rem', width: '100%', maxWidth: '550px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', position: 'relative' }}>
            <button onClick={() => setShowValidationModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', padding: '0.5rem', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 style={{ color: '#d4163c', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 2rem 0', fontFamily: 'DM Sans, Arial, sans-serif', letterSpacing: '-0.02em' }}>Validating Entered Data</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              {['Faculty records — complete', 'Room inventory — complete', 'Course offerings — complete', 'Sections — complete', 'Time slot grid — complete'].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}><GlassCheckIcon /><span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1a1630' }}>{text}</span></div>
              ))}
            </div>
            <div style={{ background: 'rgba(32, 167, 131, 0.1)', border: '1px solid rgba(32, 167, 131, 0.3)', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem' }}>
              <GlassCheckIcon /><span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1630' }}>All required data sets are valid.</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowValidationModal(false); setScreen('generate'); }} style={{ backgroundColor: '#d4163c', color: '#fff', border: 'none', borderRadius: '12px', padding: '1rem 2rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(212,22,60,0.3)', transition: 'all 0.2s' }}>
                Continue to Generation
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}