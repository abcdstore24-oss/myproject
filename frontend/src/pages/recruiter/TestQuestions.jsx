/**
 * TestQuestions.jsx
 * Route: /recruiter/tests/:testId/questions
 * Complete redesign — slide-over forms, dark editors, expandable question cards.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as testApi      from '../../api/testApi';
import * as questionApi  from '../../api/questionApi';
import * as sectionApi   from '../../api/sectionApi';
import RecruiterLayout   from '../../components/layout/RecruiterLayout';

/* ─── Language definitions ───────────────────────────────── */
const LANGS = [
  {
    value: 'python', label: 'Python', icon: '🐍', mono: 'PY',
    starter: `def solution(param):\n    # Write your solution here\n    pass`,
    driver: `import json as _json\n_input = _json.loads(__RAW_INPUT__)\n_result = solution(_input)\nif isinstance(_result, (list, dict)):\n    print(_json.dumps(_result))\nelif _result is None:\n    print('null')\nelse:\n    print(_result)`,
  },
  {
    value: 'javascript', label: 'JavaScript', icon: '⚡', mono: 'JS',
    starter: `var solution = function(param) {\n    // Write your solution here\n};`,
    driver: `const _input = JSON.parse(__RAW_INPUT__);\nconst _result = solution(_input);\nif (_result === null || _result === undefined) {\n    console.log('null');\n} else if (typeof _result === 'object') {\n    console.log(JSON.stringify(_result));\n} else {\n    console.log(String(_result));\n}`,
  },
  {
    value: 'java', label: 'Java', icon: '☕', mono: 'JV',
    starter: `import java.util.*;\n\npublic class Solution {\n    public int[] solution(int[] nums) {\n        // Write your solution here\n        return null;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        // __INPUT__ is replaced at runtime\n    }\n}`,
    driver: '',
  },
  {
    value: 'cpp', label: 'C++', icon: '⚙️', mono: 'C++',
    starter: `#include <bits/stdc++.h>\nusing namespace std;\n\nvector<int> solution(vector<int>& nums) {\n    // Write your solution here\n    return {};\n}\n\nint main() {\n    // __INPUT__ is replaced at runtime\n    return 0;\n}`,
    driver: '',
  },
];

/* ─── Tiny helpers ───────────────────────────────────────── */
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const colors = { success: '#6EE7B7', error: '#FCA5A5', info: '#A5B4FC' };
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 12,
      background: 'var(--s3)', border: `1px solid ${colors[type]}30`,
      boxShadow: 'var(--shadow-lg)',
      animation: 'toastSlide 0.35s var(--ease-spring)',
      maxWidth: 360,
    }}>
      <span style={{ fontSize: 13.5, color: 'var(--text-1)' }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}

function FInput({ label, type = 'text', value, onChange, placeholder, min, required, rows }) {
  const [focused, setFocused] = useState(false);
  const isArea = type === 'textarea';
  const style = {
    width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: 10,
    background: 'var(--input-bg)',
    border: `1px solid ${focused ? 'var(--brand)' : 'var(--input-border)'}`,
    color: 'var(--text-1)', fontSize: 13.5, outline: 'none',
    boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
    transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
    resize: isArea ? 'vertical' : undefined,
  };
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 7 }}>
          {label}
        </label>
      )}
      {isArea
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows || 3} required={required} style={style} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} required={required} style={style} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
    </div>
  );
}

function FSelect({ label, value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 7 }}>{label}</label>}
      <select value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{
        width: '100%', padding: '10px 13px', borderRadius: 10,
        background: 'var(--s3)', border: `1px solid ${focused ? 'var(--brand)' : 'var(--input-border)'}`,
        color: 'var(--text-1)', fontSize: 13.5, outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
        transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
        WebkitAppearance: 'none', cursor: 'pointer',
      }}>
        {children}
      </select>
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div style={{ marginTop: 24, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--border-1)' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
    </div>
  );
}

/* ─── SlideOver ──────────────────────────────────────────── */
function SlideOver({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s both' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: '100%', maxWidth: 560,
        background: 'var(--s2)', borderLeft: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        animation: 'slideOverIn 0.35s var(--ease-spring)',
      }}>
        <style>{`@keyframes slideOverIn{from{transform:translateX(100%);opacity:.5}to{transform:translateX(0);opacity:1}}`}</style>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'var(--s3)', border: '1px solid var(--border-1)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-2)', display: 'flex', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="custom-scrollbar">
          {children}
        </div>
      </div>
    </>
  );
}

