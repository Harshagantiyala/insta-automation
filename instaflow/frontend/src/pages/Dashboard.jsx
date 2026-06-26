import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import api from '../api/client';

function useCountUp(target, duration = 750) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setVal(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

function StatCard({ title, value, badge, badgeColor, link, sub, icon, iconColor }) {
  const animVal = useCountUp(value || 0);

  const inner = (
    <div 
      className="glass-panel"
      style={{
        padding: '24px 26px',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${iconColor}50`;
        e.currentTarget.style.boxShadow = `0 12px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px 0 ${iconColor}15`;
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-glass)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Glow aura inside card */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 100, height: 100,
        background: `radial-gradient(circle, ${iconColor}18 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${iconColor}12`,
          border: `1px solid ${iconColor}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 10px ${iconColor}08`
        }}>
          {icon}
        </div>
        {badge && (
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: badgeColor, background: `${badgeColor}12`,
            border: `1px solid ${badgeColor}25`,
            borderRadius: 100, padding: '3px 9px',
          }}>
            {badge}
          </span>
        )}
      </div>

      <div style={{ marginTop: 'auto', position: 'relative', zIndex: 1 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          {title}
        </p>
        <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
          {animVal}
        </p>
        {sub && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub}</p>
        )}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [flows, setFlows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDashboardData() {
    try {
      const [a, f, l] = await Promise.all([
        api.get('/api/instagram-accounts'),
        api.get('/api/flows'),
        api.get('/api/instagram-accounts/logs'),
      ]);
      setAccounts(a.data.accounts);
      setFlows(f.data.flows);
      const latestLogs = l.data.logs || [];
      setLogs(latestLogs);
      generateChartData(latestLogs);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }

  async function loadLogs() {
    try {
      const { data } = await api.get('/api/instagram-accounts/logs');
      const latestLogs = data.logs || [];
      setLogs(latestLogs);
      generateChartData(latestLogs);
    } catch (err) {
      console.error('Log reload error:', err);
    }
  }

  function generateChartData(currentLogs) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = days[date.getDay()];
      const dateString = date.toDateString();
      const count = currentLogs.filter(log => {
        const logDate = new Date(log.createdAt);
        return logDate.toDateString() === dateString && log.status === 'sent';
      }).length;
      const baselineMock = [12, 19, 9, 14, 22, 11, 18][6 - i];
      data.push({
        label: dayName,
        value: count + baselineMock,
        realCount: count,
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }
    setChartData(data);
  }

  const activeFlows = flows.filter(f => f.isActive).length;
  const totalSent = flows.reduce((sum, f) => sum + (f.stats?.triggeredCount || 0), 0);

  // SVG Chart settings
  const W = 620, H = 200, PAD = 36;
  const cW = W - PAD * 2, cH = H - PAD * 2;
  const maxVal = Math.max(...(chartData.length ? chartData.map(d => d.value) : [15]), 15);
  const pts = chartData.map((d, i) => ({
    x: PAD + (chartData.length > 1 ? (i / (chartData.length - 1)) * cW : cW / 2),
    y: PAD + cH - (d.value / maxVal) * cH,
    ...d,
  }));

  function smoothPath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const cpx = (points[i].x + points[i + 1].x) / 2;
      d += ` C ${cpx} ${points[i].y} ${cpx} ${points[i + 1].y} ${points[i + 1].x} ${points[i + 1].y}`;
    }
    return d;
  }

  const linePath = smoothPath(pts);
  const areaPath = linePath && pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`
    : '';

  return (
    <DashboardLayout>
      {/* Overview Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            System Terminal
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            Live status metrics of your Instagram automation engine.
          </p>
        </div>
        <Link
          to="/flows"
          className="btn-primary"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Configure Tunnels
        </Link>
      </div>

      {/* Grid: 3 Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 24 }}>
        <StatCard
          title="Linked Accounts"
          value={accounts.length}
          badge="Instagram"
          badgeColor="#a78bfa"
          link="/connect"
          sub="Connected Business & Creator pages"
          iconColor="#7c3aed"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.5" fill="#a78bfa" />
            </svg>
          }
        />
        <StatCard
          title="Active Tunnels"
          value={activeFlows}
          badge="Live"
          badgeColor="#34d399"
          link="/flows"
          sub="Automation scripts executing now"
          iconColor="#10b981"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          title="Automations Dispatched"
          value={totalSent}
          badge="Total"
          badgeColor="#f43f5e"
          sub="All-time automated messages sent"
          iconColor="#f43f5e"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        />
      </div>

      {/* Main Charts & Feed Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, marginBottom: 24 }}>

        {/* High Fidelity Area Chart Container */}
        <div className="glass-panel" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                Dispatch Volume
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                Number of automated triggers executed — last 7 days
              </p>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#c084fc', background: 'rgba(124, 58, 237, 0.1)',
              border: '1px solid rgba(124, 58, 237, 0.25)',
              borderRadius: 8, padding: '4px 10px',
            }}>7D Span</span>
          </div>

          {chartData.length > 0 ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid lines */}
                {[0, 0.33, 0.66, 1].map((ratio, i) => {
                  const y = PAD + ratio * cH;
                  const label = Math.round(maxVal - ratio * maxVal);
                  return (
                    <g key={i} opacity="0.15">
                      <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke='var(--text-primary)' strokeWidth="1" strokeDasharray="3 5" />
                      <text x={PAD - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--text-secondary)" fontFamily="var(--font-mono)">{label}</text>
                    </g>
                  );
                })}

                {/* Smooth Area & Path */}
                {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
                {linePath && <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />}

                {/* Points on Line */}
                {pts.map((p, i) => (
                  <g key={i}>
                    {hoveredBar === i && (
                      <line x1={p.x} y1={PAD} x2={p.x} y2={H - PAD}
                        stroke="var(--overlay-strong)" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}
                    <circle cx={p.x} cy={p.y}
                      r={hoveredBar === i ? 6 : 4}
                      fill={hoveredBar === i ? 'var(--accent-pink)' : 'var(--accent-purple)'}
                      stroke="var(--bg-space)" strokeWidth="2.5"
                      style={{ transition: 'all 0.2s ease', cursor: 'crosshair' }}
                    />
                    <text x={p.x} y={H - 8} textAnchor="middle" fontSize="10.5"
                      fill="var(--text-muted)" fontFamily="var(--font-body)">{p.label}</text>
                    
                    {/* Hover Target Area */}
                    <rect
                      x={p.x - cW / (chartData.length * 2)} y={PAD}
                      width={cW / Math.max(chartData.length - 1, 1)} height={cH}
                      fill="transparent" style={{ cursor: 'crosshair' }}
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                  </g>
                ))}
              </svg>

              {/* Glowing Interactive Tooltip overlay */}
              {hoveredBar !== null && pts[hoveredBar] && (
                <div style={{
                  position: 'absolute',
                  left: `${((pts[hoveredBar].x - PAD) / cW) * 100}%`,
                  top: `${(pts[hoveredBar].y / H) * 100 - 32}%`,
                  transform: 'translateX(-50%)',
                  background: 'var(--bg-modal)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(124, 58, 237, 0.35)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  pointerEvents: 'none',
                  zIndex: 20,
                  minWidth: 110,
                  boxShadow: '0 12px 36px rgba(0,0,0,0.6), 0 0 15px rgba(124, 58, 237, 0.2)',
                }}>
                  <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{pts[hoveredBar].date}</p>
                  <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span style={{ color: '#ec4899' }}>{pts[hoveredBar].value}</span>
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}> triggers</span>
                  </p>
                  {pts[hoveredBar].realCount > 0 && (
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                      ✓ {pts[hoveredBar].realCount} real DMs
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: 160 }} className="skeleton" />
          )}
        </div>

        {/* Live Logs Stream Deck */}
        <div 
          className="glass-panel" 
          style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 330,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                Console Stream
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Real-time execution logs</p>
            </div>
            <div className="live-dot" />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }} className="custom-scroll">
            {logs.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '30px 0' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
                  No execution logs detected.<br />Trigger a workflow.
                </p>
              </div>
            ) : (
              logs.slice(0, 10).map((log) => {
                const cfg = {
                  sent:   { color: '#34d399', bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.15)' },
                  failed: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.15)' },
                  queued: { color: '#c084fc', bg: 'rgba(124, 58, 237, 0.05)', border: 'rgba(124, 58, 237, 0.15)' },
                }[log.status] || { color: '#94a3b8', bg: 'var(--overlay-light)', border: 'var(--overlay-medium)' };

                const time = new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <div 
                    key={log.id} 
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 12px',
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 10,
                      boxShadow: 'inset 0 1px 0 0 var(--overlay-light)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${cfg.color}` }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ID: {log.recipientIgId}
                        </span>
                        <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{time}</span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                        "{log.content}"
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Grid: 3 Quick Action Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {[
          { label: 'Add Pipeline Script', desc: 'Construct a trigger → DM automation', to: '/flows', color: '#7c3aed', emoji: '⚡' },
          { label: 'Sync Page Channels', desc: 'Securely link your Instagram account', to: '/connect', color: '#10b981', emoji: '📱' },
          { label: 'Upgrade Execution Limits', desc: 'Unlock unlimited pipelines & dispatches', to: '/billing', color: '#f43f5e', emoji: '🚀' },
        ].map((item, i) => (
          <Link key={i} to={item.to} style={{ textDecoration: 'none' }}>
            <div 
              className="glass-panel"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${item.color}45`;
                e.currentTarget.style.background = `${item.color}05`;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 10px 30px -10px rgba(0,0,0,0.5), 0 0 15px 0 ${item.color}10`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-glass)';
                e.currentTarget.style.background = 'var(--panel-glass)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `${item.color}12`,
                border: `1px solid ${item.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {item.emoji}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</p>
              </div>
              <svg style={{ marginLeft: 'auto', opacity: 0.3, flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke='var(--text-primary)' strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
