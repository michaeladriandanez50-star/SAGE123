import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Screen } from '../types';
import { I } from './Icons';

// --- HELPER FUNCTION PARA SA ACTIVE TERM ---
const getCurrentTerm = () => {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan, 11 = Dec
  const year = now.getFullYear();

  if (month >= 7 && month <= 11) {
    return `1st Sem ${year}–${year + 1}`; // August to December
  } else if (month >= 0 && month <= 4) {
    return `2nd Sem ${year - 1}–${year}`; // January to May
  } else {
    return `Summer ${year}`; // June to July
  }
};

const MAIN_NAV: { id: Screen; label: string; Icon: () => JSX.Element }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: I.Home },
  { id: 'manage',    label: 'Manage Data', Icon: I.DB },
  { id: 'generate',  label: 'Generate Schedule', Icon: I.Cal },
  { id: 'schedule',  label: 'View Schedule', Icon: I.Grid },
  { id: 'conflict',  label: 'Check Conflict', Icon: I.Warn },
  { id: 'reports',   label: 'Reports & Exports', Icon: I.File },
];

function Sidebar({ 
  screen, 
  setScreen, 
  collapsed, 
  setCollapsed,
  activeTerm,
  setActiveTerm,
  userDept // <- Idinagdag ang userDept prop
}: { 
  screen: Screen; 
  setScreen: (s: Screen) => void; 
  collapsed: boolean; 
  setCollapsed: (c: boolean) => void;
  activeTerm: string;
  setActiveTerm: (t: string) => void;
  userDept: string;
}) {
  const [showTermMenu, setShowTermMenu] = useState(false);
  
  // Maaari mo itong gawing dynamic din mamaya galing sa database
  const termOptions = ['1st Sem 2026–2027', 'Summer 2026', '2nd Sem 2025–2026', '1st Sem 2025–2026'];

  return (
    <aside style={{ 
      width: collapsed ? 88 : 280, 
      backgroundColor: '#8a1a21', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: collapsed ? '2rem 0.5rem' : '2rem 1.5rem', 
      flexShrink: 0, 
      color: '#fff',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}> 
      {/* Logo & Toggle Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', marginBottom: '2.5rem', overflow: 'hidden' }}>
        <div onClick={() => { if (collapsed) setCollapsed(false); }} title={collapsed ? "Click to expand sidebar" : ""} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: collapsed ? 'pointer' : 'default' }}>
          <img src="/sage-logo.png" alt="SAGE" style={{ width: collapsed ? '44px' : '36px', height: 'auto', borderRadius: '4px', transition: 'width 0.3s' }} /> 
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '1.3rem', color: '#fff', lineHeight: 1 }}>SAGE</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Scheduling Engine</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} title="Collapse Sidebar" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: '0.4rem', borderRadius: '6px', transition: 'all 0.2s' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {!collapsed && <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 0.5rem', marginBottom: '0.5rem', opacity: 1, transition: 'opacity 0.2s' }}>Navigation</div>}
        {MAIN_NAV.map(({ id, label, Icon }) => (
          <button key={id} className={`nav-dark${screen === id ? ' active' : ''}`} onClick={() => setScreen(id)} title={collapsed ? label : ''} style={{ width: '100%', textAlign: collapsed ? 'center' : 'left', background: screen === id ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', color: screen === id ? '#fff' : 'rgba(255,255,255,0.6)', padding: collapsed ? '0.75rem 0' : '0.75rem 1rem', borderRadius: '8px', display: 'flex', gap: collapsed ? '0' : '0.75rem', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <Icon />{!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Term Badge */}
      {!collapsed && (
        <div style={{ padding: '0 0.25rem', marginBottom: '0.75rem', position: 'relative' }}>
          {showTermMenu && (
            <div style={{ position: 'absolute', bottom: '100%', left: '0.25rem', right: '0.25rem', marginBottom: '0.5rem', background: '#fff', borderRadius: '12px', padding: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 50 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', padding: '0.25rem 0.5rem', marginBottom: '0.25rem' }}>Switch Term</div>
              {termOptions.map(term => (
                <div key={term} onClick={() => { setActiveTerm(term); setShowTermMenu(false); }} style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: activeTerm === term ? '#8a1a21' : '#334155', cursor: 'pointer', borderRadius: '6px', fontWeight: activeTerm === term ? 800 : 600, background: activeTerm === term ? '#fef2f2' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {term}{activeTerm === term && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>
              ))}
            </div>
          )}
          <div onClick={() => setShowTermMenu(!showTermMenu)} style={{ background: showTermMenu ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.75rem 0.9rem', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Active Term</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{activeTerm}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{userDept || 'Loading...'}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showTermMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
      )}

      {/* Logout */}
      <button onClick={() => {
        localStorage.removeItem('sage_token'); // Clear security token
        localStorage.removeItem('sage_user');  // Clear user data
        setScreen('login');
      }} title={collapsed ? "Logout" : ''} style={{ width: '100%', backgroundColor: '#8a2027', border: '1.5px solid rgba(0, 0, 0, 0.35)', color: '#ffffff', padding: collapsed ? '0.85rem 0' : '0.85rem', borderRadius: '12px', display: 'flex', gap: collapsed ? '0' : '0.75rem', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)', transition: 'all 0.2s' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b080d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        {!collapsed && <span>Logout</span>}
      </button>
    </aside>
  );
}

export function MainShell({ screen, setScreen, children }: { screen: Screen; setScreen: (s: Screen) => void; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  
  // Awtomatikong kukunin ang current term sa pag-load
  const [activeTerm, setActiveTerm] = useState(getCurrentTerm());
  
  // User Data States
  const [userName, setUserName] = useState('');
  const [userDept, setUserDept] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userProfilePic, setUserProfilePic] = useState<string | null>(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // States for Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'account'>('account');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Photo Upload
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  // Auto-hide Header States
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  // Toggles State
  const [toggles, setToggles] = useState({ notifs: true, strictCsp: true, autoSave: false });

  // Kunin ang user details mula sa localStorage kapag nag-mount ang component
  useEffect(() => {
    const storedUser = localStorage.getItem('sage_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserName(user.full_name);
      setUserDept(user.department);
      setUserEmail(user.email);

      if (user.profile_picture) setUserProfilePic(user.profile_picture);
    }
  }, []);

  const openSettings = (tab: 'account') => {
    setSettingsTab(tab);
    setShowSettingsModal(true);
    setShowProfileMenu(false);
  };

  const handleSaveSettings = () => {
    setIsSavingSettings(true);
    setTimeout(() => {
      setIsSavingSettings(false);
      setShowSettingsModal(false);
      setToastType('success');
      setToastMessage('Settings saved successfully.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 800);
  };

  const handlePhotoUploadClick = () => {
    if (profilePicInputRef.current) {
      profilePicInputRef.current.click();
    }
  };

  // PHOTO UPLOAD LAYOUT
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Client-side check para sa format
    if (!file.name.match(/\.(jpg|jpeg|png)$/i)) {
      setToastType('error');
      setToastMessage('Invalid file format. Please upload JPG or PNG only.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      e.target.value = ''; 
      return;
    }

    // 2. Kunin ang email ng user galing sa localStorage para malaman kung sino ang ia-update
    const storedUser = localStorage.getItem('sage_user');
    if (!storedUser) return;
    const user = JSON.parse(storedUser);

    // 3. I-pasa ang file papunta sa backend gamit ang FormData
    const formData = new FormData();
    formData.append('profile_image', file);
    formData.append('email', user.email);

    try {
        const response = await fetch('http://localhost:5000/api/user/upload-photo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo.');
      }

      // 4. Tagumpay! I-update ang UI at local storage kung kinakailangan
      setToastType('success');
      setToastMessage('Profile photo uploaded successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // (Optional) Pwede mo ring i-update ang local storage state kung gusto mong magbago agad ang picture sa UI
      user.profile_picture = data.profile_picture;
      localStorage.setItem('sage_user', JSON.stringify(user));
      setUserProfilePic(data.profile_picture);

    } catch (error: any) {
      setToastType('error');
      setToastMessage(error.message || 'An error occurred during upload.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      e.target.value = ''; 
    }
  };

  // Scroll detection para sa Header
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
      setShowHeader(false);
    } else if (currentScrollY < lastScrollY.current) {
      setShowHeader(true);
    }
    
    lastScrollY.current = currentScrollY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (lastScrollY.current > 80) {
      if (e.clientY < 120) {
        if (!showHeader) setShowHeader(true);
      } else {
        if (showHeader) setShowHeader(false);
      }
    }
  };

  const ToggleSwitch = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
    <div onClick={onClick} style={{ width: 44, height: 24, background: active ? '#20a783' : '#cbd5e1', borderRadius: 12, position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}>
       <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: active ? 22 : 2, transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
    </div>
  );

  return (
    <div className="sage-bg" style={{ height: '100vh', display: 'flex', overflow: 'hidden', backgroundColor: '#f8f9fa', position: 'relative' }}>
      
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

      {/* UNIFIED SETTINGS MODAL */}
      {showSettingsModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 22, 48, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-up" style={{ background: '#fff', width: '100%', maxWidth: '650px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ background: '#f8f9fa', padding: '1.5rem 2rem 0', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1630', margin: 0 }}>System Configuration</h3>
                <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <button onClick={() => setSettingsTab('account')} style={{ background: 'none', border: 'none', padding: '0.5rem 0', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, color: settingsTab === 'account' ? '#d4163c' : '#6b7280', borderBottom: settingsTab === 'account' ? '3px solid #d4163c' : '3px solid transparent', transition: 'all 0.2s' }}>Account Profile</button>
             
              </div>
            </div>

            <div style={{ padding: '2rem', flex: 1, minHeight: '300px' }}>
              {settingsTab === 'account' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <input type="file" accept="image/png, image/jpeg" ref={profilePicInputRef} onChange={handlePhotoFileChange} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ position: 'relative', width: 80, height: 80 }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#9b232a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, textTransform: 'uppercase', overflow: 'hidden' }}>
                        {userProfilePic ? (
                          <img src={userProfilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          userName ? userName.substring(0, 2) : 'U'
                        )}
                      </div>
                      <div onClick={handlePhotoUploadClick} title="Upload new photo" style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', color: '#4b5563', padding: '0.3rem', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                    <div>
                      <button type="button" onClick={handlePhotoUploadClick} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', color: '#111827', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#e5e7eb'} onMouseOut={e => e.currentTarget.style.background = '#f3f4f6'}>Upload New Photo</button>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.4rem' }}>JPG or PNG. Max size 2MB.</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
                      <input type="text" defaultValue={userName} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '0.4rem' }}>Department</label>
                      <input type="text" defaultValue={userDept} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8f9fa', color: '#9ca3af', outline: 'none' }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '0.4rem' }}>TUP Email Address</label>
                      <input type="email" defaultValue={userEmail} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8f9fa', color: '#9ca3af', outline: 'none' }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div><div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Email Notifications</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Receive alerts when sister departments plot subjects.</div></div>
                    <ToggleSwitch active={toggles.notifs} onClick={() => setToggles(p => ({ ...p, notifs: !p.notifs }))} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div><div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Strict AI Constraint Checking</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Block all manual edits that violate hard constraints.</div></div>
                    <ToggleSwitch active={toggles.strictCsp} onClick={() => setToggles(p => ({ ...p, strictCsp: !p.strictCsp }))} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div><div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Default Export Format</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Preferred format for generating reports.</div></div>
                    <select style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600 }}><option>PDF Document</option><option>Excel Spreadsheets</option></select>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', fontWeight: 700, color: '#6b7280', cursor: 'pointer', padding: '0.5rem 1rem' }}>Cancel</button>
              <button onClick={handleSaveSettings} disabled={isSavingSettings} style={{ background: '#d4163c', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: isSavingSettings ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(212,22,60,0.2)' }}>
                {isSavingSettings ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin-animation"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> : 'Save Changes'}
              </button>
            </div>
            
          </div>
        </div>,
        document.body
      )}

      <Sidebar 
        screen={screen} 
        setScreen={setScreen} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        activeTerm={activeTerm}
        setActiveTerm={setActiveTerm}
        userDept={userDept}
      />
      
      {/* Scrollable Container with Tracking Events */}
      <div 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}
        onScroll={handleScroll}
        onMouseMove={handleMouseMove}
      >
        
        {/* Sticky Smart Header */}
        <header style={{ 
          position: 'sticky',
          top: showHeader ? 0 : '-120px', 
          zIndex: 50,
          transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '1.5rem 2.5rem', 
          borderBottom: '3px solid #f0f0f0', 
          backgroundColor: '#fff', 
          flexShrink: 0 
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d4444c', margin: 0, letterSpacing: '-0.02em' }}>
                Good day, {userName ? userName.split(' ')[0] : 'User'}!
              </h1>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', marginTop: '0.25rem' }}>
                {activeTerm} · {userDept}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (hasUnread) setHasUnread(false);
                  if (showProfileMenu) setShowProfileMenu(false);
                }}
                style={{ background: showNotifications ? '#f3f4f6' : 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '0.4rem', borderRadius: '50%', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                {hasUnread && <div style={{ position: 'absolute', top: 3, right: 5, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }}></div>}
              </button>

              {showNotifications && (
                <div style={{ position: 'absolute', top: '120%', right: 0, width: '320px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>Notifications</div>
                    <button style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#d4163c', fontWeight: 600, cursor: 'pointer' }}>Mark all as read</button>
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = '#f9fafb'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(32,167,131,0.1)', color: '#20a783', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', marginBottom: '0.2rem' }}>AI Generation Complete</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>The GA optimizer has finished processing the 1st Sem schedule.</div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.4rem' }}>2 minutes ago</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  if (showNotifications) setShowNotifications(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '2px solid #f0f0f0', paddingLeft: '2rem', cursor: 'pointer' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#9b232a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', overflow: 'hidden', flexShrink: 0, fontWeight: 700, textTransform: 'uppercase' }}>
                  {userProfilePic ? (
                    <img src={userProfilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    userName ? userName.substring(0, 2) : 'U'
                  )}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{userName || 'Loading...'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Head, {userDept}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.5rem', transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              {showProfileMenu && (
                <div style={{ position: 'absolute', top: '120%', right: 0, width: '250px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #e5e7eb', background: '#f8f9fa' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827' }}>{userName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>Head, {userDept}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.1rem' }}>{userEmail}</div>
                  </div>

                  <div style={{ padding: '0.5rem' }}>
                    <button onClick={() => openSettings('account')} style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#4b5563', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = '#f3f4f6'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      Account Settings
                    </button>
                    
                    
                  </div>

                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '0.5rem' }}>
                    <div onClick={() => {
                      localStorage.removeItem('sage_token');
                      localStorage.removeItem('sage_user');
                      setScreen('login');
                    }} style={{ padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#d4163c', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#fef2f2'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      Sign Out
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </header>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '1.75rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}