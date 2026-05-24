/**
 * ReportsPage.jsx
 * Route: /recruiter/reports/:testId
 * Visual stat cards, score distribution bars, rich candidate table.
 * Fixed: all rgba(255,255,255,X) borders → CSS variables (light/dark theme compatible)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RecruiterLayout from '../../components/layout/RecruiterLayout';
import * as reportsApi  from '../../api/reportsApi';

/* ─── Helpers ────────────────────────────────────────────── */
function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Avatar({ name, size = 36 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  const hue = (name?.charCodeAt(0) ?? 0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},55%,28%)`,
      border: `1px solid hsl(${hue},55%,38%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif', fontSize: size * 0.33,
      fontWeight: 800, color: `hsl(${hue},70%,72%)`,
    }}>
      {initials}
    </div>
  );
}

function ScoreMini({ pct, pass }) {
  const color = pass ? '#10B981' : pct > 0 ? '#EF4444' : 'var(--text-3)';
  return (
    <div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color, marginBottom: 4 }}>
        {pct != null ? `${parseFloat(pct).toFixed(1)}%` : '—'}
      </div>
      <div style={{ height: 4, background: 'var(--s5)', borderRadius: 2, width: 64, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct ?? 0, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon, topColor }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--border-1)',
      borderRadius: 16, padding: '20px 22px',
      borderTop: `2px solid ${topColor}`,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${topColor}18`, border: `1px solid ${topColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed:   { label: 'Completed',   color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  dot: false },
    in_progress: { label: 'In Progress', color: '#6366F1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)',  dot: true  },
    assigned:    { label: 'Not Started', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', dot: false },
    pending:     { label: 'Not Started', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', dot: false },
  };
  const c = map[status] || map.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: c.bg, border: `1px solid ${c.border}`, fontSize: 11, fontWeight: 700, color: c.color, letterSpacing: '0.03em' }}>
      {c.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, display: 'inline-block', animation: 'glowPulse 1.5s ease-in-out infinite' }} />}
      {c.label}
    </span>
  );
}

function ResultBadge({ result }) {
  if (!result || result === 'pending') return <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>;
  const pass = result === 'pass';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: pass ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${pass ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
      color: pass ? '#34D399' : '#FCA5A5',
    }}>
      {pass ? '✓ Pass' : '✗ Fail'}
    </span>
  );
}

