/**
 * MonitoringPanel Component
 * Real-time monitoring panel for recruiters.
 * className → inline styles. Button/Alert replaced inline. All logic unchanged.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import * as monitoringApi from '../../api/monitoringApi';

/* ─── Inline Alert ───────────────────────────────────────── */
function Alert({ type, message, onClose }) {
  const isErr = type === 'error';
  const isOk  = type === 'success';
  const color = isErr ? '#FCA5A5' : isOk ? '#34D399' : '#818CF8';
  const bg    = isErr ? 'rgba(239,68,68,0.08)' : isOk ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)';
  const border = isErr ? 'rgba(239,68,68,0.25)' : isOk ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.25)';
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 13, color, flex: 1, lineHeight: 1.5 }}>{message}</span>
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color, fontSize: 16, lineHeight: 1 }}>×</button>}
    </div>
  );
}

/* ─── Inline Button ──────────────────────────────────────── */
function Btn({ onClick, children, variant = 'outline', small }) {
  const pad = small ? '5px 12px' : '8px 16px';
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: pad, borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap',
  };
  if (variant === 'link') {
    return <button onClick={onClick} style={{ ...base, background: 'none', border: 'none', color: 'var(--brand)', padding: '4px 0' }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-light)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--brand)'}
    >{children}</button>;
  }
  return <button onClick={onClick} style={{ ...base, background: 'var(--s3)', border: '1px solid var(--border-2)', color: 'var(--text-1)' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.borderColor = 'var(--border-3)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
  >{children}</button>;
}

/* ─── Severity helpers — identical to original logic ─────── */
const getSeverityStyle = (severity) => {
  const m = {
    critical: { color: '#FCA5A5', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)'   },
    high:     { color: '#FED7AA', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)' },
    medium:   { color: '#FEF08A', bg: 'rgba(234,179,8,0.10)',  border: 'rgba(234,179,8,0.25)'  },
    low:      { color: '#C7D2FE', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.25)' },
  };
  return m[severity] || { color: 'var(--text-2)', bg: 'var(--s3)', border: 'var(--border-1)' };
};

const getEventIcon = (eventType) => {
  const m = { tab_switch: '🔄', window_blur: '👁️', copy_attempt: '📋', paste_attempt: '📌', webcam_snapshot: '📸', suspicious_activity: '🚨' };
  return m[eventType] || '📊';
};

const getSeverityLeftColor = (severity) => {
  const m = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#3b82f6' };
  return m[severity] || 'var(--border-2)';
};

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const MonitoringPanel = ({ testId }) => {
  const { socket, connected, joinTestRoom, leaveTestRoom, on, off } = useSocket();
  const navigate = useNavigate();

  const [activeCandidates,    setActiveCandidates]    = useState([]);
  const [recentEvents,        setRecentEvents]        = useState([]);
  const [stats,               setStats]               = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [alert,               setAlert]               = useState(null);
  const [autoRefresh,         setAutoRefresh]         = useState(true);
  const [secondaryCameraFeeds,setSecondaryCameraFeeds]= useState({});

  /* ── Join test room — identical to original ─────────────────────────────── */
  useEffect(() => {
    if (connected && testId) { joinTestRoom(testId); loadMonitoringData(); }
    return () => { if (testId) leaveTestRoom(testId); };
  }, [connected, testId]);

  /* ── Load data — identical to original ─────────────────────────────────── */
  const loadMonitoringData = async () => {
    try {
      const liveResponse  = await monitoringApi.getLiveMonitoring(testId);
      setActiveCandidates(liveResponse.data.activeCandidates || []);
      const statsResponse = await monitoringApi.getTestMonitoring(testId);
      setStats(statsResponse.data.candidates || []);
    } catch (error) {
      console.error('Load monitoring data error:', error);
      setAlert({ type: 'error', message: 'Failed to load monitoring data' });
    } finally { setLoading(false); }
  };

  /* ── Socket events — identical to original ──────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    const handleSecondaryFrame  = (data) => {
      const { assignmentId, frame } = data;
      setSecondaryCameraFeeds(prev => ({ ...prev, [assignmentId]: { ...prev[assignmentId], frame, lastUpdate: new Date() } }));
    };
    const handleSecondaryStatus = (data) => {
      const { assignmentId, status } = data;
      setSecondaryCameraFeeds(prev => ({ ...prev, [assignmentId]: { ...prev[assignmentId], status, lastUpdate: new Date() } }));
    };
    const handleCandidateEvent = (data) => {
      console.log('📊 Real-time event:', data);
      setRecentEvents(prev => [{ ...data, id: Date.now() }, ...prev.slice(0, 49)]);
      loadMonitoringData();
    };
    const handleCandidateActive = (data) => {
      setActiveCandidates(prev => prev.map(c => c.candidate_id === data.candidateId ? { ...c, last_activity: data.timestamp } : c));
    };
    const handleNewSnapshot = (data) => {
      console.log('📸 New snapshot:', data);
      setAlert({ type: 'info', message: 'New snapshot from candidate' });
    };

    on('secondary_camera_frame',  handleSecondaryFrame);
    on('secondary_camera_status', handleSecondaryStatus);
    on('candidate_event',         handleCandidateEvent);
    on('candidate_active',        handleCandidateActive);
    on('new_snapshot',            handleNewSnapshot);

    return () => {
      off('candidate_event',         handleCandidateEvent);
      off('candidate_active',        handleCandidateActive);
      off('new_snapshot',            handleNewSnapshot);
      off('secondary_camera_frame',  handleSecondaryFrame);
      off('secondary_camera_status', handleSecondaryStatus);
    };
  }, [socket, on, off]);

  /* ── Auto-refresh — identical to original ───────────────────────────────── */
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadMonitoringData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, testId]);

  /* ── Flag suspicious — identical to original ────────────────────────────── */
  const handleFlagSuspicious = async (assignmentId, candidateName) => {
    if (!window.confirm(`Flag ${candidateName} as suspicious? This will mark them for review.`)) return;
    try {
      await monitoringApi.flagSuspicious(assignmentId, 'Flagged by examiner');
      setAlert({ type: 'success', message: `${candidateName} flagged as suspicious` });
      loadMonitoringData();
    } catch { setAlert({ type: 'error', message: 'Failed to flag candidate' }); }
  };

  const handleViewLogs = (assignmentId) => navigate(`/recruiter/reports/candidate/${assignmentId}?tab=logs`);

  /* ── Loading ─────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--s5)', borderTopColor: 'var(--brand)', animation: 'mp-spin 0.9s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Loading monitoring data…</p>
      </div>
      <style>{`@keyframes mp-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes mp-spin{to{transform:rotate(360deg)}}`}</style>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>Live Monitoring</h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: connected ? '#10B981' : '#EF4444', fontWeight: 600 }}>●</span>
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
            <span style={{ color: 'var(--text-3)' }}>|</span>
            <span>{activeCandidates.length} active candidate(s)</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--brand)', cursor: 'pointer' }} />
            Auto-refresh
          </label>
          <Btn onClick={loadMonitoringData} small>Refresh</Btn>
        </div>
      </div>

      {/* ── Active candidates + Recent events ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

        {/* Active Candidates */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '20px' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Active Candidates</h3>
          {activeCandidates.length === 0 ? (
            <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>No candidates currently taking the test</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeCandidates.map((c) => (
                <div key={c.assignment_id} style={{ border: '1px solid var(--border-1)', borderRadius: 12, padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{c.candidate_name}</span>
                        {c.is_suspicious && (
                          <span style={{ padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>Suspicious</span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12, color: 'var(--text-2)' }}>
                        <div><strong>Tab Switches:</strong> {c.total_tab_switches}</div>
                        <div><strong>Window Blurs:</strong> {c.total_window_blurs}</div>
                        <div><strong>Total Events:</strong> {c.total_events}</div>
                        <div><strong>Last Activity:</strong> {c.last_activity ? new Date(c.last_activity).toLocaleTimeString() : 'N/A'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      <Btn onClick={() => handleViewLogs(c.assignment_id)} small>View Logs</Btn>
                      {!c.is_suspicious && (
                        <button onClick={() => handleFlagSuspicious(c.assignment_id, c.candidate_name)} style={{
                          padding: '5px 12px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.25)',
                          background: 'rgba(239,68,68,0.06)', color: '#FCA5A5',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                        >
                          Flag
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '20px' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Recent Events</h3>
          {recentEvents.length === 0 ? (
            <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>No events logged yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 384, overflowY: 'auto' }}>
              {recentEvents.map((event) => {
                const sev = getSeverityStyle(event.severity);
                return (
                  <div key={event.id} style={{ borderLeft: `3px solid ${getSeverityLeftColor(event.severity)}`, paddingLeft: 10, paddingTop: 6, paddingBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                          <span style={{ fontSize: 15 }}>{getEventIcon(event.eventType)}</span>
                          <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color }}>
                            {event.severity}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>
                          {event.eventType?.replace(/_/g, ' ')}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{event.eventDescription}</p>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, paddingTop: 2 }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Secondary Camera Feeds ── */}
      {Object.values(secondaryCameraFeeds).some(f => f.status === 'connected') && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '20px' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>📱 Secondary Camera Feeds</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {Object.entries(secondaryCameraFeeds).filter(([, f]) => f.status === 'connected').map(([assignmentId, feedData]) => (
              <div key={assignmentId} style={{ border: '1px solid var(--border-1)', borderRadius: 12, overflow: 'hidden' }}>
                {feedData.frame ? (
                  <img src={feedData.frame} alt={`Secondary camera ${assignmentId}`} style={{ width: '100%', height: 144, objectFit: 'cover', display: 'block', background: 'var(--s3)' }} />
                ) : (
                  <div style={{ width: '100%', height: 144, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--text-3)', fontSize: 11 }}>Waiting for feed…</span>
                  </div>
                )}
                <div style={{ padding: '7px 10px', background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>#{assignmentId}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                    background: feedData.status === 'connected' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                    border: `1px solid ${feedData.status === 'connected' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    color: feedData.status === 'connected' ? '#34D399' : '#FCA5A5',
                  }}>
                    {feedData.status === 'connected' ? '● Live' : '○ Off'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Statistics Table ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-1)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', background: 'var(--s1)' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Candidate Statistics</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['Candidate','Tab Switches','Window Blurs','Copy/Paste','Critical Events','Status','Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-1)', background: 'var(--s1)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No data available</td></tr>
              ) : stats.map((c) => (
                <tr key={c.assignment_id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--s2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-1)', borderBottom: '1px solid var(--border-1)', whiteSpace: 'nowrap' }}>{c.candidate_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)', borderBottom: '1px solid var(--border-1)' }}>{c.tab_switches || 0}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)', borderBottom: '1px solid var(--border-1)' }}>{c.window_blurs || 0}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)', borderBottom: '1px solid var(--border-1)' }}>{(c.copy_attempts || 0) + (c.paste_attempts || 0)}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)' }}>
                    {c.critical_events > 0 ? (
                      <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>{c.critical_events}</span>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>0</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)' }}>
                    {c.is_suspicious ? (
                      <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>Suspicious</span>
                    ) : (
                      <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', color: '#34D399' }}>Normal</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)' }}>
                    <Btn onClick={() => handleViewLogs(c.assignment_id)} variant="link" small>View Details</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPanel;