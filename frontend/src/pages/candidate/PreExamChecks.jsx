/**
 * PreExamChecks.jsx
 * Route: /candidate/tests/:testId/pre-exam
 * Full-screen focused wizard — split layout with live step tracker.
 * Steps are dynamically filtered based on requirements — optional steps
 * (webcam, second_cam, location) are completely hidden when not required.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as examApi from '../../api/examApi';
import { useSocket } from '../../context/SocketContext';
import { useDistanceCheck } from '../../hooks/useDistanceCheck';
import { useWebRTCReceiver } from '../../hooks/useWebRTCReceiver';

/* ─── Step Config ────────────────────────────────────────── */
const STEPS = [
  { id: 1, key: 'instructions', label: 'Instructions',   icon: '📋' },
  { id: 2, key: 'system',       label: 'System Check',   icon: '💻' },
  { id: 3, key: 'webcam',       label: 'Webcam',         icon: '🎥' },
  { id: 4, key: 'second_cam',   label: '2nd Camera',     icon: '📱' },
  { id: 5, key: 'location',     label: 'Location',       icon: '📍' },
  { id: 6, key: 'ready',        label: 'Ready',          icon: '🚀' },
];

/* ─── Helpers ────────────────────────────────────────────── */
function CheckRow({ ok, label, sub, loading = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 12,
      background: ok ? 'rgba(16,185,129,0.06)' : loading ? 'rgba(99,102,241,0.06)' : 'rgba(239,68,68,0.06)',
      border: `1px solid ${ok ? 'rgba(16,185,129,0.2)' : loading ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)'}`,
      transition: 'all 0.3s',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: ok ? 'rgba(16,185,129,0.12)' : loading ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {loading
          ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366F1', animation: 'spin 0.8s linear infinite' }} />
          : ok
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        }
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: ok ? '#34D399' : loading ? '#818CF8' : '#FCA5A5' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled, loading, variant = 'primary', size = 'md' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 11, fontWeight: 700, cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
    opacity: disabled ? 0.45 : 1,
    padding: size === 'lg' ? '14px 32px' : size === 'sm' ? '8px 16px' : '11px 24px',
    fontSize: size === 'lg' ? 15 : size === 'sm' ? 13 : 14,
  };
  const styles = {
    primary: { background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' },
    secondary: { background: 'var(--s3)', color: 'var(--text-1)', border: '1px solid var(--border-2)' },
    success: { background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' },
    ghost: { background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border-2)' },
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{ ...base, ...styles[variant] }}
      onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
    >
      {loading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />}
      {children}
    </button>
  );
}

function InfoPill({ label, value, color = 'var(--text-1)' }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--border-1)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'Syne, sans-serif' }}>{value}</div>
    </div>
  );
}

