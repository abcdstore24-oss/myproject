/**
 * WebcamCapture.jsx
 * Hidden background component — starts webcam, takes a JPEG snapshot
 * every `captureInterval` ms, and uploads it to /api/monitoring/snapshot.
 *
 * No visible UI. The live-video overlay is handled separately by WebcamPreview.
 *
 * Props:
 *   testId          – current test id (from useParams)
 *   captureInterval – ms between snapshots, default 30000
 *   enabled         – false → stop stream immediately
 *   onReady         – called once when stream is live
 *   stopRef         – ref.current is set to a stop() fn for instant shutdown
 */

import { useEffect, useRef } from 'react';
import axios from '../../api/axiosConfig';

const WebcamCapture = ({
  testId,
  captureInterval = 30000,
  enabled = true,
  onReady,
  stopRef,
  videoRef: externalVideoRef,
}) => {
  const ownVideoRef = useRef(null);
  const videoRef    = externalVideoRef ?? ownVideoRef; 
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const intervalRef = useRef(null);

  // ── Cleanup helper ──────────────────────────────────────────────────────────
  const stopEverything = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Expose stop handle so ExamInterface can kill the stream instantly on submit
  useEffect(() => {
    if (stopRef) stopRef.current = stopEverything;
  });

  // ── Main effect — start / stop based on `enabled` ──────────────────────────
  useEffect(() => {
    if (!enabled) {
      stopEverything();
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (cancelled) return;
            videoRef.current.play().catch(() => {});
            if (onReady) onReady();

            // Begin periodic snapshots after stream is live
            intervalRef.current = setInterval(uploadSnapshot, captureInterval);
          };
        }
      } catch (err) {
        // Camera denied or unavailable — log quietly, don't crash
        console.warn('WebcamCapture: camera unavailable:', err.message);
      }
    };

    // ── Snapshot capture & upload ─────────────────────────────────────────────
    const uploadSnapshot = () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !streamRef.current) return;

      const w = video.videoWidth  || 640;
      const h = video.videoHeight || 480;
      canvas.width  = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);

      canvas.toBlob(async (blob) => {
        if (!blob || cancelled) return;
        try {
          const formData = new FormData();
          formData.append('snapshot', blob, `snap_${Date.now()}.jpg`);
          formData.append('testId', testId);
          await axios.post('/monitoring/snapshot', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 15000,
          });
        } catch (uploadErr) {
          // Don't throw — a failed snapshot shouldn't break anything
          console.warn('WebcamCapture: snapshot upload failed:', uploadErr.message);
        }
      }, 'image/jpeg', 0.75);
    };

    start();

    return () => {
      cancelled = true;
      stopEverything();
    };
  }, [enabled, captureInterval]); // re-run only when enabled changes

  // Invisible elements — rendering nothing visible
  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </>
  );
};

export default WebcamCapture;