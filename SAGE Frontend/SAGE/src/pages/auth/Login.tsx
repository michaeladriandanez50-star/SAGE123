import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Screen } from '../../types';

export default function Login({ setScreen }: { setScreen: (s: Screen) => void }) {
  // States para sa main Login flow
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // States para sa Forgot Password Flow
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [resetError, setResetError] = useState('');

  // 1. Ang main function para maikonekta sa Node.js backend
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      // I-save ang security token sa browser
      localStorage.setItem('sage_token', data.token);
      localStorage.setItem('sage_user', JSON.stringify(data.user));

      // I-redirect ang user sa 2FA screen bago tuluyang pumasok sa Dashboard
      setScreen('dashboard');

    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    setIsSending(true);
    setResetError(''); // I-clear ang error bago mag-send
    
    try {
      const response = await fetch('http://localhost:5000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link.');
      }

      // Kapag successful, itago ang modal at ipakita ang success toast
      setShowForgotModal(false);
      setResetEmail('');
      setShowSuccessToast(true);
      
      setTimeout(() => setShowSuccessToast(false), 3000);

    } catch (error: any) {
      setResetError(error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="sage-bg" style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8f9fa', position: 'relative' }}>
      
      {/* SUCCESS TOAST */}
      {createPortal(
        <div style={{ position: 'fixed', top: showSuccessToast ? '2rem' : '-100px', left: '50%', transform: 'translateX(-50%)', opacity: showSuccessToast ? 1 : 0, pointerEvents: showSuccessToast ? 'auto' : 'none', background: '#20a783', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 25px rgba(32,167,131,0.4)', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', zIndex: 9999 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          Password reset instructions have been sent to your email.
        </div>,
        document.body
      )}

      {/* KALIWA: Full Screen Image */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(rgba(138, 26, 33, 0.85), rgba(138, 26, 33, 0.85)), url(/tup-bg.png) center/cover' }}>
        <div style={{ textAlign: 'center', color: '#fff', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
           <img src="/sage-logo.png" alt="SAGE Logo" style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '1.5rem', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }} />
           <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '3.5rem', margin: 0, lineHeight: 1 }}>SAGE</h1>
           <p style={{ fontSize: '1.1rem', letterSpacing: '0.05em', opacity: 0.9, marginTop: '0.5rem' }}>Scheduling and Generation Engine</p>
        </div>
      </div>

      {/* KANAN: Login Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem', backgroundColor: '#ffffff', overflowY: 'auto', maxHeight: '100vh' }}>
        <div style={{ maxWidth: '440px', width: '100%', margin: 'auto' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', color: '#1a1630', marginBottom: '0.5rem' }}>Welcome back!</h2>
          <p style={{ color: '#7a6f9a', marginBottom: '2.5rem', fontSize: '0.9rem' }}>Log in to manage TUP scheduling</p>

          {/* 2. Error Message Display */}
          {errorMessage && (
            <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #f5c6cb' }}>
              {errorMessage}
            </div>
          )}

          {/* 3. Binalot ang form elements at nilagyan ng onSubmit */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>TUP Email</label>
              <input 
                className="sage-input" 
                placeholder="username@tup.edu.ph" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none' }} 
              />
            </div>
            
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  className="sage-input" 
                  placeholder="Enter your password" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none' }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6f9a', cursor: 'pointer' }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <span onClick={() => setShowForgotModal(true)} style={{ fontSize: '0.8rem', color: '#d4163c', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'} onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                Forgot password?
              </span>
            </div>

            {/* 4. Binago ang button type at dinagdag ang loading state */}
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ width: '100%', padding: '0.85rem', marginTop: '1.5rem', backgroundColor: isLoading ? '#a04d5b' : '#d4163c', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(212,22,60,0.2)' }}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#7a6f9a' }}>
            Don't have an account? <span onClick={() => setScreen('signup')} style={{ color: '#d4163c', fontWeight: 700, cursor: 'pointer' }}>Sign up</span>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 22, 48, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-up" style={{ background: '#fff', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(212,22,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4163c' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1630', margin: 0 }}>Reset Password</h3>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: '#7a6f9a', margin: '0 0 2rem', lineHeight: 1.5 }}>
              Enter your registered TUP email address. We'll send you a secure link to reset your password.
            </p>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3f7a', display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
                <input 
                  type="email" 
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="e.g. juan.delacruz@tup.edu.ph" 
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }} 
                />
                {resetError && <p style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '0.6rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.85rem', border: '1px solid #f5c6cb' }}>{resetError}</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowForgotModal(false)} disabled={isSending} style={{ background: 'transparent', color: '#7a6f9a', border: 'none', fontWeight: 700, cursor: isSending ? 'not-allowed' : 'pointer', padding: '0.5rem 1rem' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSending} style={{ background: '#d4163c', color: '#fff', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '10px', fontWeight: 700, cursor: isSending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(212,22,60,0.2)', transition: 'background 0.2s' }}>
                  {isSending ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="spin-animation"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}