/* ─── Delete Dialog ──────────────────────────────────────── */
function DeleteDialog({ title, message, onConfirm, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s both' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 201, width: 'calc(100% - 32px)', maxWidth: 400,
        background: 'var(--s2)', border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 18, padding: '24px',
        boxShadow: 'var(--shadow-xl)',
        animation: 'fadeUp 0.25s both',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--border-2)', color: 'var(--text-1)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}>
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Submit button ──────────────────────────────────────── */
function SubmitBtn({ children, loading }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', padding: '13px', borderRadius: 11,
      background: loading ? 'var(--s4)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
      border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
      color: 'white', fontWeight: 700, fontSize: 14,
      fontFamily: 'DM Sans, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
      transition: 'all 0.2s',
    }}>
      {loading ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} /> Saving…</> : children}
    </button>
  );
}

/* ─── Difficulty Badge ───────────────────────────────────── */
function DiffBadge({ d }) {
  const map = {
    easy:   { color: '#34D399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
    medium: { color: '#FCD34D', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
    hard:   { color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  },
  };
  const c = map[d] || map.medium;
  return (
    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {d}
    </span>
  );
}

/* ─── Question Card ──────────────────────────────────────── */
function QuestionCard({ q, index, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isMCQ = q.question_type === 'mcq';
  const typeColor = isMCQ ? '#818CF8' : '#A78BFA';
  const typeBg    = isMCQ ? 'rgba(99,102,241,0.12)' : 'rgba(139,92,246,0.12)';
  const typeBorder= isMCQ ? 'rgba(99,102,241,0.25)' : 'rgba(139,92,246,0.25)';

  return (
    <div style={{
      background: 'var(--s3)', border: '1px solid var(--border-1)',
      borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-3)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-1)'}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded(p => !p)}>
        {/* Question number */}
        <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800, color: '#818CF8' }}>
          {index + 1}
        </div>
        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {q.question_text}
          </p>
          <div style={{ display: 'flex', gap: 7, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: typeColor, background: typeBg, border: `1px solid ${typeBorder}`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isMCQ ? 'MCQ' : 'Coding'}
            </span>
            <DiffBadge d={q.difficulty} />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ color: '#FCD34D', fontWeight: 700 }}>{q.marks}</span> {q.marks === 1 ? 'mark' : 'marks'}
            </span>
            {!isMCQ && q.supported_languages?.length > 0 && (
              <div style={{ display: 'flex', gap: 4 }}>
                {q.supported_languages.map(l => (
                  <span key={l} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--s4)', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{l}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onDelete(q); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 6, borderRadius: 7, transition: 'all 0.15s', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#FCA5A5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-1)' }}>
          {/* Problem statement for coding questions */}
          {!isMCQ && q.question_text && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-1)', background: 'rgba(139,92,246,0.04)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Problem Statement</p>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{q.question_text}</p>
            </div>
          )}

          <div style={{ padding: '14px 16px' }}>
            {isMCQ && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['a','b','c','d'].map(opt => {
                  const text = q[`option_${opt}`];
                  if (!text) return null;
                  const isCorrect = q.correct_option === opt;
                  return (
                    <div key={opt} style={{
                      padding: '9px 12px', borderRadius: 9,
                      background: isCorrect ? 'rgba(16,185,129,0.08)' : 'var(--s2)',
                      border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'var(--border-1)'}`,
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: isCorrect ? '#34D399' : 'var(--text-3)', textTransform: 'uppercase', flexShrink: 0, paddingTop: 1 }}>{opt}.</span>
                      <span style={{ fontSize: 13, color: isCorrect ? '#34D399' : 'var(--text-2)', lineHeight: 1.5 }}>{text}</span>
                      {isCorrect && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 'auto', marginTop: 2 }}><path d="M20 6L9 17l-5-5"/></svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!isMCQ && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Test cases header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Test Cases</span>
                  <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#A78BFA' }}>
                    {q.test_cases?.length || 0}
                  </span>
                  {q.test_cases?.some(tc => tc.is_hidden) && (
                    <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      {q.test_cases.filter(tc => tc.is_hidden).length} hidden
                    </span>
                  )}
                </div>

                {/* Test case rows */}
                {q.test_cases?.slice(0, 3).map((tc, i) => (
                  <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--s2)', borderBottom: '1px solid var(--border-1)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em' }}>CASE {i + 1}</span>
                      {tc.is_hidden && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#FCD34D', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          Hidden from candidate
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border-1)' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Input</div>
                        <pre style={{ margin: 0, fontSize: 12, color: 'var(--text-1)', background: 'var(--s1)', padding: '7px 10px', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', overflow: 'auto', lineHeight: 1.5 }}>{tc.input || '(empty)'}</pre>
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Expected Output</div>
                        <pre style={{ margin: 0, fontSize: 12, color: tc.is_hidden ? '#FCD34D' : '#34D399', background: tc.is_hidden ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)', padding: '7px 10px', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', overflow: 'auto', lineHeight: 1.5, border: `1px solid ${tc.is_hidden ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'}` }}>{tc.is_hidden ? '••••••' : tc.expected_output}</pre>
                      </div>
                    </div>
                  </div>
                ))}

                {q.test_cases?.length > 3 && (
                  <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: 'var(--s2)', border: '1px dashed var(--border-2)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>+ {q.test_cases.length - 3} more test case{q.test_cases.length - 3 !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const TestQuestions = () => {
  const { testId } = useParams();
  const navigate   = useNavigate();

  const [test, setTest]         = useState(null);
  const [questions, setQs]      = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const notify = (msg, type = 'success') => setToast({ msg, type });

  /* Panels */
  const [showMCQ,     setShowMCQ]     = useState(false);
  const [showCoding,  setShowCoding]  = useState(false);
  const [showSection, setShowSection] = useState(false);
  const [deleteQ,     setDeleteQ]     = useState(null);
  const [deleteS,     setDeleteS]     = useState(null);

  /* Language tab */
  const [langTab, setLangTab] = useState(null);

  /* Forms */
  const emptyMCQ = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', marks: 1, difficulty: 'medium', section_id: '' };
  const emptyCoding = { question_text: '', supported_languages: [], initial_codes: {}, test_cases: [{ input: '', expected_output: '', is_hidden: false }], marks: 5, difficulty: 'medium', section_id: '' };
  const emptySection = { title: '', description: '', questions_to_pick: '', time_limit_minutes: '' };

  const [mcqForm,  setMcq]  = useState(emptyMCQ);
  const [codingForm, setCoding] = useState(emptyCoding);
  const [sectionForm, setSecForm] = useState(emptySection);

  useEffect(() => { loadData(); }, [testId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, qRes, sRes] = await Promise.all([
        testApi.getTestById(testId),
        questionApi.getTestQuestions(testId),
        sectionApi.getSections(testId),
      ]);
      setTest(tRes.data.test);
      setQs(qRes.data.questions);
      setSections(sRes.data.sections || []);
    } catch { notify('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  /* Language toggles */
  const toggleLang = (lv) => {
    const active = codingForm.supported_languages.includes(lv);
    const langs = active ? codingForm.supported_languages.filter(l => l !== lv) : [...codingForm.supported_languages, lv];
    const codes = { ...codingForm.initial_codes };
    if (active) { delete codes[lv]; delete codes[`_driver_${lv}`]; }
    else {
      const def = LANGS.find(l => l.value === lv);
      codes[lv] = def.starter;
      codes[`_driver_${lv}`] = def.driver || '';
    }
    setCoding(p => ({ ...p, supported_languages: langs, initial_codes: codes }));
    if (!active && !langTab) setLangTab(lv);
    if (active && langTab === lv) setLangTab(langs[0] || null);
  };

  /* Handlers */
  const handleMCQ = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await questionApi.createMCQQuestion({ ...mcqForm, test_id: parseInt(testId), section_id: mcqForm.section_id ? parseInt(mcqForm.section_id) : null });
      notify('MCQ question added!');
      setShowMCQ(false); setMcq(emptyMCQ); loadData();
    } catch (err) { notify(err.response?.data?.message || 'Failed to add', 'error'); }
    finally { setSaving(false); }
  };

  const handleCoding = async (e) => {
    e.preventDefault();
    if (!codingForm.supported_languages.length) { notify('Select at least one language', 'error'); return; }
    setSaving(true);
    try {
      await questionApi.createCodingQuestion({ ...codingForm, test_id: parseInt(testId), section_id: codingForm.section_id ? parseInt(codingForm.section_id) : null });
      notify('Coding question added!');
      setShowCoding(false); setCoding(emptyCoding); setLangTab(null); loadData();
    } catch (err) { notify(err.response?.data?.message || 'Failed to add', 'error'); }
    finally { setSaving(false); }
  };

  const handleSection = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await sectionApi.createSection(testId, {
        title: sectionForm.title,
        description: sectionForm.description || undefined,
        questions_to_pick: sectionForm.questions_to_pick ? parseInt(sectionForm.questions_to_pick) : null,
        time_limit_minutes: sectionForm.time_limit_minutes ? parseInt(sectionForm.time_limit_minutes) : null,
      });
      notify('Section created!');
      setShowSection(false); setSecForm(emptySection); loadData();
    } catch (err) { notify(err.response?.data?.message || 'Failed to create section', 'error'); }
    finally { setSaving(false); }
  };

  const handleDeleteQ = async () => {
    try { await questionApi.deleteQuestion(deleteQ.question_id); notify('Question deleted'); setDeleteQ(null); loadData(); }
    catch { notify('Failed to delete', 'error'); }
  };

  const handleDeleteS = async () => {
    try { await sectionApi.deleteSection(deleteS.section_id); notify('Section deleted — questions are now unsectioned'); setDeleteS(null); loadData(); }
    catch { notify('Failed to delete section', 'error'); }
  };

  /* Grouping */
  const grouped = () => {
    if (!sections.length) return [{ section: null, qs: questions }];
    const g = sections.map(s => ({ section: s, qs: questions.filter(q => q.section_id === s.section_id) }));
    const unsec = questions.filter(q => !q.section_id);
    if (unsec.length) g.push({ section: null, qs: unsec });
    return g;
  };

  const mcqCount    = questions.filter(q => q.question_type === 'mcq').length;
  const codingCount = questions.filter(q => q.question_type === 'coding').length;
  const totalMarks  = questions.reduce((s, q) => s + q.marks, 0);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--s5)', borderTopColor: '#6366F1', animation: 'spin 0.9s linear infinite' }} />
    </div>
  );

  return (
    <RecruiterLayout
      title={test?.title || 'Test Questions'}
      subtitle="Manage questions and sections"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowSection(true)} style={{
            padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: 'var(--s3)', border: '1px solid var(--border-2)',
            color: 'var(--text-1)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Section
          </button>
          <button onClick={() => setShowMCQ(true)} style={{
            padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#818CF8', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}>
            + MCQ
          </button>
          <button onClick={() => setShowCoding(true)} style={{
            padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            border: 'none', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 0 16px rgba(99,102,241,0.3)',
          }}>
            + Coding
          </button>
        </div>
      }
    >
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes toastSlide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        textarea,input,select{color:var(--text-1) !important;}
        textarea::placeholder,input::placeholder{color:var(--text-3) !important;}
      `}</style>

      {/* ── Back link ── */}
      <button onClick={() => navigate('/recruiter/dashboard')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-3)', fontSize: 13, marginBottom: 20,
        padding: 0, transition: 'color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Dashboard
      </button>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Questions', val: questions.length, color: '#6366F1', top: '#6366F1' },
          { label: 'MCQ',             val: mcqCount,          color: '#818CF8', top: '#818CF8' },
          { label: 'Coding',          val: codingCount,        color: '#A78BFA', top: '#A78BFA' },
          { label: 'Total Marks',     val: totalMarks,         color: '#FCD34D', top: '#F59E0B' },
          { label: 'Sections',        val: sections.length,    color: '#34D399', top: '#10B981' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--s2)', border: '1px solid var(--border-1)',
            borderRadius: 14, padding: '16px 18px', borderTop: `2px solid ${s.top}`,
          }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Sections list ── */}
      {sections.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Sections</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sections.map((s, i) => {
              const sqCount = questions.filter(q => q.section_id === s.section_id).length;
              return (
                <div key={s.section_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: 10,
                  background: 'var(--s3)', border: '1px solid var(--border-1)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 800, color: '#818CF8' }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{s.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
                        {sqCount} question{sqCount !== 1 ? 's' : ''}
                        {s.questions_to_pick ? ` · picks ${s.questions_to_pick} randomly` : ''}
                        {s.time_limit_minutes ? ` · ${s.time_limit_minutes} min limit` : ''}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setDeleteS(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 6, borderRadius: 7, display: 'flex', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#FCA5A5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Questions list ── */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border-1)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-1)', background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Questions</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{questions.length} total</span>
        </div>

        {questions.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>📝</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>No questions yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Use the buttons above to add MCQ or Coding questions</p>
          </div>
        ) : (
          <div style={{ padding: '16px' }}>
            {grouped().map(({ section, qs }) => (
              <div key={section?.section_id ?? 'unsec'} style={{ marginBottom: 20 }}>
                {section && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ padding: '3px 12px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', fontSize: 11, fontWeight: 700, color: '#818CF8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {section.title}
                    </span>
                    {section.questions_to_pick && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>picks {section.questions_to_pick} of {qs.length} per candidate</span>}
                  </div>
                )}
                {sections.length > 0 && !section && qs.length > 0 && (
                  <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Unsectioned</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {qs.map((q, i) => (
                    <QuestionCard key={q.question_id} q={q} index={questions.indexOf(q)} onDelete={setDeleteQ} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MCQ Slide-Over ── */}
      <SlideOver open={showMCQ} onClose={() => { setShowMCQ(false); setMcq(emptyMCQ); }} title="Add MCQ Question" subtitle="Multiple choice with one correct answer">
        <form onSubmit={handleMCQ}>
          <FInput label="Question Text" type="textarea" rows={3} value={mcqForm.question_text} onChange={e => setMcq(p => ({ ...p, question_text: e.target.value }))} placeholder="Write your question here…" required />
          <SectionDivider label="Answer Options" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {['a','b','c','d'].map(opt => (
              <div key={opt} style={{
                padding: '12px 14px', borderRadius: 11,
                background: mcqForm.correct_option === opt ? 'rgba(99,102,241,0.08)' : 'var(--s3)',
                border: `1px solid ${mcqForm.correct_option === opt ? 'rgba(99,102,241,0.3)' : 'var(--border-1)'}`,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: mcqForm.correct_option === opt ? '#818CF8' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Option {opt.toUpperCase()}</span>
                  <button type="button" onClick={() => setMcq(p => ({ ...p, correct_option: opt }))} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20,
                    fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    background: mcqForm.correct_option === opt ? 'rgba(16,185,129,0.15)' : 'var(--s4)',
                    border: `1px solid ${mcqForm.correct_option === opt ? 'rgba(16,185,129,0.3)' : 'var(--border-1)'}`,
                    color: mcqForm.correct_option === opt ? '#34D399' : 'var(--text-3)',
                  }}>
                    {mcqForm.correct_option === opt ? '✓ Correct' : 'Set correct'}
                  </button>
                </div>
                <input
                  value={mcqForm[`option_${opt}`]}
                  onChange={e => setMcq(p => ({ ...p, [`option_${opt}`]: e.target.value }))}
                  placeholder={`Enter option ${opt.toUpperCase()}…`}
                  required
                  style={{
                    width: '100%', background: 'var(--s2)', border: '1px solid var(--border-2)',
                    borderRadius: 8, padding: '8px 10px', color: 'var(--text-1)', fontSize: 13.5,
                    outline: 'none', fontFamily: 'DM Sans, sans-serif',
                  }}
                />
              </div>
            ))}
          </div>
          <SectionDivider label="Settings" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <FInput label="Marks" type="number" value={mcqForm.marks} onChange={e => setMcq(p => ({ ...p, marks: parseInt(e.target.value) }))} min="1" required />
            <FSelect label="Difficulty" value={mcqForm.difficulty} onChange={e => setMcq(p => ({ ...p, difficulty: e.target.value }))}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </FSelect>
          </div>
          {sections.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <FSelect label="Section (optional)" value={mcqForm.section_id} onChange={e => setMcq(p => ({ ...p, section_id: e.target.value }))}>
                <option value="">— No section —</option>
                {sections.map(s => <option key={s.section_id} value={s.section_id}>{s.title}</option>)}
              </FSelect>
            </div>
          )}
          <SubmitBtn loading={saving}>+ Add MCQ Question</SubmitBtn>
        </form>
      </SlideOver>

      {/* ── Coding Slide-Over ── */}
      <SlideOver open={showCoding} onClose={() => { setShowCoding(false); setCoding(emptyCoding); setLangTab(null); }} title="Add Coding Question" subtitle="Multi-language problem with test cases">
        <form onSubmit={handleCoding}>
          <FInput label="Problem Statement" type="textarea" rows={4} value={codingForm.question_text} onChange={e => setCoding(p => ({ ...p, question_text: e.target.value }))} placeholder="Describe the coding problem clearly…" required />

          <SectionDivider label="Settings" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: sections.length ? 12 : 0 }}>
            <FInput label="Marks" type="number" value={codingForm.marks} onChange={e => setCoding(p => ({ ...p, marks: parseInt(e.target.value) }))} min="1" required />
            <FSelect label="Difficulty" value={codingForm.difficulty} onChange={e => setCoding(p => ({ ...p, difficulty: e.target.value }))}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </FSelect>
          </div>
          {sections.length > 0 && (
            <div style={{ marginBottom: 0 }}>
              <FSelect label="Section (optional)" value={codingForm.section_id} onChange={e => setCoding(p => ({ ...p, section_id: e.target.value }))}>
                <option value="">— No section —</option>
                {sections.map(s => <option key={s.section_id} value={s.section_id}>{s.title}</option>)}
              </FSelect>
            </div>
          )}

          <SectionDivider label="Supported Languages" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            {LANGS.map(lang => {
              const sel = codingForm.supported_languages.includes(lang.value);
              return (
                <button key={lang.value} type="button" onClick={() => toggleLang(lang.value)} style={{
                  padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  background: sel ? 'rgba(99,102,241,0.14)' : 'var(--s3)',
                  border: `1px solid ${sel ? 'rgba(99,102,241,0.35)' : 'var(--border-1)'}`,
                  transition: 'all 0.15s',
                  boxShadow: sel ? '0 0 10px rgba(99,102,241,0.2)' : 'none',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{lang.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: sel ? '#818CF8' : 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{lang.mono}</div>
                </button>
              );
            })}
          </div>

          {/* Code editor area */}
          {codingForm.supported_languages.length > 0 && (
            <div>
              {/* Language tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--border-1)', paddingBottom: 0 }}>
                {codingForm.supported_languages.map(lv => {
                  const def = LANGS.find(l => l.value === lv);
                  const active = langTab === lv;
                  return (
                    <button key={lv} type="button" onClick={() => setLangTab(lv)} style={{
                      padding: '7px 14px', borderRadius: '8px 8px 0 0', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: active ? 'var(--s3)' : 'transparent',
                      border: active ? '1px solid var(--border-2)' : '1px solid transparent',
                      borderBottom: active ? '1px solid var(--s3)' : 'none',
                      color: active ? '#818CF8' : 'var(--text-3)',
                      fontFamily: 'JetBrains Mono, monospace',
                      marginBottom: active ? -1 : 0,
                    }}>
                      {def?.icon} {def?.mono}
                    </button>
                  );
                })}
              </div>

              {langTab && (() => {
                const def = LANGS.find(l => l.value === langTab);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Starter code */}
                    <div style={{ border: '1px solid var(--border-1)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', background: 'var(--s1)', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
                          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4, fontFamily: 'JetBrains Mono, monospace' }}>template — shown to candidate</span>
                        </div>
                        <button type="button" onClick={() => setCoding(p => ({ ...p, initial_codes: { ...p.initial_codes, [langTab]: def.starter } }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#818CF8', padding: '2px 6px' }}>
                          Reset
                        </button>
                      </div>
                      <textarea
                        value={codingForm.initial_codes[langTab] || ''}
                        onChange={e => setCoding(p => ({ ...p, initial_codes: { ...p.initial_codes, [langTab]: e.target.value } }))}
                        rows={8}
                        style={{ width: '100%', background: 'var(--s0)', border: 'none', color: 'var(--text-1)', padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, outline: 'none', resize: 'vertical', lineHeight: 1.65 }}
                      />
                    </div>

                    {/* Driver code (if applicable) */}
                    {def.driver !== undefined && (
                      <div style={{ border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>driver — hidden (calls function, prints result)</span>
                          <button type="button" onClick={() => setCoding(p => ({ ...p, initial_codes: { ...p.initial_codes, [`_driver_${langTab}`]: def.driver } }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#F59E0B', padding: '2px 6px' }}>
                            Reset
                          </button>
                        </div>
                        <textarea
                          value={codingForm.initial_codes[`_driver_${langTab}`] || ''}
                          onChange={e => setCoding(p => ({ ...p, initial_codes: { ...p.initial_codes, [`_driver_${langTab}`]: e.target.value } }))}
                          rows={7}
                          style={{ width: '100%', background: 'rgba(245,158,11,0.03)', border: 'none', color: '#FCD34D', padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, outline: 'none', resize: 'vertical', lineHeight: 1.65 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <SectionDivider label="Test Cases" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {codingForm.test_cases.map((tc, i) => (
              <div key={i} style={{ background: 'var(--s3)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', fontFamily: 'Syne, sans-serif' }}>Test {i + 1}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-3)' }}>
                      <div onClick={() => { const t = [...codingForm.test_cases]; t[i].is_hidden = !t[i].is_hidden; setCoding(p => ({ ...p, test_cases: t })); }}
                        style={{ width: 16, height: 16, borderRadius: 4, background: tc.is_hidden ? 'var(--brand)' : 'var(--s5)', border: `1px solid ${tc.is_hidden ? 'transparent' : 'var(--border-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                        {tc.is_hidden && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                      Hidden
                    </label>
                    {codingForm.test_cases.length > 1 && (
                      <button type="button" onClick={() => setCoding(p => ({ ...p, test_cases: p.test_cases.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, padding: 0, transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#FCA5A5'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>Remove</button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Input</label>
                    <textarea value={tc.input} rows={2} onChange={e => { const t = [...codingForm.test_cases]; t[i].input = e.target.value; setCoding(p => ({ ...p, test_cases: t })); }} placeholder="e.g. [1,2,3]" required
                      style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '7px 10px', color: 'var(--text-1)', fontSize: 12.5, outline: 'none', fontFamily: 'JetBrains Mono, monospace', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Expected Output</label>
                    <textarea value={tc.expected_output} rows={2} onChange={e => { const t = [...codingForm.test_cases]; t[i].expected_output = e.target.value; setCoding(p => ({ ...p, test_cases: t })); }} placeholder="e.g. 6" required
                      style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '7px 10px', color: 'var(--text-1)', fontSize: 12.5, outline: 'none', fontFamily: 'JetBrains Mono, monospace', resize: 'vertical' }} />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setCoding(p => ({ ...p, test_cases: [...p.test_cases, { input: '', expected_output: '', is_hidden: false }] }))}
              style={{ padding: '10px', borderRadius: 10, background: 'var(--s3)', border: '1px dashed var(--border-2)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = '#818CF8'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)'; }}>
              + Add Test Case
            </button>
          </div>

          <SubmitBtn loading={saving}>+ Add Coding Question</SubmitBtn>
        </form>
      </SlideOver>

      {/* ── Section Slide-Over ── */}
      <SlideOver open={showSection} onClose={() => { setShowSection(false); setSecForm(emptySection); }} title="Add Section" subtitle="Group questions into named sections">
        <form onSubmit={handleSection}>
          <FInput label="Section Title" value={sectionForm.title} onChange={e => setSecForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Data Structures, SQL, Aptitude" required />
          <div style={{ marginTop: 16 }}>
            <FInput label="Description (optional)" type="textarea" rows={2} value={sectionForm.description} onChange={e => setSecForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description shown to candidates…" />
          </div>
          <SectionDivider label="Optional Settings" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FInput label="Questions per candidate" type="number" value={sectionForm.questions_to_pick} onChange={e => setSecForm(p => ({ ...p, questions_to_pick: e.target.value }))} placeholder="Blank = all" min="1" />
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>Leave blank to show all questions</p>
            </div>
            <div>
              <FInput label="Time limit (minutes)" type="number" value={sectionForm.time_limit_minutes} onChange={e => setSecForm(p => ({ ...p, time_limit_minutes: e.target.value }))} placeholder="Blank = no limit" min="1" />
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>Leave blank to use overall timer</p>
            </div>
          </div>
          <div style={{ marginTop: 28 }}>
            <SubmitBtn loading={saving}>Create Section</SubmitBtn>
          </div>
        </form>
      </SlideOver>

      {/* ── Delete dialogs ── */}
      {deleteQ && <DeleteDialog title="Delete Question" message={`Delete "${deleteQ.question_text.slice(0, 60)}…"? All answers will also be removed. This cannot be undone.`} onConfirm={handleDeleteQ} onClose={() => setDeleteQ(null)} />}
      {deleteS && <DeleteDialog title="Delete Section" message={`Delete section "${deleteS.title}"? Its questions will remain but become unsectioned.`} onConfirm={handleDeleteS} onClose={() => setDeleteS(null)} />}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </RecruiterLayout>
  );
};

export default TestQuestions;