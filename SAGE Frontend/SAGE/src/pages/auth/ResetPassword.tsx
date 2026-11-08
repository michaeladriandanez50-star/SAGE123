import React, { useState, useEffect } from 'react';
import { Screen } from '../../types';

export default function ResetPassword({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Kunin ang token mula sa URL query parameters
    const query = new URLSearchParams(window.location.search);
    const urlToken = query.get('token');
    
    if (urlToken) {
      setToken(urlToken);
    } else {
      setMessage({ type: 'error', text: 'Invalid or missing reset token. Please request a new link from the Login page.' });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:5000/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setMessage({ type: 'success', text: 'Password reset successful! Redirecting to login...' });
      
      // I-redirect pabalik sa login pagkatapos ng 3 segundo at linisin ang URL
      setTimeout(() => {
        window.history.replaceState({}, document.title, "/");
        setScreen('login');
      }, 3000);

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: "url('/tup-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
      
      {/* Dark blur overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}></div>
      
      <div className="glass fade-up" style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420, padding: '2.75rem 2.5rem', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.95)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(212,22,60,0.1)', border: '1.5px solid rgba(212,22,60,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#d4163c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>
        
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.6rem', fontWeight: 600, color: '#1a1630', margin: '0 0 0.4rem', textAlign: 'center' }}>Create New Password</h2>
        <p style={{ fontSize: '0.85rem', color: '#7a6f9a', margin: '0 0 2rem', lineHeight: 1.5, textAlign: 'center' }}>
          Your new password must be different from previous used passwords.
        </p>

        {message.text && (
          <div style={{ backgroundColor: message.type === 'error' ? '#f8d7da' : '#d4edda', color: message.type === 'error' ? '#721c24' : '#155724', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', border: `1px solid ${message.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`, textAlign: 'center' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>New Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={!token || message.type === 'success'}
              required
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Confirm Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={!token || message.type === 'success'}
              required
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }} 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '-0.5rem' }}>
            <input 
              type="checkbox" 
              id="showPass" 
              checked={showPassword} 
              onChange={() => setShowPassword(!showPassword)}
              style={{ accentColor: '#d4163c' }}
            />
            <label htmlFor="showPass" style={{ fontSize: '0.8rem', color: '#7a6f9a', cursor: 'pointer' }}>Show passwords</label>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !token || message.type === 'success'}
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', backgroundColor: (isLoading || !token) ? '#a04d5b' : '#d4163c', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: (isLoading || !token) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(212,22,60,0.2)' }}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <button onClick={() => { window.history.replaceState({}, document.title, "/"); setScreen('login'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '1.5rem', fontSize: '0.8rem', color: '#9a8fc0', fontFamily: 'DM Sans, sans-serif', display: 'block', width: '100%', textAlign: 'center' }}>
          ← Back to Login
        </button>
      </div>
    </div>
  );
}