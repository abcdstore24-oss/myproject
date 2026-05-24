/**
 * useCam2Detector.js
 * Runs COCO-SSD on Camera 2 frames during the exam.
 *
 * Place at: frontend/src/hooks/useCam2Detector.js
 *
 * Camera 2 frames arrive as base64 data URLs via socket (secondary_camera_frame).
 * This hook draws each received frame onto a hidden canvas and runs COCO-SSD
 * on it — same model as useObjectDetector, same singleton, no double load.
 *
 * Detects:
 *   • cell phone visible in room → phone_detected (critical)
 *   • 2+ people in room → unauthorised_person_detected (critical)
 *
 * Only processes one frame every THROTTLE_MS to keep CPU usage low.
 * Camera 2 sends a frame every 2s — we process every ~10s.
 *
 * Usage:
 *   const { processFrame } = useCam2Detector({ enabled, onViolation });
 *   // then in socket listener: processFrame(data.frame)
 */

import { useRef, useEffect, useState, useCallback } from 'react';

const THROTTLE_MS      = 10000; // minimum ms between detections
const SCORE_THRESHOLD  = 0.60;  // slightly lower than cam1 — room-view angle is harder
const WATCHED_CLASSES  = ['cell phone', 'person'];

// Reuse the same COCO-SSD singleton from useObjectDetector
// (dynamic import is cached by the browser module system)
let _model   = null;
let _promise = null;

const loadCocoSsd = async () => {
  if (_model)   return _model;
  if (_promise) return _promise;

  _promise = (async () => {
    await import('@tensorflow/tfjs');
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    _model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    return _model;
  })();

  return _promise;
};

export const useCam2Detector = ({
  enabled     = false,
  onViolation,  // (eventType, description, severity) => void
}) => {
  const [modelLoaded, setModelLoaded] = useState(false);

  const canvasRef      = useRef(null);    // hidden canvas for frame drawing
  const lastDetectRef  = useRef(0);       // timestamp of last detection tick
  const detectingRef   = useRef(false);   // prevent overlapping detections

  // ── Create the hidden canvas once ──────────────────────────────────────────
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    return () => {
      if (canvasRef.current) document.body.removeChild(canvasRef.current);
    };
  }, []);

  // ── Load model lazily when exam starts ─────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    loadCocoSsd()
      .then(() => setModelLoaded(true))
      .catch((err) => console.error('[useCam2Detector] model load failed:', err));
  }, [enabled]);

  // ── Process a single base64 frame ──────────────────────────────────────────
  const processFrame = useCallback(async (base64DataUrl) => {
    if (!enabled || !modelLoaded || !_model) return;
    if (detectingRef.current) return;

    // Throttle — skip frames that arrive within THROTTLE_MS of last detection
    const now = Date.now();
    if (now - lastDetectRef.current < THROTTLE_MS) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    detectingRef.current = true;
    lastDetectRef.current = now;

    try {
      // Draw base64 frame onto canvas
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => {
          canvas.width  = img.naturalWidth  || 640;
          canvas.height = img.naturalHeight || 480;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.onerror = reject;
        img.src = base64DataUrl;
      });

      // Run COCO-SSD on the drawn canvas
      const predictions = await _model.detect(canvas);

      const relevant = predictions.filter(
        (p) => WATCHED_CLASSES.includes(p.class) && p.score >= SCORE_THRESHOLD
      );

      if (relevant.length === 0) return;

      const phones  = relevant.filter(p => p.class === 'cell phone');
      const persons = relevant.filter(p => p.class === 'person');

      // ── Phone in room ──────────────────────────────────────────────────────
      if (phones.length > 0) {
        const best = Math.max(...phones.map(p => p.score));
        onViolation?.(
          'phone_detected',
          `Mobile phone detected by room camera (confidence: ${Math.round(best * 100)}%)`,
          'critical'
        );
      }

      // ── Extra person in room ───────────────────────────────────────────────
      // Camera 2 shows the room — the candidate counts as 1 person.
      // Flag if 2+ people are visible.
      if (persons.length > 1) {
        onViolation?.(
          'unauthorised_person_detected',
          `${persons.length} people detected by room camera — an unauthorised person may be present`,
          'critical'
        );
      }
    } catch (err) {
      console.warn('[useCam2Detector] detection error:', err.message);
    } finally {
      detectingRef.current = false;
    }
  }, [enabled, modelLoaded, onViolation]);

  return { processFrame, modelLoaded };
};