/* ─── Step: Instructions ─────────────────────────────────── */
function StepInstructions({ test, agreed, setAgreed }) {
  const rules = [
    test.enable_webcam            && { icon: '🎥', text: 'Keep your webcam on throughout the entire test.' },
    test.enable_tab_monitoring    && { icon: '🔒', text: `Do not switch tabs or windows. Max ${test.max_tab_switches} violations allowed before auto-submit.` },
    test.enable_location_tracking && { icon: '📍', text: 'Stay within the allowed location boundary.' },
    { icon: '📋', text: 'Answer every question before submitting. You cannot return after submission.' },
    { icon: '🚫', text: 'No copy-paste from external sources. Clipboard is monitored.' },
    { icon: '🌐', text: 'Ensure a stable internet connection throughout the test.' },
    { icon: '⏱️', text: `Your timer starts immediately when you click "Start Test". You have ${test.duration_minutes} minutes.` },
  ].filter(Boolean);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
        <InfoPill label="Duration"  value={`${test.duration_minutes} min`} color="#818CF8" />
        <InfoPill label="Questions" value={test.question_count ?? 0}       color="#34D399" />
        <InfoPill label="Marks"     value={test.total_marks ?? 0}          color="#FCD34D" />
        <InfoPill label="Pass Mark" value={`${test.passing_percentage ?? 40}%`} color="#F9A8D4" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Test Rules
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '11px 14px', borderRadius: 10,
              background: 'var(--s3)', border: '1px solid var(--border-1)',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
              <span style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{r.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)',
        marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
        <p style={{ fontSize: 13, color: '#FCD34D', lineHeight: 1.55 }}>
          Any suspicious activity is logged and may result in test disqualification.
          All actions are monitored in real-time by the recruiter.
        </p>
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
        <div onClick={() => setAgreed(p => !p)} style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
          background: agreed ? 'var(--brand)' : 'var(--s4)',
          border: `1px solid ${agreed ? 'transparent' : 'var(--border-2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', cursor: 'pointer',
          boxShadow: agreed ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
        }}>
          {agreed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
        </div>
        <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          I have read and understood all the test instructions and rules.
          I agree to follow them during the test and accept that violations may lead to disqualification.
        </span>
      </label>
    </div>
  );
}

/* ─── Step: System ───────────────────────────────────────── */
function StepSystem({ systemCheck }) {
  const checks = [
    { ok: systemCheck.browser,  label: 'Browser Compatibility', sub: systemCheck.browser ? 'Camera, Geolocation & MediaDevices APIs detected' : 'Your browser lacks required APIs — use Chrome or Firefox' },
    { ok: systemCheck.internet, label: 'Internet Connection',   sub: systemCheck.internet ? 'Connected to the internet' : 'No internet connection detected — check your network' },
    { ok: true,                 label: 'JavaScript Enabled',    sub: 'JS runtime is active' },
    { ok: window.innerWidth >= 768, label: 'Screen Resolution', sub: window.innerWidth >= 768 ? `${window.innerWidth} × ${window.innerHeight}px — Good` : 'Screen too narrow — use a larger device' },
  ];
  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
        Running compatibility checks on your device. All checks must pass to proceed.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {checks.map((c, i) => <CheckRow key={i} {...c} />)}
      </div>
      {systemCheck.browser && systemCheck.internet && (
        <div style={{
          marginTop: 20, padding: '14px 16px', borderRadius: 12,
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontSize: 14, color: '#34D399', fontWeight: 600 }}>All system checks passed! Your device is ready.</span>
        </div>
      )}
    </div>
  );
}

/* ─── Step: Webcam ───────────────────────────────────────── */
function StepWebcam({ webcamCheck, videoRef, onStart, onVerify, checking, distanceStatus, distanceScore }) {
  return (
    <div>
      {!webcamCheck.permission ? (
        <div style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: 96, height: 96, borderRadius: 24, margin: '0 auto 24px',
            background: 'rgba(99,102,241,0.1)', border: '2px dashed rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
          }}>🎥</div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, color: 'var(--text-1)', marginBottom: 10 }}>Enable Camera Access</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 28, lineHeight: 1.6, maxWidth: 380, margin: '0 auto 28px' }}>
            We need access to your webcam for proctoring. Your video feed is used only during the exam.
          </p>
          <Btn onClick={onStart} loading={checking} variant="primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            Grant Camera Access
          </Btn>
        </div>
      ) : (
        <div>
          {/* Video preview */}
          <div style={{
            position: 'relative', borderRadius: 16, overflow: 'hidden',
            background: '#000', marginBottom: 16,
            border: `2px solid ${webcamCheck.verified ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.3)'}`,
            boxShadow: webcamCheck.verified ? '0 0 24px rgba(16,185,129,0.15)' : '0 0 24px rgba(99,102,241,0.1)',
            transition: 'all 0.4s',
          }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }}
            />
            {/* Overlay frame */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {/* Corner brackets */}
              {[
                { top: 12, left: 12, borderTop: '2px solid', borderLeft: '2px solid' },
                { top: 12, right: 12, borderTop: '2px solid', borderRight: '2px solid' },
                { bottom: 12, left: 12, borderBottom: '2px solid', borderLeft: '2px solid' },
                { bottom: 12, right: 12, borderBottom: '2px solid', borderRight: '2px solid' },
              ].map((s, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 24, height: 24,
                  borderColor: webcamCheck.verified ? 'rgba(16,185,129,0.7)' : 'rgba(99,102,241,0.7)',
                  ...s,
                }} />
              ))}
              {/* Live indicator */}
              <div style={{
                position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', animation: 'glowPulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: '0.06em' }}>LIVE</span>
              </div>
              {/* Verified overlay */}
              {webcamCheck.verified && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '10px 14px', background: 'rgba(16,185,129,0.85)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Camera verified — you look great! 👤</span>
                </div>
              )}
            </div>
          </div>
          {/* Distance meter — shown once camera is live */}
          {webcamCheck.permission && !webcamCheck.verified && (
            <div style={{ marginBottom: 16 }}>
              {/* Status label */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Distance Check
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: distanceStatus === 'ok' ? '#34D399' : distanceStatus === 'loading' ? '#818CF8' : '#FCA5A5',
                }}>
                  {distanceStatus === 'ok'        && '✓ Perfect distance'}
                  {distanceStatus === 'too_far'   && '↔ Move closer'}
                  {distanceStatus === 'too_close' && '↔ Move back'}
                  {distanceStatus === 'no_face'   && '👤 Face not detected'}
                  {distanceStatus === 'loading'   && 'Analysing…'}
                </span>
              </div>
              {/* Bar */}
              <div style={{ height: 8, background: 'var(--s4)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${distanceScore ?? 0}%`,
                  background: distanceStatus === 'ok'
                    ? 'linear-gradient(90deg,#10B981,#34D399)'
                    : 'linear-gradient(90deg,#6366F1,#8B5CF6)',
                  transition: 'width 0.5s ease, background 0.4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Too far</span>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Too close</span>
              </div>
            </div>
          )}
          {!webcamCheck.verified && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 14 }}>
                Can you see yourself clearly in the preview above?
              </p>
              <Btn onClick={onVerify} variant="success" disabled={distanceStatus !== 'ok'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Yes, Verify My Camera
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Step: Second Camera ────────────────────────────────── */
function StepSecondCam({
  qrData, qrLoading, connected,
  cam2DistanceOk, cam2FrameConfirmed, remoteVideoRef,
  onFrameConfirm, onGenerate,
}) {
  return (
    <div>

      {/* ── Placement diagram ─────────────────────────────── */}
      <div style={{
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
        borderRadius: 14, padding: '16px', marginBottom: 20,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          📐 Required Camera Position
        </p>
        {/* SVG diagram */}
        <svg viewBox="0 0 320 160" style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto 12px' }}>
          {/* Desk */}
          <rect x="40" y="100" width="240" height="10" rx="3" fill="#374151"/>
          {/* Laptop */}
          <rect x="100" y="60" width="90" height="40" rx="4" fill="#1F2937" stroke="#6366F1" strokeWidth="1.5"/>
          <rect x="90" y="98" width="110" height="4" rx="2" fill="#374151"/>
          <text x="145" y="85" textAnchor="middle" fontSize="9" fill="#818CF8">💻</text>
          {/* Candidate */}
          <circle cx="145" cy="45" r="14" fill="#1F2937" stroke="#6366F1" strokeWidth="1.5"/>
          <text x="145" y="50" textAnchor="middle" fontSize="12">👤</text>
          {/* Phone position */}
          <rect x="248" y="72" width="16" height="28" rx="3" fill="#10B981" opacity="0.9"/>
          <text x="256" y="88" textAnchor="middle" fontSize="8" fill="white">📱</text>
          {/* Angle arrow */}
          <line x1="248" y1="86" x2="180" y2="75" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arr)"/>
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#10B981"/>
            </marker>
          </defs>
          {/* Labels */}
          <text x="264" y="68" fontSize="8" fill="#34D399">Phone here</text>
          <text x="264" y="78" fontSize="7" fill="#6EE7B7">45° angle</text>
          {/* Field of view cone */}
          <path d="M256,86 L90,50 L90,110 Z" fill="rgba(16,185,129,0.07)" stroke="rgba(16,185,129,0.2)" strokeWidth="1"/>
          <text x="130" y="130" textAnchor="middle" fontSize="8" fill="#9CA3AF">Camera 2 field of view</text>
        </svg>

        {/* Placement instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Place phone to your right or left side — not directly behind',
            'Prop it up at desk height angled 45° toward you',
            'Your face, hands, desk surface and laptop must all be visible',
            'Avoid pointing at a bright window or light source',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: '#34D399', fontSize: 12, marginTop: 1, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Steps ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {[
          'Position your phone as shown above first',
          'Click "Generate QR Code" and scan it with your phone',
          'Allow camera permission on your phone browser',
          'Adjust until distance check shows ✓ Good position',
          'Confirm the frame looks correct to proceed',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 800, color: '#818CF8',
            }}>{i + 1}</div>
            <span style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, paddingTop: 3 }}>{step}</span>
          </div>
        ))}
      </div>

      {/* ── QR section ────────────────────────────────────── */}
      <div style={{ textAlign: 'center' }}>
        {!qrData ? (
          <Btn onClick={onGenerate} loading={qrLoading} variant="primary">
            📱 Generate QR Code
          </Btn>
        ) : (
          <div>
            <div style={{
              display: 'inline-block', padding: 16, borderRadius: 16,
              background: 'white', boxShadow: 'var(--shadow-lg)', marginBottom: 16,
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData.mobileUrl)}&bgcolor=ffffff&color=0a0a1a`}
                alt="QR Code"
                style={{ width: 180, height: 180, display: 'block', borderRadius: 8 }}
              />
            </div>

            {/* Connection status */}
            <div style={{ marginBottom: 12 }}>
              {connected ? (
                <div style={{
                  padding: '10px 16px', borderRadius: 12,
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'glowPulse 1.5s ease-in-out infinite', display: 'inline-block' }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#34D399' }}>📱 Phone connected</span>
                </div>
              ) : (
                <div style={{
                  padding: '10px 16px', borderRadius: 12,
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#F59E0B', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 13.5, color: '#FCD34D' }}>Waiting for phone to connect…</span>
                </div>
              )}
            </div>

            {/* Distance status — shown once connected */}
            {connected && (
              <div style={{
                marginBottom: 12, padding: '10px 16px', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: cam2DistanceOk ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${cam2DistanceOk ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.2)'}`,
              }}>
                <span style={{ fontSize: 14 }}>{cam2DistanceOk ? '✅' : '📐'}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: cam2DistanceOk ? '#34D399' : '#FCD34D' }}>
                  {cam2DistanceOk
                    ? 'Distance check passed'
                    : 'Adjust phone position — check the distance meter on your phone'}
                </span>
              </div>
            )}

            {/* Frame confirmation — shown only once both connected + distance ok */}
            {connected && (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    📷 Live Room View
                  </span>
                  <span style={{ fontSize: 11, color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', display: 'inline-block', animation: 'glowPulse 1.5s ease-in-out infinite' }}/>
                    Live
                  </span>
                </div>
                <div style={{
                  borderRadius: 12, overflow: 'hidden',
                  border: `2px solid ${cam2DistanceOk ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.3)'}`,
                  background: '#000', position: 'relative',
                }}>
                  <video
                    ref={remoteVideoRef}
                    autoPlay playsInline muted
                    style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'cover' }}
                  />
                  {!cam2DistanceOk && (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.45)',
                    }}>
                      <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#FCD34D' }}>📐 Adjust phone position</span>
                      </div>
                    </div>
                  )}
                  {cam2DistanceOk && (
                    <div style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399' }}>✓ Good position</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
                  Make sure your face, hands, desk and laptop are all visible in this view
                </p>
              </div>
            )}

            {/* Frame confirmation — shown only once both connected + distance ok */}
            {connected && cam2DistanceOk && !cam2FrameConfirmed && (
              <div style={{
                margin: '4px 0 12px',
                padding: '16px', borderRadius: 14,
                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <p style={{ fontSize: 13.5, color: 'var(--text-1)', fontWeight: 600, marginBottom: 8 }}>
                  📷 Does your phone camera show all of the following?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14, textAlign: 'left' }}>
                  {['Your face and upper body', 'Your desk surface', 'Your laptop screen', 'Room background'].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#818CF8', fontSize: 12 }}>□</span>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{item}</span>
                    </div>
                  ))}
                </div>
                <Btn onClick={onFrameConfirm} variant="success">
                  ✓ Yes, frame looks correct
                </Btn>
              </div>
            )}

            {/* Confirmed state */}
            {connected && cam2DistanceOk && cam2FrameConfirmed && (
              <div style={{
                marginBottom: 12, padding: '10px 16px', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
              }}>
                <span style={{ fontSize: 14 }}>✅</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#34D399' }}>
                  Camera 2 fully verified — you can proceed
                </span>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <button onClick={onGenerate} disabled={qrLoading} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'var(--brand-light)', textDecoration: 'underline',
              }}>
                🔄 Regenerate QR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Step: Location ─────────────────────────────────────── */
