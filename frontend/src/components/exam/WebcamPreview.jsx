/**
 * WebcamPreview Component
 * Fixed bottom-right webcam overlay during exam.
 * className → inline styles. All camera/stream logic unchanged.
 */

import { useEffect, useRef, useState } from 'react';

const WebcamPreview = ({ enabled = true, stopRef }) => {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [error,    setError]    = useState(null);

  // ── Cleanup helper — identical to original ──────────────────────────────────
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
  };

  // ── Camera init — logic identical to original ───────────────────────────────
  useEffect(() => {
    if (!enabled) { stopStream(); return; }

    const initializeWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 240 }, height: { ideal: 180 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setIsActive(true);
            setError(null);
          };
        }
      } catch (err) {
        console.error('Webcam preview error:', err);
        setError('Webcam denied');
        setIsActive(false);
      }
    };

    initializeWebcam();
    return () => stopStream();
  }, [enabled]);

  useEffect(() => {
    if (stopRef) stopRef.current = stopStream;
  });

  if (!enabled) return null;

  return (
    <>
      <style>{`@media(max-width:767px){.wcp-wrap{display:none !important;}}`}</style>
      <div className="wcp-wrap" style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 30,
        width: 160, height: 120,
        background: '#111827',
        borderRadius: 10,
        overflow: 'hidden',
        border: `2px solid ${isActive ? '#10B981' : '#EF4444'}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>
        {/* Header bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          background: 'rgba(0,0,0,0.7)',
          padding: '4px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isActive ? '#4ADE80' : '#F87171',
              animation: isActive ? 'wcp-pulse 1.5s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>Webcam</span>
          </div>
        </div>

        {/* Feed or error */}
        {error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: 8 }}>
            <p style={{ fontSize: 11, color: '#F87171' }}>❌ {error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        <style>{`@keyframes wcp-pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
      </div>
    </>
  );
};

export default WebcamPreview;