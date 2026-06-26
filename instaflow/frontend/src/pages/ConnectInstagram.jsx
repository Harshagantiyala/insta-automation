import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';

export default function ConnectInstagram() {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Credentials modal state
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submittingCreds, setSubmittingCreds] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAccounts(); }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/instagram-accounts');
      setAccounts(data.accounts);
    } catch {
      toast.error('Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const { data } = await api.get('/api/auth/meta/connect-url');
      window.location.href = data.url;
    } catch {
      toast.error('Failed to retrieve OAuth URL.');
      setConnecting(false);
    }
  }

  async function handleDisconnect(id, username) {
    try {
      await api.delete(`/api/instagram-accounts/${id}`);
      toast.success(`@${username} successfully disconnected.`);
      fetchAccounts();
    } catch {
      toast.error('Failed to disconnect account.');
    }
  }

  async function handleConnectCredentials(e) {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Instagram handle and security keys are required.');
      return;
    }
    setSubmittingCreds(true);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      await api.post('/api/instagram-accounts/connect-credentials', { username: cleanUsername, password });
      toast.success(`@${cleanUsername} mock connection initialized!`);
      setShowModal(false);
      setUsername('');
      setPassword('');
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initialize credentials.');
    } finally {
      setSubmittingCreds(false);
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Instagram Links
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            Connect Business or Creator accounts to link your automated scripts
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Establish New Link
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 18 }} />)}
        </div>
      ) : accounts.length === 0 ? (
        /* Futuristic Empty State */
        <div
          className="glass-panel"
          style={{
            textAlign: 'center', padding: '80px 24px',
            borderStyle: 'dashed',
            borderColor: 'var(--overlay-strong)',
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 24px',
            background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.15)'
          }}>
            📱
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            No Instagram nodes connected
          </h2>
          <p style={{ margin: '10px 0 28px', fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Establish a secure connection with your Instagram account using official OAuth or sandbox credentials.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Connect First Account
          </button>

          {/* Quick Flow Guide */}
          <div style={{ marginTop: 44, display: 'flex', justifyContent: 'center', gap: 36, flexWrap: 'wrap' }}>
            {[
              { step: '1', label: 'Connect Node', desc: 'Secure credentials handshake' },
              { step: '2', label: 'Write Script', desc: 'Establish keywords & replies' },
              { step: '3', label: 'Initiate Live', desc: 'Automate comments & DMs 24/7' },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center', maxWidth: 120 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 10px', fontSize: 12, fontWeight: 700, color: '#c084fc',
                  boxShadow: '0 0 10px rgba(124, 58, 237, 0.1)'
                }}>
                  {s.step}
                </div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, display: 'block' }}>
            {accounts.length} ACTIVE LINK{accounts.length !== 1 ? 'S' : ''} DETECTED
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
            {accounts.map(acc => (
              <div
                key={acc.id}
                className="glass-panel"
                style={{
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(0,0,0,0.6), 0 0 20px 0 rgba(124,58,237,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Visual glow on connection status */}
                <div style={{
                  position: 'absolute', top: -35, right: -35, width: 90, height: 90,
                  background: acc.isActive ? 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />

                {/* Account Details Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Glowing Circular Avatar */}
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)',
                      padding: 2.5,
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        background: 'var(--bg-space)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: 'var(--text-primary)', fontWeight: 700,
                      }}>
                        {acc.igUsername?.[0]?.toUpperCase() || '?'}
                      </div>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>@{acc.igUsername}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>via {acc.facebookPageName || 'Facebook Page'}</p>
                    </div>
                  </div>
                  <span className={acc.isActive ? 'badge-live' : 'badge-paused'}>
                    {acc.isActive ? 'Linked' : 'Offline'}
                  </span>
                </div>

                {/* Metadata details */}
                <div style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid var(--overlay-light)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Node Address: {acc.facebookPageId || 'Unknown'}
                  </p>
                </div>

                {/* Disconnect Button */}
                <button
                  onClick={() => handleDisconnect(acc.id, acc.igUsername)}
                  style={{
                    width: '100%',
                    background: 'rgba(244,63,94,0.04)',
                    border: '1px solid rgba(244,63,94,0.15)',
                    borderRadius: 10,
                    padding: '9px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'rgba(244,63,94,0.85)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.3)'; e.currentTarget.style.color = '#f43f5e'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.04)'; e.currentTarget.style.color = 'rgba(244,63,94,0.85)'; }}
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Glowing Add Another Account shortcut */}
            <div
              onClick={() => setShowModal(true)}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
                borderStyle: 'dashed',
                minHeight: 150,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.05)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--panel-glass)'; e.currentTarget.style.borderColor = 'var(--border-glass)'; }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#c084fc', fontSize: 20, fontWeight: 500,
                boxShadow: '0 0 10px rgba(124, 58, 237, 0.05)'
              }}>
                +
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Add another channel</p>
            </div>
          </div>
        </div>
      )}

      {/* 2030 Modal Overlay */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-card" style={{ maxWidth: 520, padding: 0 }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid var(--overlay-medium)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Establish Connection Link
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Authorize your Instagram channel connection
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                background: 'var(--overlay-light)', border: '1px solid var(--overlay-strong)',
                borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.18s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#f87171'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--overlay-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px', overflowY: 'auto' }}>

              {/* Option A: Meta OAuth Card */}
              <div
                className="glass-panel"
                style={{
                  padding: '20px',
                  marginBottom: 20,
                  borderColor: 'rgba(124, 58, 237, 0.18)',
                  background: 'rgba(124, 58, 237, 0.02)',
                  boxShadow: 'inset 0 0 12px rgba(124, 58, 237, 0.03)'
                }}
              >
                <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Option A: Meta Official OAuth Link (Live)
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Redirects to Facebook Login to officially verify and authorize your Instagram Business node. Required for production automation.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {connecting ? 'Handshaking...' : '✓ Authorize via Facebook (OAuth)'}
                </button>
              </div>

              {/* Option B: Local Credentials Card */}
              <div
                className="glass-panel"
                style={{
                  padding: '20px',
                }}
              >
                <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Option B: Local Sandbox Node (Local Testing)
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Simulates a direct connection link using sandbox parameters. Allows testing your comment and DM workflows locally instantly.
                </p>

                <form onSubmit={handleConnectCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Instagram Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. harsha800495"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="dark-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Access Key / Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="dark-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingCreds}
                    className="btn-primary"
                    style={{
                      marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                      borderColor: 'rgba(6,182,212,0.25)',
                      boxShadow: '0 4px 15px rgba(6,182,212,0.15)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(6,182,212,0.3), 0 0 15px rgba(6,182,212,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(6,182,212,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {submittingCreds ? 'Linking Sandbox...' : '✓ Establish Local Sandbox Link'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