function StepLocation({ locationCheck, onStart }) {
  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.6 }}>
        This test requires you to be within the allowed geographic boundary.
        We'll use your device's GPS to verify your location.
      </p>

      {!locationCheck.permission && !locationCheck.checking && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: '0 auto 20px',
            background: 'rgba(99,102,241,0.1)', border: '2px dashed rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
          }}>📍</div>
          <Btn onClick={onStart} variant="primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Verify My Location
          </Btn>
        </div>
      )}

      {locationCheck.checking && (
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
            border: '3px solid var(--s5)', borderTopColor: '#6366F1',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Fetching your GPS coordinates…</p>
        </div>
      )}

      {locationCheck.permission && !locationCheck.checking && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {locationCheck.verified ? (
            <>
              <div style={{
                padding: '16px 18px', borderRadius: 14,
                background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.22)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#34D399', marginBottom: 4 }}>Location verified ✓</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {locationCheck.latitude?.toFixed(6)}, {locationCheck.longitude?.toFixed(6)}
                  </div>
                </div>
              </div>
              <div style={{
                padding: '12px 16px', borderRadius: 12,
                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                fontSize: 12.5, color: '#A5B4FC',
              }}>
                You are within the allowed radius. Your location will be re-verified at exam start.
              </div>
            </>
          ) : (
            <>
              <div style={{
                padding: '16px 18px', borderRadius: 14,
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(239,68,68,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>⚠️</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#FCA5A5', marginBottom: 4 }}>Location verification failed</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>You may be outside the allowed area. Contact the recruiter if this is incorrect.</div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Btn onClick={onStart} variant="ghost" size="sm">🔄 Try Again</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Step: Ready ────────────────────────────────────────── */
function StepReady({ test, requirements, webcamCheck, secondCameraCheck, locationCheck, onStart, starting }) {
  const completed = [
    { label: 'Instructions read & agreed',      done: true },
    { label: 'System compatibility checked',     done: true },
    requirements?.webcam_required          && { label: 'Webcam verified',               done: webcamCheck.verified },
    requirements?.second_camera_required   && { label: 'Secondary camera connected',    done: secondCameraCheck.verified },
    requirements?.location_required        && { label: 'Location verified',              done: locationCheck.verified },
  ].filter(Boolean);

  return (
    <div>
      {/* Completion list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {completed.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
            background: item.done ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${item.done ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: item.done ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.done
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: item.done ? '#34D399' : '#FCA5A5' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Final reminders */}
      <div style={{
        padding: '14px 16px', borderRadius: 12, marginBottom: 28,
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)',
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
          Final Reminders
        </p>
        {[
          'The countdown timer starts the moment you click Start Test',
          'Do not close, refresh, or navigate away from the exam tab',
          'Keep a stable internet connection for the full duration',
        ].map((r, i) => (
          <div key={i} style={{ fontSize: 13, color: '#FCD34D', marginBottom: 5, display: 'flex', gap: 8 }}>
            <span style={{ flexShrink: 0 }}>•</span>{r}
          </div>
        ))}
      </div>

      <Btn onClick={onStart} loading={starting} variant="success" size="lg">
        🚀 Start Test Now
      </Btn>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const PreExamChecks = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [loading, setLoading]       = useState(true);
  const [test, setTest]             = useState(null);
  const [requirements, setReqs]     = useState(null);
  const [currentStepIndex, setStepIndex] = useState(0); // index into visibleSteps
  const [error, setError]           = useState('');
  const [starting, setStarting]     = useState(false);
  const [agreed, setAgreed]         = useState(false);

  const [systemCheck,  setSystemCheck]  = useState({ browser: false, internet: false });
  const [webcamCheck,  setWebcamCheck]  = useState({ permission: false, verified: false, checking: false });
  const [locationCheck, setLocCheck]    = useState({ permission: false, verified: false, checking: false, latitude: null, longitude: null });
  const [secondCamCheck, setSecCam]     = useState({ verified: false });
  const [qrData, setQrData]            = useState(null);
  const [qrLoading, setQrLoading]      = useState(false);
  const [secondCamConnected, setSecConnected] = useState(false);
  

  const [cam2DistanceOk, setCam2DistanceOk] = useState(false);
  const [cam2FrameConfirmed, setCam2FrameConfirmed] = useState(false);
  const remoteVideoRef = useRef(null);

  const { socket, on, off } = useSocket();

  /* ── Compute visible steps from requirements ── */
  const visibleSteps = STEPS.filter(s => {
    if (s.key === 'webcam'     && requirements && !requirements.webcam_required)        return false;
    if (s.key === 'second_cam' && requirements && !requirements.second_camera_required) return false;
    if (s.key === 'location'   && requirements && !requirements.location_required)      return false;
    return true;
  });

  const totalSteps  = visibleSteps.length;
  const currentStep = visibleSteps[currentStepIndex]; // { id, key, label, icon }
  const currentKey  = currentStep?.key;
  const isLastStep  = currentStepIndex === totalSteps - 1;

   // AI distance check for Camera 1 — runs while the webcam step is active
  const cam1Distance = useDistanceCheck({
    videoRef,
    camera:    'cam1',
    enabled:   currentKey === 'webcam' && webcamCheck.permission,
    intervalMs: 800,
  });

  // WebRTC — receive Camera 2 live stream during pre-exam positioning
  useWebRTCReceiver({
    socket,
    enabled: currentKey === 'second_cam' && secondCamConnected,
    onStream: (stream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    },
    onDisconnect: () => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await examApi.verifyRequirements(testId);
        setTest(res.data.test);
        setReqs(res.data.requirements);
        setSystemCheck({
          browser: !!(navigator.mediaDevices?.getUserMedia && navigator.geolocation),
          internet: navigator.onLine,
        });
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load test');
      } finally {
        setLoading(false);
      }
    })();
    return () => { stopWebcam(); };
  }, [testId]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [webcamCheck.permission]);

  useEffect(() => {
    if (!socket) return;

    // existing cam2 connection handler
    const handleStatus = (data) => {
      if (data.status === 'connected') {
        setSecConnected(true);
        setSecCam({ verified: true });
        examApi.verifySecondCamera(testId, true).catch(() => {});
      } else {
        setSecConnected(false);
        setSecCam({ verified: false });
        setCam2DistanceOk(false);   // reset distance when cam disconnects
      }
    };

    // NEW — cam2 distance relay from phone
    const handleCam2Distance = (data) => {
        setCam2DistanceOk(data.status === 'ok');
      };

      on('secondary_camera_status',    handleStatus);
      on('mobile_cam_distance_status', handleCam2Distance);

      return () => {
        off('secondary_camera_status',    handleStatus);
        off('mobile_cam_distance_status', handleCam2Distance);
      };
    }, [socket]);

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startWebcam = async () => {
    setWebcamCheck(p => ({ ...p, checking: true }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setWebcamCheck({ permission: true, verified: false, checking: false });
    } catch {
      setWebcamCheck({ permission: false, verified: false, checking: false });
      setError('Could not access webcam. Please grant camera permission and try again.');
    }
  };

  const verifyWebcam = async () => {
    try {
      await examApi.verifyWebcam(testId, true);
      setWebcamCheck(p => ({ ...p, verified: true }));
    } catch { setError('Failed to verify webcam. Please try again.'); }
  };

  const startLocation = () => {
    setLocCheck(p => ({ ...p, checking: true }));
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          await examApi.verifyLocation(testId, latitude, longitude);
          setLocCheck({ permission: true, verified: true, checking: false, latitude, longitude });
        } catch (e) {
          setLocCheck({ permission: true, verified: false, checking: false, latitude, longitude });
          setError(e.response?.data?.message || 'Location outside allowed area.');
        }
      },
      () => {
        setLocCheck(p => ({ ...p, checking: false, permission: false }));
        setError('Could not get location. Please enable GPS and allow location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const generateQR = async () => {
    setQrLoading(true); setQrData(null);
    try {
      const res = await examApi.getMobileCameraToken(testId);
      setQrData(res.data);
    } catch { setError('Failed to generate QR code.'); }
    finally { setQrLoading(false); }
  };

  /* canNext — keyed off currentKey, only called for steps that ARE visible */
  const canNext = () => {
    if (currentKey === 'instructions') return agreed;
    if (currentKey === 'system')       return systemCheck.browser && systemCheck.internet;
    if (currentKey === 'webcam')     return webcamCheck.verified && cam1Distance.status === 'ok';
    if (currentKey === 'second_cam') return secondCamCheck.verified && cam2DistanceOk && cam2FrameConfirmed;
    if (currentKey === 'location')     return locationCheck.verified;
    return true;
  };

  const goNext = () => {
    if (canNext()) {
      setStepIndex(p => Math.min(totalSteps - 1, p + 1));
      setError('');
    } else {
      setError('Please complete this step before continuing.');
    }
  };

  const goBack = () => {
    setStepIndex(p => Math.max(0, p - 1));
    setError('');
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await examApi.startTest(testId);
      navigate(`/candidate/tests/${testId}/exam`, { state: res.data.data });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to start test. Try again.');
      setStarting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--s5)', borderTopColor: '#6366F1', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Loading requirements…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!test) return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-2)' }}>
        <p style={{ fontSize: 16, marginBottom: 16 }}>Test not found.</p>
        <Btn onClick={() => navigate('/candidate/dashboard')} variant="ghost">← Back to Dashboard</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glowPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Top nav bar ── */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 28px',
        background: 'var(--topbar-bg)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-1)',
        position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{test.test_title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Pre-Exam Verification</div>
          </div>
        </div>
        <button onClick={() => navigate('/candidate/dashboard')} style={{
          background: 'none', border: '1px solid var(--border-2)',
          borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
          color: 'var(--text-3)', fontSize: 12, transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          ← Dashboard
        </button>
      </div>

      {/* ── Body: sidebar + content ── */}
      <div style={{ flex: 1, display: 'flex', maxWidth: 1100, margin: '0 auto', width: '100%', padding: '32px 24px', gap: 32 }}>

        {/* ── Left: step tracker ── */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{
            background: 'var(--s2)', border: '1px solid var(--border-1)',
            borderRadius: 18, padding: '24px 20px', position: 'sticky', top: 88,
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
              Progress {currentStepIndex + 1}/{totalSteps}
            </p>
            {/* Progress bar */}
            <div style={{ height: 4, background: 'var(--s4)', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, #10B981, #6366F1)',
                width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                transition: 'width 0.4s var(--ease-spring)',
              }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {visibleSteps.map((step, i) => {
                const done   = i < currentStepIndex;
                const active = i === currentStepIndex;
                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(99,102,241,0.15)' : 'var(--s3)',
                        border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : active ? 'rgba(99,102,241,0.3)' : 'var(--border-1)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s',
                        boxShadow: active ? '0 0 12px rgba(99,102,241,0.25)' : 'none',
                      }}>
                        {done
                          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                          : <span style={{ fontSize: 12 }}>{step.icon}</span>
                        }
                      </div>
                      {i < visibleSteps.length - 1 && (
                        <div style={{
                          width: 1, height: 20, marginTop: 2,
                          background: done ? 'rgba(16,185,129,0.3)' : 'var(--border-1)',
                          transition: 'background 0.3s',
                        }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: i < visibleSteps.length - 1 ? 20 : 0 }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: active ? 700 : 500,
                        color: done ? '#34D399' : active ? '#818CF8' : 'var(--text-3)',
                        transition: 'color 0.3s',
                      }}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Test info */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '⏱️', label: `${test.duration_minutes} min` },
                  { icon: '📝', label: `${test.question_count ?? 0} questions` },
                  { icon: '🎯', label: `${test.passing_percentage ?? 40}% to pass` },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-3)', alignItems: 'center' }}>
                    <span>{m.icon}</span>{m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: step content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: 'var(--s2)', border: '1px solid var(--border-1)',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeUp 0.35s both',
            animationDelay: '50ms',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '22px 28px',
              borderBottom: '1px solid var(--border-1)',
              background: 'var(--s1)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
                {currentStep?.icon}
              </div>
              <div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.02em' }}>
                  {currentStep?.label}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  Step {currentStepIndex + 1} of {totalSteps}
                </p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                margin: '20px 28px 0', padding: '12px 16px', borderRadius: 10,
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                animation: 'fadeUp 0.3s both',
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <span style={{ fontSize: 13, color: '#FCA5A5', lineHeight: 1.5 }}>{error}</span>
                <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', marginLeft: 'auto', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            )}

            {/* Step body — keyed by currentKey so it remounts on step change */}
            <div style={{ padding: '28px 28px' }} key={currentKey}>
              {currentKey === 'instructions' && (
                <StepInstructions test={test} agreed={agreed} setAgreed={setAgreed} />
              )}
              {currentKey === 'system' && (
                <StepSystem systemCheck={systemCheck} />
              )}
              {currentKey === 'webcam' && (
                <StepWebcam
                  webcamCheck={webcamCheck}
                  videoRef={videoRef}
                  onStart={startWebcam}
                  onVerify={verifyWebcam}
                  checking={webcamCheck.checking}
                  distanceStatus={cam1Distance.status}
                  distanceScore={cam1Distance.score}
                />
              )}
              {currentKey === 'second_cam' && (
                <StepSecondCam
                  qrData={qrData}
                  qrLoading={qrLoading}
                  connected={secondCamConnected}
                  cam2DistanceOk={cam2DistanceOk}
                  cam2FrameConfirmed={cam2FrameConfirmed}
                  remoteVideoRef={remoteVideoRef}
                  onFrameConfirm={() => setCam2FrameConfirmed(true)}
                  onGenerate={generateQR}
                />
              )}
              {currentKey === 'location' && (
                <StepLocation
                  locationCheck={locationCheck}
                  onStart={startLocation}
                />
              )}
              {currentKey === 'ready' && (
                <StepReady
                  test={test}
                  requirements={requirements}
                  webcamCheck={webcamCheck}
                  secondCameraCheck={secondCamCheck}
                  locationCheck={locationCheck}
                  onStart={handleStart}
                  starting={starting}
                />
              )}
            </div>

            {/* Navigation footer — hidden on last step (Ready) */}
            {!isLastStep && (
              <div style={{
                padding: '18px 28px', borderTop: '1px solid var(--border-1)',
                background: 'var(--s1)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Btn onClick={goBack} variant="ghost" disabled={currentStepIndex === 0}>
                  ← Back
                </Btn>
                <Btn onClick={goNext} variant="primary" disabled={!canNext()}>
                  Continue →
                </Btn>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreExamChecks;