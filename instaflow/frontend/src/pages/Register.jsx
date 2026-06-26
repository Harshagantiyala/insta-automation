import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function update(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  const pwStrength = (() => {
    const pw = form.password;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  })();

  const strengthColors = ['#FF6B3D', '#FF6B3D', '#FFB800', '#2BB673', '#2BB673'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/connect');
    } catch (err) {
      setError(err.response?.data?.error || 'Couldn\'t create your account.');
    } finally {
      setLoading(false);
    }
  }

  const labelStyle = {
    display: 'block',
    fontSize: 11.5,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 7,
    letterSpacing: '0.03em',
  };

  return (
    <div className="auth-bg" style={{ position: 'relative' }}>
      <button onClick={toggleTheme} style={{ position: 'absolute', top: 24, right: 24, background: 'var(--panel-glass)', border: '1px solid var(--border-glass)', borderRadius: 12, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
        {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        )}
        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </button>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            InstaFlow
          </span>
        </div>

        <div className="auth-card">
          <h1 style={{ margin: '0 0 4px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            Create your account
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Start automating Instagram in minutes — free to try
          </p>

          {/* Feature chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {['Comment → DM automation', 'Story trigger replies', 'Live analytics'].map(feat => (
              <span key={feat} style={{
                fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)',
                background: 'var(--overlay-medium)', border: '1px solid var(--overlay-strong)',
                borderRadius: 100, padding: '4px 10px',
              }}>
                ✓ {feat}
              </span>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Full name</label>
              <input
                required value={form.name}
                onChange={update('name')}
                className="dark-input"
                placeholder="Harsha Gantiyala"
                autoComplete="name"
              />
            </div>

            <div>
              <label style={labelStyle}>Email address</label>
              <input
                type="email" required value={form.email}
                onChange={update('email')}
                className="dark-input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required minLength={8}
                  value={form.password}
                  onChange={update('password')}
                  className="dark-input"
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', transition: 'color 0.18s ease', padding: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password strength bar */}
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 100,
                        background: i <= pwStrength ? strengthColors[pwStrength] : 'var(--overlay-strong)',
                        transition: 'background 0.3s ease',
                      }} />
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: 10.5, color: pwStrength > 0 ? strengthColors[pwStrength] : 'var(--text-secondary)' }}>
                    {strengthLabels[pwStrength]}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(255,107,61,0.08)',
                border: '1px solid rgba(255,107,61,0.25)',
                borderRadius: 10,
                fontSize: 13,
                color: '#FF6B3D',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 14, marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Creating account…
                </span>
              ) : 'Create account →'}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#8B7CF6', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}
            >
              Sign in
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
          🔒 Your data is encrypted and never shared
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
