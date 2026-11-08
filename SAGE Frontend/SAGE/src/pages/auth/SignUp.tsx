import React, { useState } from 'react';
import { Screen } from '../../types';

export default function SignUp({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department: '',
    password: '',
    confirmPassword: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 1. Bagong state para kontrolin ang paglabas ng magandang modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password !== formData.confirmPassword) {
      return setErrorMessage('Passwords do not match.');
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          department: formData.department,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      // 2. Imbes na alert(), ipapakita natin ang custom modal
      setShowSuccessModal(true);

    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sage-bg" style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8f9fa', position: 'relative' }}>
      
      {/* 3. Ang Custom Success Modal (Nakapatong sa buong screen) */}
      {showSuccessModal && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '2.5rem', borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)', textAlign: 'center', maxWidth: '400px', width: '90%'
          }}>
            <div style={{
              width: '60px', height: '60px', backgroundColor: '#e6f4ea', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1e8e3e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.8rem', color: '#1a1630', margin: '0 0 0.5rem 0' }}>Success!</h3>
            <p style={{ color: '#7a6f9a', marginBottom: '2rem', fontSize: '1rem' }}>
              Your Department Head account has been created. You can now log in to the SAGE system.
            </p>
            <button 
              onClick={() => setScreen('login')}
              style={{
                width: '100%', padding: '0.9rem', backgroundColor: '#d4163c', color: '#fff',
                border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(212,22,60,0.2)'
              }}
            >
              Continue to Login
            </button>
          </div>
        </div>
      )}

      {/* KALIWA: Full Screen Image */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(rgba(138, 26, 33, 0.85), rgba(138, 26, 33, 0.85)), url(/tup-bg.png) center/cover' }}>
        <div style={{ textAlign: 'center', color: '#fff', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
           <img src="/sage-logo.png" alt="SAGE Logo" style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '1.5rem', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }} />
           <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '3.5rem', margin: 0, lineHeight: 1 }}>SAGE</h1>
           <p style={{ fontSize: '1.1rem', letterSpacing: '0.05em', opacity: 0.9, marginTop: '0.5rem' }}>Scheduling and Generation Engine</p>
        </div>
      </div>

      {/* KANAN: Scrollable Form Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#ffffff', overflowY: 'auto', height: '100vh', padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '520px', width: '100%', margin: 'auto 0' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '2.2rem', color: '#1a1630', marginBottom: '0.5rem' }}>Create an Account</h2>
          <p style={{ color: '#7a6f9a', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Register to access the SAGE system</p>

          {errorMessage && (
            <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #f5c6cb' }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
              <input name="full_name" value={formData.full_name} onChange={handleChange} required className="sage-input" placeholder="e.g. Juan Dela Cruz" type="text" style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>TUP Email</label>
              <input name="email" value={formData.email} onChange={handleChange} required className="sage-input" placeholder="username@tup.edu.ph" type="email" style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Department</label>
              <select name="department" value={formData.department} onChange={handleChange} required className="sage-input" style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none', cursor: 'pointer', appearance: 'none' }}>
                <option value="" disabled>Select your department</option>
                <option value="Computer Studies">Computer Studies</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input name="password" value={formData.password} onChange={handleChange} required minLength={8} className="sage-input" placeholder="Min. 8 characters" type={showPassword ? "text" : "password"} style={{ width: '100%', padding: '0.85rem 2.5rem 0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6f9a', cursor: 'pointer' }}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a3f7a', display: 'block', marginBottom: '0.4rem' }}>Confirm Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="sage-input" placeholder="Repeat password" type={showConfirmPassword ? "text" : "password"} style={{ width: '100%', padding: '0.85rem 2.5rem 0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(26,22,48,0.15)', outline: 'none' }} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6f9a', cursor: 'pointer' }}>
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '0.9rem', marginTop: '1rem', backgroundColor: isLoading ? '#a04d5b' : '#d4163c', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(212,22,60,0.2)' }}>
              {isLoading ? 'Registering...' : 'Sign Up'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: '#7a6f9a' }}>
            Already have an account? <span onClick={() => setScreen('login')} style={{ color: '#d4163c', fontWeight: 700, cursor: 'pointer' }}>Log in</span>
          </div>
        </div>
      </div>
    </div>
  );
}