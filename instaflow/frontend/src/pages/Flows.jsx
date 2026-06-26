import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';

const TRIGGER_LABELS = {
  comment_keyword: 'Comment keyword',
  dm_inbound: 'New DM received',
  story_mention: 'Story mention',
  story_reply: 'Story reply',
};

const TRIGGER_ICONS = {
  comment_keyword: '💬',
  dm_inbound: '📩',
  story_mention: '✨',
  story_reply: '↩️',
};

function Toggle({ checked, onChange }) {
  return (
    <div
      className={`toggle-track${checked ? ' checked' : ''}`}
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onChange()}
    >
      <div className="toggle-thumb" />
    </div>
  );
}

export default function Flows() {
  const toast = useToast();
  const [flows, setFlows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [flowsRes, accountsRes] = await Promise.all([
        api.get('/api/flows'),
        api.get('/api/instagram-accounts'),
      ]);
      setFlows(flowsRes.data.flows);
      setAccounts(accountsRes.data.accounts.filter(a => a.isActive));
    } catch {
      toast.error('Failed to load flows.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload) {
    try {
      await api.post('/api/flows', payload);
      setShowForm(false);
      toast.success('Flow created successfully! 🎉');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Couldn't create this flow.");
    }
  }

  async function handleToggle(flow) {
    const newState = !flow.isActive;
    setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, isActive: newState } : f));
    try {
      await api.patch(`/api/flows/${flow.id}`, { isActive: newState });
      toast.info(`Flow "${flow.name}" ${newState ? 'activated ✅' : 'paused ⏸'}`);
      load();
    } catch {
      setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, isActive: flow.isActive } : f));
      toast.error('Failed to update flow status.');
    }
  }

  async function handleDelete(flow) {
    setDeletingId(flow.id);
    try {
      await api.delete(`/api/flows/${flow.id}`);
      toast.success(`Flow "${flow.name}" deleted.`);
      load();
    } catch {
      toast.error('Failed to delete flow.');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredFlows = flows.filter(flow => {
    const matchSearch = flow.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && flow.isActive) ||
      (statusFilter === 'paused' && !flow.isActive);
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Automation Tunnels
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            Configure scripts triggered by comments, story interactions, or incoming messages.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={accounts.length === 0}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Automation Flow
        </button>
      </div>

      {/* Warning banner */}
      {accounts.length === 0 && !loading && (
        <div style={{
          marginBottom: 24, padding: '14px 18px',
          background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)',
          borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 0 15px rgba(244, 63, 94, 0.05)'
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 13, color: '#f87171', fontWeight: 600 }}>
            Connect an Instagram node channel first before creating automated tunnels.
          </p>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" placeholder="Search automation tunnels..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="dark-input"
            style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 12.5 }}
          />
        </div>
        <div style={{ display: 'flex', background: 'var(--overlay-light)', border: '1px solid var(--overlay-medium)', borderRadius: 12, padding: 3, gap: 2 }}>
          {['all', 'active', 'paused'].map(tab => (
            <button key={tab} onClick={() => setStatusFilter(tab)} style={{
              padding: '6px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'capitalize',
              transition: 'all 0.2s ease',
              background: statusFilter === tab ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
              color: statusFilter === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: statusFilter === tab ? '0 0 0 1px rgba(124, 58, 237, 0.25)' : 'none',
            }}>{tab}</button>
          ))}
        </div>
        {flows.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
            {filteredFlows.length} / {flows.length} active tunnels
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 18 }} />)}
        </div>
      ) : filteredFlows.length === 0 ? (
        <div 
          className="glass-panel"
          style={{
            textAlign: 'center', padding: '70px 24px',
            borderStyle: 'dashed',
            borderColor: 'var(--overlay-strong)',
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
            background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.12)'
          }}>
            ⚡
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {searchQuery || statusFilter !== 'all' ? 'No matching tunnels' : 'No active automation tunnels'}
          </h2>
          <p style={{ margin: '8px 0 24px', fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first comment-to-DM or message reply flow to start automated dispatching.'}
          </p>
          {!searchQuery && statusFilter === 'all' && accounts.length > 0 && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              Establish First Tunnel
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredFlows.map(flow => (
            <FlowCard key={flow.id} flow={flow} accounts={accounts}
              onToggle={() => handleToggle(flow)} onDelete={() => handleDelete(flow)} deleting={deletingId === flow.id} />
          ))}
        </div>
      )}

      {showForm && (
        <FlowForm accounts={accounts} onCancel={() => setShowForm(false)} onSubmit={handleCreate} />
      )}
    </DashboardLayout>
  );
}