/* ─── Score Distribution Bar Chart ──────────────────────── */
function ScoreDistribution({ distribution }) {
  if (!distribution) return null;
  const entries = Object.entries(distribution);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const colors = ['#EF4444','#F97316','#F59E0B','#84CC16','#10B981','#6366F1'];

  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '20px 22px', marginBottom: 20 }}>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📊</span> Score Distribution
      </h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
        {entries.map(([range, count], i) => {
          const height = max > 0 ? (count / max) * 90 : 0;
          return (
            <div key={range} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors[i], fontFamily: 'Syne, sans-serif' }}>{count}</div>
              <div style={{
                width: '100%', height: `${height}px`, minHeight: count > 0 ? 4 : 0,
                background: colors[i], borderRadius: '4px 4px 0 0', opacity: 0.85,
                transition: 'height 0.5s ease',
              }} />
              <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.2 }}>{range}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const ReportsPage = () => {
  const { testId } = useParams();
  const navigate   = useNavigate();

  const [loading, setLoading]       = useState(true);
  const [report, setReport]         = useState(null);
  const [error, setError]           = useState('');
  const [filterStatus, setFilter]   = useState('all');
  const [sortBy, setSort]           = useState('percentage');
  const [search, setSearch]         = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await reportsApi.getTestReport(testId);
        setReport(res.data);
      } catch (e) { setError(e.response?.data?.message || 'Failed to load report'); }
      finally { setLoading(false); }
    })();
  }, [testId]);

  if (loading) return (
    <RecruiterLayout title="Reports" subtitle="Loading…">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--s5)', borderTopColor: '#6366F1', animation: 'spin 0.9s linear infinite' }} />
      </div>
    </RecruiterLayout>
  );

  if (error || !report) return (
    <RecruiterLayout title="Reports">
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 20 }}>{error || 'Report not found'}</p>
        <button onClick={() => navigate('/recruiter/dashboard')} style={{
          padding: '10px 24px', borderRadius: 10,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          border: 'none', color: 'white', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}>← Back to Dashboard</button>
      </div>
    </RecruiterLayout>
  );

  const { test, statistics, proctoring } = report;

  /* Filter + sort */
  const filtered = (report.candidates || [])
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'percentage') return (b.percentage ?? -1) - (a.percentage ?? -1);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'completedAt') return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
      return 0;
    });

  return (
    <RecruiterLayout
      title="Test Report"
      subtitle={test?.testTitle || test?.title}
      actions={
        <button onClick={() => navigate('/recruiter/dashboard')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
          background: 'var(--s3)', border: '1px solid var(--border-2)',
          color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--text-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Dashboard
        </button>
      }
    >
      <style>{`
        @keyframes glowPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Candidates" value={statistics.totalCandidates} icon="👥"
          sub={`${statistics.completed} completed · ${statistics.inProgress} active`}
          color="var(--text-1)" topColor="#6366F1" />
        <StatCard label="Average Score" value={`${statistics.averageScore}%`} icon="📈"
          sub={`High: ${statistics.highestScore}% · Low: ${statistics.lowestScore}%`}
          color="#818CF8" topColor="#818CF8" />
        <StatCard label="Pass Rate" value={`${statistics.passRate}%`} icon="🏆"
          sub={`${statistics.passedCount} / ${statistics.completed} passed`}
          color="#34D399" topColor="#10B981" />
        <StatCard label="Suspicious" value={proctoring?.suspiciousCandidates ?? 0} icon="🚨"
          sub={`${proctoring?.highViolations ?? 0} high-severity violations`}
          color={proctoring?.suspiciousCandidates > 0 ? '#FCA5A5' : 'var(--text-1)'} topColor="#EF4444" />
        <StatCard label="Test Duration" value={`${test?.duration_minutes ?? '—'} min`} icon="⏱️"
          sub={`${test?.question_count ?? '—'} questions · ${test?.total_marks ?? '—'} marks`}
          color="var(--text-2)" topColor="#F59E0B" />
      </div>

      {/* ── Score distribution ── */}
      {statistics.scoreDistribution && <ScoreDistribution distribution={statistics.scoreDistribution} />}

      {/* ── Proctoring summary ── */}
      {proctoring && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '18px 22px', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🛡️</span> Proctoring Overview
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {[
              { label: 'Total Tab Switches',  val: proctoring.totalTabSwitches  ?? 0, warn: proctoring.totalTabSwitches  > 5 },
              { label: 'Total Window Blurs',  val: proctoring.totalWindowBlurs  ?? 0, warn: false },
              { label: 'Total Copy/Paste',    val: proctoring.totalCopyAttempts ?? 0, warn: false },
              { label: 'Flagged Candidates',  val: proctoring.suspiciousCandidates ?? 0, warn: proctoring.suspiciousCandidates > 0 },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: 10,
                background: s.warn ? 'rgba(239,68,68,0.06)' : 'var(--s3)',
                border: `1px solid ${s.warn ? 'rgba(239,68,68,0.2)' : 'var(--border-1)'}`,
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: s.warn ? '#FCA5A5' : 'var(--text-1)', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Candidates table ── */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border-1)', borderRadius: 18, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-1)',
          background: 'var(--s1)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginRight: 4 }}>
            Candidates
          </h3>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 12px 7px 30px', background: 'var(--s3)', border: '1px solid var(--input-border)', borderRadius: 9, color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif' }} />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all','completed','in_progress','assigned'].map(s => {
              const labels = { all: 'All', completed: 'Completed', in_progress: 'Active', assigned: 'Not Started' };
              const active = filterStatus === s;
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                  background: active ? 'rgba(99,102,241,0.15)' : 'var(--s3)',
                  border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : 'var(--border-1)'}`,
                  color: active ? '#818CF8' : 'var(--text-3)',
                  transition: 'all 0.2s',
                }}>
                  {labels[s]}
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSort(e.target.value)} style={{
            padding: '7px 12px', boxSizing: 'border-box',
            background: 'var(--s3)', border: '1px solid var(--input-border)',
            borderRadius: 9, color: 'var(--text-2)', fontSize: 12, outline: 'none',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', WebkitAppearance: 'none',
          }}>
            <option value="percentage">Sort: Score ↓</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="completedAt">Sort: Latest</option>
          </select>

          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['Candidate','Status','Score','Result','Violations','Completed',''].map((h, i) => (
                  <th key={i} style={{
                    padding: '11px 16px', textAlign: i === 6 ? 'right' : 'left',
                    fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-1)',
                    background: 'var(--s1)', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 12 }}>👥</div>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>No candidates found</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Try adjusting your filters</p>
                  </td>
                </tr>
              ) : filtered.map((c, i) => {
                const pct = parseFloat(c.percentage ?? 0);
                const pass = c.resultStatus === 'pass' || c.result_status === 'pass';
                const isFlagged = c.isSuspicious || c.is_suspicious;
                const violations = (c.tabSwitches || c.total_tab_switches || 0) + (c.windowBlurs || c.total_window_blurs || 0);

                return (
                  <tr key={c.assignmentId || i}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--s2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {/* Candidate */}
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} size={34} />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {c.name}
                            {isFlagged && (
                              <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5', fontWeight: 700 }}>
                                🚨 Flagged
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-1)' }}>
                      <StatusBadge status={c.status} />
                    </td>
                    {/* Score */}
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-1)' }}>
                      {c.status === 'completed'
                        ? <><ScoreMini pct={pct} pass={pass} /><div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{c.score ?? '—'}/{test?.totalMarks ?? test?.total_marks ?? '—'}</div></>
                        : <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>
                      }
                    </td>
                    {/* Result */}
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-1)' }}>
                      <ResultBadge result={c.resultStatus || c.result_status} />
                    </td>
                    {/* Violations */}
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-1)' }}>
                      {c.status === 'completed' ? (
                        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: violations > 3 ? '#FCA5A5' : 'var(--text-3)' }}>
                          <span title="Tab switches">🔄 {c.tabSwitches || c.total_tab_switches || 0}</span>
                          <span title="Window blurs">👁️ {c.windowBlurs || c.total_window_blurs || 0}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>}
                    </td>
                    {/* Completed at */}
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-1)', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {fmt(c.completedAt || c.submitted_at)}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-1)', textAlign: 'right' }}>
                      {c.status === 'completed' && (
                        <button
                          onClick={() => navigate(`/recruiter/reports/candidate/${c.assignmentId}`)}
                          style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: 'var(--s3)', border: '1px solid var(--border-2)',
                            color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.2s',
                            fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.color = '#818CF8'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}>
                          View Details →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-1)', background: 'var(--s1)', fontSize: 12, color: 'var(--text-3)' }}>
            Showing {filtered.length} of {report.candidates?.length ?? 0} candidate{report.candidates?.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </RecruiterLayout>
  );
};

export default ReportsPage;