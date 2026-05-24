/**
 * useDistanceCheck.js
 * Runs face-api.js on a video element and returns real-time distance status.
 * Used during pre-exam checks for Camera 1 (laptop) and Camera 2 (phone).
 *
 * Place at: frontend/src/hooks/useDistanceCheck.js
 *
 * Returns:
 *   status       – 'loading' | 'no_face' | 'too_close' | 'too_far' | 'ok' | 'error'
 *   faceRatio    – 0–1, face width as a fraction of frame width (0 if no face)
 *   score        – 0–100 position score (100 = perfectly centred in ideal range)
 *   modelsLoaded – boolean
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadFaceApiModels, faceapi } from '../utils/faceApiLoader';

// ── Camera 1 (laptop, front-facing) ──────────────────────────────────────────
// Candidate's face should occupy 20–50 % of the frame width.
const CAM1_MIN = 0.20;
const CAM1_MAX = 0.50;

// ── Camera 2 (phone, back/environment-facing, watching the room) ─────────────
// The candidate + desk should be visible; face must not dominate the frame.
const CAM2_MAX = 0.35;

export const useDistanceCheck = ({
  videoRef,
  camera    = 'cam1',  // 'cam1' | 'cam2'
  enabled   = true,
  intervalMs = 800,
}) => {
  const [status,      setStatus]     = useState('loading');
  const [faceRatio,   setFaceRatio]  = useState(0);
  const [modelsLoaded, setModLoaded] = useState(false);

  const detectingRef = useRef(false);
  const intervalRef  = useRef(null);

  // ── Load models (shared singleton) ─────────────────────────────────────────
  useEffect(() => {
    loadFaceApiModels()
      .then(() => setModLoaded(true))
      .catch((err) => {
        console.error('[useDistanceCheck] model load failed:', err);
        setStatus('error');
      });
  }, []);

  // ── Detection tick ──────────────────────────────────────────────────────────
  const detect = useCallback(async () => {
    if (detectingRef.current) return;

    const video = videoRef?.current;
    if (!video || video.readyState < 2) return;

    detectingRef.current = true;
    try {
      const results = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 })
      );

      const frameW = video.videoWidth || video.clientWidth || 640;

      if (results.length === 0) {
        setStatus('no_face');
        setFaceRatio(0);
        return;
      }

      // Use the largest detected face (most prominent person in frame)
      const largest = results.reduce((a, b) => (a.box.width > b.box.width ? a : b));
      const ratio   = largest.box.width / frameW;
      setFaceRatio(ratio);

      if (camera === 'cam1') {
        if (ratio < CAM1_MIN)       setStatus('too_far');
        else if (ratio > CAM1_MAX)  setStatus('too_close');
        else                        setStatus('ok');
      } else {
        // cam2: only flag if face is too large (phone too close to candidate)
        if (ratio > CAM2_MAX) setStatus('too_close');
        else                  setStatus('ok');
      }
    } catch (err) {
      console.warn('[useDistanceCheck] detection error:', err.message);
    } finally {
      detectingRef.current = false;
    }
  }, [videoRef, camera]);

  // ── Start / stop loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !modelsLoaded) return;

    detect(); // run immediately so UI isn't blank on first render
    intervalRef.current = setInterval(detect, intervalMs);

    return () => clearInterval(intervalRef.current);
  }, [enabled, modelsLoaded, detect, intervalMs]);

  // ── Position score 0–100 (100 = ideal) ─────────────────────────────────────
  const score = (() => {
    if (status === 'ok')        return 100;
    if (status === 'too_far')   return Math.max(0, Math.round((faceRatio / CAM1_MIN) * 100));
    if (status === 'too_close') {
      const max = camera === 'cam1' ? CAM1_MAX : CAM2_MAX;
      return Math.max(0, Math.round((1 - (faceRatio - max)) * 100));
    }
    return 0;
  })();

  return { status, faceRatio, score, modelsLoaded };
};