function FlowCard({ flow, accounts, onToggle, onDelete, deleting }) {
  const account = accounts.find(a => a.id === flow.instagramAccountId);
  return (
    <div 
      className="glass-panel"
      style={{
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = flow.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(124, 58, 237, 0.25)';
        e.currentTarget.style.boxShadow = flow.isActive
          ? '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 15px 0 rgba(16, 185, 129, 0.08)'
          : '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 15px 0 rgba(124, 58, 237, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-glass)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: flow.isActive ? 'rgba(16, 185, 129, 0.08)' : 'var(--overlay-light)',
        border: `1px solid ${flow.isActive ? 'rgba(16, 185, 129, 0.22)' : 'var(--overlay-strong)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
        boxShadow: flow.isActive ? '0 0 12px rgba(16, 185, 129, 0.12)' : 'none'
      }}>
        {TRIGGER_ICONS[flow.trigger?.type] || '⚡'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {flow.name}
          </h3>
          {account && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#a78bfa',
              background: 'rgba(124, 58, 237, 0.08)',
              border: '1px solid rgba(124, 58, 237, 0.18)',
              borderRadius: 100,
              padding: '2px 8px',
              fontFamily: 'var(--font-mono)'
            }}>
              @{account.igUsername}
            </span>
          )}
          <span className={flow.isActive ? 'badge-live' : 'badge-paused'}>
            {flow.isActive ? 'Active' : 'Paused'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            background: 'var(--overlay-light)',
            border: '1px solid var(--overlay-medium)',
            borderRadius: 6,
            padding: '2px 8px'
          }}>
            {TRIGGER_LABELS[flow.trigger?.type] || flow.trigger?.type}
          </span>
          {flow.trigger?.mediaId && (
            <span style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#ec4899',
              background: 'rgba(236, 72, 153, 0.08)',
              border: '1px solid rgba(236, 72, 153, 0.18)',
              borderRadius: 6,
              padding: '2px 8px'
            }}>
              🎯 Specific Post
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
          <span style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#06b6d4',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.18)',
            borderRadius: 6,
            padding: '2px 8px'
          }}>
            Send DM
          </span>
          {flow.action?.commentReplyTemplate && (
            <span style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.18)',
              borderRadius: 6,
              padding: '2px 8px'
            }}>
              + Public Reply
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', marginRight: 16, flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Dispatches</p>
        <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          {flow.stats?.triggeredCount || 0}
        </p>
      </div>
      <div style={{ flexShrink: 0 }}><Toggle checked={flow.isActive} onChange={onToggle} /></div>
      <button 
        onClick={onDelete} 
        disabled={deleting} 
        title="Delete flow" 
        style={{
          background: 'none',
          border: 'none',
          cursor: deleting ? 'not-allowed' : 'pointer',
          padding: 8,
          borderRadius: 10,
          color: 'var(--text-muted)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          opacity: deleting ? 0.4 : 1
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

function FlowForm({ accounts, onCancel, onSubmit }) {
  const [name, setName] = useState('');
  const [instagramAccountId, setInstagramAccountId] = useState(accounts[0]?.id || '');
  const [triggerType, setTriggerType] = useState('comment_keyword');
  const [keywords, setKeywords] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [waitMinutes, setWaitMinutes] = useState(15);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [mediaTargetType, setMediaTargetType] = useState('all');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showReelPicker, setShowReelPicker] = useState(false);
  const [commentReplyTemplate, setCommentReplyTemplate] = useState('');

  const previewMessage = (messageTemplate || '').replace(/\{\{username\}\}/g, '@tester_account').trim();
  const previewCommentReply = (commentReplyTemplate || '').replace(/\{\{username\}\}/g, '@tester_account').trim();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      name, instagramAccountId,
      trigger: {
        type: triggerType,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        mediaId: triggerType === 'comment_keyword' && mediaTargetType === 'specific' ? selectedMedia?.id : null,
      },
      action: { type: 'send_dm', messageTemplate, commentReplyTemplate: triggerType === 'comment_keyword' && commentReplyTemplate ? commentReplyTemplate : null },
      fallback: { enabled: fallbackEnabled, waitMinutes: Number(waitMinutes), messageTemplate: fallbackMessage },
    });
    setSubmitting(false);
  }

  const labelStyle = { display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 };

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
        <form onSubmit={handleSubmit} className="modal-card" style={{ maxWidth: 880, width: '95vw', padding: 0 }}>

          {/* Header */}
          <div style={{
            padding: '24px 28px 20px',
            borderBottom: '1px solid var(--overlay-medium)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' }}>
                Establish Automation Tunnel
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                Set up a trigger node and automatic dispatch pipeline
              </p>
            </div>
            <button type="button" onClick={onCancel} style={{
              background: 'var(--overlay-light)', border: '1px solid var(--overlay-strong)',
              borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.18s ease'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--overlay-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 0, flexDirection: 'row' }}>
            {/* Left */}
            <div style={{ flex: 1, minWidth: 0, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>

              <div>
                <label style={labelStyle}>Tunnel Identifier</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="dark-input" placeholder="e.g. Lead Magnet comment responder" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Instagram Channel</label>
                  <select value={instagramAccountId} onChange={e => setInstagramAccountId(e.target.value)} className="dark-input" style={{ cursor: 'pointer' }}>
                    {accounts.map(a => <option key={a.id} value={a.id}>@{a.igUsername}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Trigger Mechanism</label>
                  <select value={triggerType} onChange={e => setTriggerType(e.target.value)} className="dark-input" style={{ cursor: 'pointer' }}>
                    <option value="comment_keyword">Comment keyword</option>
                    <option value="dm_inbound">New DM received</option>
                    <option value="story_mention">Story mention</option>
                    <option value="story_reply">Story reply</option>
                  </select>
                </div>
              </div>

              {(triggerType === 'comment_keyword' || triggerType === 'dm_inbound') && (
                <div>
                  <label style={labelStyle}>Trigger Keywords <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>(comma separated)</span></label>
                  <input value={keywords} onChange={e => setKeywords(e.target.value)} className="dark-input" placeholder="price, link, details" style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }} />
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Leave empty to reply to ALL {triggerType === 'dm_inbound' ? 'messages' : 'comments'}.</p>
                </div>
              )}

              {triggerType === 'comment_keyword' && (
                <>
                  {/* Target Post / Reel */}
                  <div>
                    <label style={labelStyle}>Target Post / Reel</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => { setMediaTargetType('all'); setSelectedMedia(null); }}
                        style={{
                          flex: 1, padding: '10px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 10, cursor: 'pointer',
                          border: '1px solid', transition: 'all 0.2s ease',
                          background: mediaTargetType === 'all' ? 'rgba(124, 58, 237, 0.15)' : 'var(--overlay-light)',
                          borderColor: mediaTargetType === 'all' ? 'var(--accent-purple)' : 'var(--overlay-medium)',
                          color: mediaTargetType === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          boxShadow: mediaTargetType === 'all' ? '0 0 15px rgba(124, 58, 237, 0.15)' : 'none'
                        }}
                        onMouseEnter={e => {
                          if (mediaTargetType !== 'all') {
                            e.currentTarget.style.background = 'var(--overlay-medium)';
                            e.currentTarget.style.borderColor = 'var(--overlay-strong)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (mediaTargetType !== 'all') {
                            e.currentTarget.style.background = 'var(--overlay-light)';
                            e.currentTarget.style.borderColor = 'var(--overlay-medium)';
                          }
                        }}
                      >
                        📋 All Posts &amp; Reels
                      </button>
                      <button type="button" onClick={() => { setMediaTargetType('specific'); setShowReelPicker(true); }}
                        style={{
                          flex: 1, padding: '10px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 10, cursor: 'pointer',
                          border: '1px solid', transition: 'all 0.2s ease',
                          background: mediaTargetType === 'specific' ? 'rgba(124, 58, 237, 0.15)' : 'var(--overlay-light)',
                          borderColor: mediaTargetType === 'specific' ? 'var(--accent-purple)' : 'var(--overlay-medium)',
                          color: mediaTargetType === 'specific' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          boxShadow: mediaTargetType === 'specific' ? '0 0 15px rgba(124, 58, 237, 0.15)' : 'none'
                        }}
                        onMouseEnter={e => {
                          if (mediaTargetType !== 'specific') {
                            e.currentTarget.style.background = 'var(--overlay-medium)';
                            e.currentTarget.style.borderColor = 'var(--overlay-strong)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (mediaTargetType !== 'specific') {
                            e.currentTarget.style.background = 'var(--overlay-light)';
                            e.currentTarget.style.borderColor = 'var(--overlay-medium)';
                          }
                        }}
                      >
                        🎬 Pick a Specific Reel →
                      </button>
                    </div>

                    {/* Selected reel preview */}
                    {mediaTargetType === 'specific' && selectedMedia && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, marginTop: 10,
                        background: 'rgba(124, 58, 237, 0.04)', border: '1px solid rgba(124, 58, 237, 0.22)',
                        borderRadius: 12, padding: '10px 14px'
                      }}>
                        {selectedMedia.thumbnail_url
                          ? <img src={selectedMedia.thumbnail_url} alt="reel" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎬</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#c084fc' }}>Reel Selected ✓</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMedia.caption || selectedMedia.id}</p>
                        </div>
                        <button type="button" onClick={() => setShowReelPicker(true)} style={{ fontSize: 11, fontWeight: 600, color: '#c084fc', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.25)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}>Change</button>
                      </div>
                    )}

                    {mediaTargetType === 'specific' && !selectedMedia && (
                      <button type="button" onClick={() => setShowReelPicker(true)} style={{
                        width: '100%', marginTop: 10, padding: '16px', borderRadius: 12,
                        border: '1.5px dashed rgba(124, 58, 237, 0.3)', background: 'rgba(124, 58, 237, 0.03)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.2s ease'
                      }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(124, 58, 237, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.45)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(124, 58, 237, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                        </svg>
                        <span style={{ color: '#c084fc', fontWeight: 600, fontSize: 13 }}>Open Reel Picker</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label style={labelStyle}>Public Comment Reply <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input value={commentReplyTemplate} onChange={e => setCommentReplyTemplate(e.target.value)} className="dark-input" placeholder="e.g. Sent you a DM! Check your inbox 📥" />
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Leave empty to trigger DM without a public reply.</p>
                  </div>
                </>
              )}

              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>DM Response Template</span>
                  <button type="button" onClick={() => setMessageTemplate(p => p + '{{username}}')} style={{ fontSize: 9.5, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 5, padding: '2px 8px', color: '#c084fc', cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>+ {'{{username}}'}</button>
                </label>
                <textarea required value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)} className="dark-input" rows={3} placeholder="Hey {{username}}! Thanks for commenting. Here's your link…" style={{ resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              {triggerType === 'dm_inbound' && (
                <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--overlay-light)', borderRadius: 14, padding: '14px 16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div 
                      className={`toggle-track${fallbackEnabled ? ' checked' : ''}`} 
                      onClick={() => setFallbackEnabled(p => !p)}
                      role="switch"
                      aria-checked={fallbackEnabled}
                    >
                      <div className="toggle-thumb" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Enable Auto-Reply Fallback</span>
                  </label>
                  {fallbackEnabled && (
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14, borderTop: '1px solid var(--overlay-medium)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="number" min={1} value={waitMinutes} onChange={e => setWaitMinutes(e.target.value)} className="dark-input" style={{ width: 72, textAlign: 'center', fontFamily: 'var(--font-mono)' }} />
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>minutes wait before fallback triggers</span>
                      </div>
                      <textarea value={fallbackMessage} onChange={e => setFallbackMessage(e.target.value)} rows={2} className="dark-input" placeholder="It looks like you haven't heard back. Can we help?" style={{ resize: 'vertical' }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: live simulation */}
            <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--overlay-medium)', padding: '24px 20px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <label style={labelStyle}>Live Simulation</label>
              
              {/* Phone Mockup Wrapper */}
              <div style={{
                position: 'relative',
                flex: 1,
                minHeight: 380,
                background: 'var(--bg-space)',
                border: '6px solid var(--border-glass)',
                borderRadius: 28,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.6)',
                overflow: 'hidden'
              }}>
                {/* Dynamic Island / Notch */}
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 70,
                  height: 14,
                  background: 'var(--text-primary)',
                  borderRadius: 100,
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Camera lens indicator */}
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--bg-space)', marginRight: 4 }} />
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                </div>

                {/* Status Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  padding: '2px 8px 10px',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span>10:20 AM</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span>📶</span>
                    <span>5G</span>
                    <span>🔋 99%</span>
                  </div>
                </div>

                {/* Screen Content Panel */}
                <div style={{
                  flex: 1,
                  background: 'var(--bg-space)',
                  borderRadius: 18,
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  gap: 8,
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid var(--overlay-light)'
                }}>
                  {/* Grid Lines in phone screen background */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(var(--overlay-light) 1px, transparent 1px), linear-gradient(90deg, var(--overlay-light) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                    pointerEvents: 'none'
                  }} />

                  {/* Simulator Header */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    padding: '8px 10px',
                    borderBottom: '1px solid var(--overlay-light)',
                    background: 'var(--bg-modal)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', gap: 8, zIndex: 5
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                      padding: 1.5
                    }}>
                      <div style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        background: 'var(--bg-space)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: 'var(--text-primary)'
                      }}>
                        {accounts.find(a => String(a.id) === String(instagramAccountId))?.igUsername?.[0]?.toUpperCase() || 'I'}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        @{accounts.find(a => String(a.id) === String(instagramAccountId))?.igUsername || 'insta_bot'}
                      </p>
                      <p style={{ margin: 0, fontSize: 8, color: 'var(--text-muted)' }}>Simulation Feed</p>
                    </div>
                  </div>

                  {/* Messaging Flow Viewport */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}>
                    
                    {/* Inbound action bubble */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--text-muted)', color: 'var(--bg-space)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>👤</div>
                      <div style={{
                        background: 'var(--overlay-medium)', border: '1px solid var(--overlay-medium)',
                        borderRadius: '14px 14px 14px 4px', padding: '6px 10px', fontSize: 10.5, color: 'var(--text-primary)', maxWidth: '80%'
                      }}>
                        {triggerType === 'comment_keyword' ? (
                          <span>💬 Commented: <strong style={{ color: '#c084fc', fontWeight: 600 }}>"{keywords ? keywords.split(',')[0].trim() : 'link'}"</strong></span>
                        ) : triggerType === 'dm_inbound' ? (
                          <span>📩 Inbound: <strong style={{ color: '#06b6d4', fontWeight: 600 }}>"{keywords ? keywords.split(',')[0].trim() : 'hello'}"</strong></span>
                        ) : triggerType === 'story_mention' ? (
                          <span>✨ Mentioned you in a Story</span>
                        ) : (
                          <span>↩️ Replied to your Story</span>
                        )}
                      </div>
                    </div>

                    {/* Outbound public comment reply bubble */}
                    {triggerType === 'comment_keyword' && previewCommentReply && (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, paddingLeft: 16 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--text-primary)', fontWeight: 700
                        }}>
                          {accounts.find(a => String(a.id) === String(instagramAccountId))?.igUsername?.[0]?.toUpperCase() || 'I'}
                        </div>
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)',
                          borderRadius: '12px 12px 12px 4px', padding: '6px 9px', fontSize: 9.5, color: '#a7f3d0', maxWidth: '80%',
                          boxShadow: '0 0 10px rgba(16, 185, 129, 0.04)'
                        }}>
                          <span style={{ fontSize: 7.5, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 2 }}>Public Reply:</span>
                          {previewCommentReply}
                        </div>
                      </div>
                    )}

                    {/* Outbound direct message bubble */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                        borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 11, color: 'var(--text-primary)', maxWidth: '85%',
                        boxShadow: '0 4px 15px rgba(124,58,237,0.3)', wordBreak: 'break-word', lineHeight: 1.4,
                        border: '1px solid var(--overlay-strong)'
                      }}>
                        <span style={{ fontSize: 8, opacity: 0.7, display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 2 }}>Private DM Response:</span>
                        {previewMessage || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Write message template...</span>}
                      </div>
                    </div>

                    {/* Outbound fallback bubble */}
                    {triggerType === 'dm_inbound' && fallbackEnabled && fallbackMessage && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                          borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 11, color: 'var(--text-primary)', maxWidth: '85%',
                          boxShadow: '0 4px 15px rgba(6,182,212,0.3)', wordBreak: 'break-word', lineHeight: 1.4,
                          border: '1px solid var(--overlay-strong)'
                        }}>
                          <span style={{ fontSize: 8, opacity: 0.7, display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 2 }}>
                            Fallback ({waitMinutes}m delay):
                          </span>
                          {fallbackMessage}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '18px 28px', borderTop: '1px solid var(--overlay-medium)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" onClick={onCancel} style={{ background: 'var(--overlay-light)', border: '1px solid var(--overlay-strong)', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--overlay-strong)'}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--overlay-light)'; }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ minWidth: 130 }}>
              {submitting ? 'Creating Tunnel...' : '✓ Launch Tunnel'}
            </button>
          </div>
        </form>
      </div>

      {/* Full-screen reel picker */}
      {showReelPicker && (
        <ReelPickerModal
          accountId={instagramAccountId}
          accounts={accounts}
          selectedMedia={selectedMedia}
          onSelect={media => { setSelectedMedia(media); setShowReelPicker(false); }}
          onClose={() => setShowReelPicker(false)}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────── */
/* ReelPickerModal — full-screen overlay                  */
/* ─────────────────────────────────────────────────────── */
function ReelPickerModal({ accountId, accounts, selectedMedia, onSelect, onClose }) {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState('');

  const account = accounts.find(a => String(a.id) === String(accountId));

  useEffect(() => { fetchMedia(); }, [accountId]);

  async function fetchMedia() {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/instagram-accounts/${accountId}/media`);
      setMediaList(data.media || []);
    } catch { setMediaList([]); }
    finally { setLoading(false); }
  }

  function handleAddCustom() {
    setCustomError('');
    const trimmed = customUrl.trim();
    if (!trimmed) { setCustomError('Please enter a URL'); return; }
    const match = trimmed.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    const shortcode = match ? match[1] : trimmed.replace(/[^A-Za-z0-9_-]/g, '');
    if (!shortcode) { setCustomError('Enter a valid Instagram post or reel URL'); return; }
    const custom = {
      id: shortcode,
      caption: `Your reel: instagram.com/reel/${shortcode}/`,
      media_type: 'VIDEO',
      thumbnail_url: null,
      permalink: `https://www.instagram.com/reel/${shortcode}/`,
    };
    setMediaList(prev => [custom, ...prev.filter(m => m.id !== shortcode)]);
    setCustomUrl('');
    setAddingCustom(false);
    onSelect(custom);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg-modal)', backdropFilter: 'blur(15px)', display: 'flex', flexDirection: 'column', animation: 'modal-fade-in 0.2s ease' }}>

      {/* Top bar */}
      <div style={{
        padding: '18px 28px',
        borderBottom: '1px solid var(--overlay-medium)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-modal)',
        backdropFilter: 'blur(20px)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" onClick={onClose} style={{
            background: 'var(--overlay-light)', border: '1px solid var(--overlay-strong)',
            borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.18s ease'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--overlay-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--overlay-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' }}>
              Select a Reel or Post
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {account ? `@${account.igUsername}` : 'Your channel'} · Select post trigger node
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAddingCustom(v => !v)}
          className="btn-primary"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: addingCustom ? 'rgba(124, 58, 237, 0.15)' : 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
            borderColor: addingCustom ? 'rgba(124, 58, 237, 0.4)' : 'var(--overlay-strong)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Reel URL
        </button>
      </div>

      {/* Add custom URL */}
      {addingCustom && (
        <div style={{
          padding: '14px 28px',
          borderBottom: '1px solid rgba(124, 58, 237, 0.18)',
          background: 'rgba(124, 58, 237, 0.03)',
          display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0
        }}>
          <div style={{ flex: 1 }}>
            <input
              value={customUrl}
              onChange={e => { setCustomUrl(e.target.value); setCustomError(''); }}
              className="dark-input"
              placeholder="Paste Instagram URL — e.g. https://www.instagram.com/reel/ABC123xyz/"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
              autoFocus
            />
            {customError && <p style={{ margin: '5px 0 0', fontSize: 11.5, color: '#f43f5e', fontWeight: 600 }}>{customError}</p>}
          </div>
          <button
            type="button"
            onClick={handleAddCustom}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              borderColor: 'rgba(236,72,153,0.25)',
              boxShadow: '0 4px 15px rgba(236,72,153,0.25)'
            }}
          >
            Add &amp; Select
          </button>
          <button
            type="button"
            onClick={() => { setAddingCustom(false); setCustomError(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 24, padding: '4px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ×
          </button>
        </div>
      )}

      {/* Info banner */}
      <div style={{
        padding: '10px 28px',
        background: 'rgba(6, 182, 212, 0.03)',
        borderBottom: '1px solid rgba(6, 182, 212, 0.1)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
      }}>
        <span style={{ fontSize: 14 }}>ℹ️</span>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          To trigger off an existing item, paste its post/reel link via <strong style={{ color: '#06b6d4' }}>Add Reel URL</strong> to select it instantly.
        </p>
      </div>

      {/* Reel grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: 16 }} />)}
          </div>
        ) : mediaList.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, paddingTop: 60 }}>
            <div style={{ fontSize: 48 }}>🎬</div>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>No posts found</p>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>Use the <strong style={{ color: 'var(--accent-purple)' }}>Add Reel URL</strong> button above to paste your Instagram reel link directly.</p>
            <button type="button" onClick={() => setAddingCustom(true)} className="btn-primary" style={{ marginTop: 8 }}>
              Add Reel URL
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
            {mediaList.map(m => {
              const isSelected = selectedMedia?.id === m.id;
              const isHovered = hoveredId === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => onSelect(m)}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 16,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--accent-purple)' : '1px solid var(--overlay-medium)',
                    boxShadow: isSelected 
                      ? '0 0 25px rgba(124,58,237,0.45)' 
                      : isHovered 
                        ? '0 12px 30px rgba(0,0,0,0.7), 0 0 15px var(--overlay-medium)' 
                        : 'none',
                    transform: isHovered && !isSelected ? 'scale(1.03)' : 'scale(1)',
                    transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    background: 'var(--overlay-light)'
                  }}
                >
                  {m.thumbnail_url ? (
                    <img src={m.thumbnail_url} alt="reel" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 10,
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(6,182,212,0.05) 100%)'
                    }}>
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', padding: '0 12px' }}>Custom Post Node</span>
                    </div>
                  )}

                  {/* Type badge */}
                  <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: 'rgba(6, 6, 15, 0.85)', backdropFilter: 'blur(4px)',
                    border: '1px solid var(--overlay-medium)',
                    borderRadius: 6, padding: '3px 8px', fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.06em'
                  }}>
                    {m.media_type === 'VIDEO' ? '▶ REEL' : '🖼 POST'}
                  </div>

                  {/* Selected badge */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'var(--accent-purple)', borderRadius: '50%',
                      width: 22, height: 22, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700,
                      boxShadow: '0 0 10px var(--accent-purple)'
                    }}>✓</div>
                  )}

                  {/* Caption overlay */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                    padding: '24px 12px 12px',
                    opacity: isHovered || isSelected ? 1 : 0,
                    transition: 'opacity 0.25s ease'
                  }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                      {m.caption || 'No caption'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: '16px 28px',
        borderTop: '1px solid var(--overlay-medium)',
        background: 'var(--bg-modal)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
          {mediaList.length} post{mediaList.length !== 1 ? 's' : ''} detected · select trigger channel
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'var(--overlay-light)', border: '1px solid var(--overlay-strong)',
            borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600,
            color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--overlay-strong)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--overlay-light)'}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
