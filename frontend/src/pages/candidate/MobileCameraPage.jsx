/**
 * MobileCameraPage.jsx
 * Opened on candidate's phone via QR code scan.
 * Connects to /mobile-cam Socket.io namespace and streams camera frames.
 * No login required — authenticated via session token in URL.
 *
 * STYLING ONLY CHANGE: className → inline styles (logic unchanged)
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useDistanceCheck } from '../../hooks/useDistanceCheck';

const FRAME_INTERVAL_MS = 2000;
const JPEG_QUALITY = 0.6;

const MobileCameraPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status,     setStatus]     = useState('connecting');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [frameCount, setFrameCount] = useState(0);
  const [examEnded,  setExamEnded]  = useState(false);

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const socketRef   = useRef(null);
  const streamRef   = useRef(null);
  const intervalRef = useRef(null);

  // Distance check for Camera 2 — runs when camera is streaming
  const cam2Distance = useDistanceCheck({
    videoRef,
    camera:    'cam2',
    enabled:   status === 'ready',
    intervalMs: 1000,
  });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid QR code — no token found in URL.');
      return;
    }

    const backendUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      secure: backendUrl.startsWith('https'),
      auth: {},
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('📱 Socket connected, sending token...');
      socket.emit('mobile_cam_join', { token });
    });

    socket.on('connect_error', (err) => {
      console.error('📱 Socket connect_error:', err.message);
      setStatus('error');
      setErrorMsg(`Cannot reach server: ${err.message}. Make sure backend is running on port 5000.`);
    });

    socket.on('mobile_cam_ready', () => {
      console.log('📱 mobile_cam_ready received — starting camera');
      setStatus('ready');
      startCamera();
    });

    socket.on('mobile_cam_error', (data) => {
      console.error('📱 mobile_cam_error:', data.message);
      setStatus('error');
      setErrorMsg(data.message || 'Connection failed. Try regenerating the QR code.');
      socket.disconnect();
    });

    socket.on('disconnect', (reason) => {
      console.log('📱 Socket disconnected:', reason);
      if (!examEnded) setStatus('disconnected');
      stopCamera();
    });

    socket.on('exam_ended', () => {
      console.log('📱 Exam ended — stopping secondary camera');
      setExamEnded(true);
      setStatus('ended');
      stopCamera();
    });

    const timeout = setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        setStatus('error');
        setErrorMsg('Connection timed out. Make sure: 1) Backend is running, 2) You regenerated the QR code after any restart.');
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      stopCamera();
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (!socketRef.current?.connected || status !== 'ready') return;
    socketRef.current.emit('mobile_cam_distance_status', {
      status: cam2Distance.status,
    });
  }, [cam2Distance.status, status]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      if (socketRef.current?.connected) socketRef.current.emit('mobile_cam_camera_ready');
      intervalRef.current = setInterval(captureAndSendFrame, FRAME_INTERVAL_MS);
    } catch {
      setStatus('error');
      setErrorMsg('Camera access denied. Please allow camera permission and reload.');
      if (socketRef.current?.connected) socketRef.current.disconnect();
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current)   { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const captureAndSendFrame = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const socket = socketRef.current;
    if (!video || !canvas || !socket || video.readyState < 2) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    socket.emit('mobile_cam_frame', { frame });
    setFrameCount(prev => prev + 1);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 16, fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <style>{`@keyframes mcp-spin{to{transform:rotate(360deg)}} @keyframes mcp-pulse{0%,100%{opacity:0.5}50%{opacity:1}} *{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 380, marginTop: 16, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <span style={{ color: 'white', fontSize: 17, fontFamily: 'Syne,sans-serif', fontWeight: 800 }}>TalentProctor</span>
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Secondary Camera</div>
      </div>

      {/* Connecting */}
      {status === 'connecting' && (
        <div style={{ textAlign: 'center', color: 'white', marginTop: 48 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#818CF8', animation: 'mcp-spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 14 }}>Connecting to exam session…</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{ width: '100%', maxWidth: 380, background: 'rgba(127,29,29,0.6)', border: '1px solid #991B1B', borderRadius: 14, padding: '24px 20px', textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>❌</div>
          <p style={{ color: '#FCA5A5', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Connection Failed</p>
          <p style={{ color: '#FCA5A5', fontSize: 13, marginBottom: 12, lineHeight: 1.55 }}>{errorMsg}</p>
          <p style={{ color: '#6B7280', fontSize: 11 }}>Ask the candidate to regenerate the QR code.</p>
        </div>
      )}

      {/* Disconnected */}
      {status === 'disconnected' && (
        <div style={{ width: '100%', maxWidth: 380, background: 'rgba(120,53,15,0.6)', border: '1px solid #92400E', borderRadius: 14, padding: '24px 20px', textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
          <p style={{ color: '#FCD34D', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Disconnected</p>
          <p style={{ color: '#FCD34D', fontSize: 13 }}>Connection to the exam server was lost.</p>
        </div>
      )}

      {/* Ready / Streaming */}
      {status === 'ready' && (
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,78,59,0.8)', border: '1px solid #065F46', borderRadius: 10, padding: '9px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', animation: 'mcp-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ color: '#6EE7B7', fontSize: 13, fontWeight: 600 }}>Live — Streaming</span>
            </div>
            <span style={{ color: '#34D399', fontSize: 12 }}>{frameCount} frames sent</span>
          </div>

          {/* Distance meter */}
          <div style={{ background: '#1F2937', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Distance Check
              </span>
              <span style={{ fontSize: 12, fontWeight: 700,
                color: cam2Distance.status === 'ok' ? '#34D399' :
                       cam2Distance.status === 'loading' ? '#818CF8' : '#FCD34D',
              }}>
                {cam2Distance.status === 'ok'        && '✓ Good position'}
                {cam2Distance.status === 'too_close' && '↔ Move phone further away'}
                {cam2Distance.status === 'no_face'   && '👤 Point camera at desk area'}
                {cam2Distance.status === 'loading'   && 'Checking…'}
              </span>
            </div>
            <div style={{ height: 6, background: '#374151', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${cam2Distance.score ?? 0}%`,
                background: cam2Distance.status === 'ok'
                  ? 'linear-gradient(90deg,#10B981,#34D399)'
                  : 'linear-gradient(90deg,#F59E0B,#FCD34D)',
                transition: 'width 0.5s ease, background 0.4s ease',
              }} />
            </div>
          </div>

          <div style={{ background: 'black', borderRadius: 14, overflow: 'hidden', border: '1px solid #374151' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', maxHeight: '60vh', objectFit: 'cover' }} />
          </div>

          <div style={{ background: '#1F2937', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontWeight: 700, color: 'white', marginBottom: 8, fontSize: 13 }}>📋 Instructions</p>
            <ul style={{ paddingLeft: 16, margin: 0, color: '#9CA3AF', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Place phone to your side at desk height — not directly behind you</li>
              <li>Angle 45° so your face, desk, and laptop are all visible</li>
              <li>Ensure good lighting — avoid facing a bright window</li>
              <li>Do not close or minimize this browser tab</li>
              <li>Keep your phone plugged in or on charge</li>
            </ul>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#6B7280' }}>
            Keep your phone screen on. Frames are sent every 2 seconds.
          </div>
        </div>
      )}

      {/* Exam Over */}
      {status === 'ended' && (
        <div style={{ width: '100%', maxWidth: 380, background: '#1F2937', border: '1px solid #374151', borderRadius: 14, padding: '32px 24px', textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <p style={{ color: 'white', fontSize: 18, fontFamily: 'Syne,sans-serif', fontWeight: 800, marginBottom: 8 }}>Exam Submitted</p>
          <p style={{ color: '#D1D5DB', fontSize: 13, marginBottom: 12 }}>The exam has ended. Secondary camera session is closed.</p>
          <p style={{ color: '#6B7280', fontSize: 11 }}>You can safely close this tab.</p>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default MobileCameraPage;