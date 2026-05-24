/**
 * useObjectDetector.js
 * Runs COCO-SSD on Camera 1's live video feed during the exam.
 * Only watches for two classes: 'cell phone' and 'person'.
 *
 * Place at: frontend/src/hooks/useObjectDetector.js
 *
 * Detects every DETECTION_INTERVAL ms:
 *   • cell phone visible in frame → phone_detected (critical)
 *   • extra person in frame beyond the candidate → unauthorised_person_detected (critical)
 *
 * Calls onViolation(eventType, description, severity) — same interface
 * as useAIProctor so ExamInterface wires it in identically.
 *
 * Runs on the same webcamVideoRef as useAIProctor.
 * Model loads lazily after exam starts — not during pre-exam checks.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const DETECTION_INTERVAL = 10000; // ms — heavier model, run less frequently
const SCORE_THRESHOLD    = 0.65;  // higher threshold = fewer false positives
const WATCHED_CLASSES    = ['cell phone', 'person'];

// Module-level singleton — model loads once, reused across re-renders
let _model   = null;
let _promise = null;

const loadCocoSsd = async () => {
  if (_model)   return _model;
  if (_promise) return _promise;

  _promise = (async () => {
    // Dynamic imports — keeps the main bundle lean.
    // TF.js core is already loaded by face-api.js so this is just the model.
    const tf      = await import('@tensorflow/tfjs');
    const cocoSsd = await import('@tensorflow-models/coco-ssd');

    // Use lite_mobilenet_v2 — smallest variant, fastest inference
    _model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    return _model;
  })();

  return _promise;
};

export const useObjectDetector = ({
  videoRef,
  enabled     = false,
  onViolation,  // (eventType: string, description: string, severity: string) => void
}) => {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError,   setLoadError]   = useState(null);

  const detectingRef = useRef(false);
  const intervalRef  = useRef(null);

  // ── Load model after enabled flips true ────────────────────────────────────
  // We delay loading until the exam actually starts so it doesn't slow
  // down the pre-exam checks page.
  useEffect(() => {
    if (!enabled) return;

    loadCocoSsd()
      .then(() => setModelLoaded(true))
      .catch((err) => {
        console.error('[useObjectDetector] COCO-SSD load failed:', err);
        setLoadError(err.message);
      });
  }, [enabled]);

  // ── Single detection tick ───────────────────────────────────────────────────
  const detect = useCallback(async () => {
    if (detectingRef.current) return;
    if (!_model) return;

    const video = videoRef?.current;
    if (!video || video.readyState < 2 || video.paused) return;

    detectingRef.current = true;
    try {
      // detectWithScores returns array of { bbox, class, score }
      const predictions = await _model.detect(video);

      // Filter to only the two classes we care about, above score threshold
      const relevant = predictions.filter(
        (p) => WATCHED_CLASSES.includes(p.class) && p.score >= SCORE_THRESHOLD
      );

      if (relevant.length === 0) return;

      const phoneDetections  = relevant.filter(p => p.class === 'cell phone');
      const personDetections = relevant.filter(p => p.class === 'person');

      // ── Phone detected ─────────────────────────────────────────────────────
      if (phoneDetections.length > 0) {
        const best = Math.max(...phoneDetections.map(p => p.score));
        onViolation?.(
          'phone_detected',
          `Mobile phone detected in camera frame (confidence: ${Math.round(best * 100)}%)`,
          'critical'
        );
      }

      // ── Extra person detected ──────────────────────────────────────────────
      // COCO-SSD detects the candidate themselves as 'person' (score usually
      // very high). We only flag if there are 2+ person detections, meaning
      // someone else has entered the frame.
      if (personDetections.length > 1) {
        onViolation?.(
          'unauthorised_person_detected',
          `${personDetections.length} people detected in frame — an unauthorised person may be present`,
          'critical'
        );
      }
    } catch (err) {
      console.warn('[useObjectDetector] detection error:', err.message);
    } finally {
      detectingRef.current = false;
    }
  }, [videoRef, onViolation]);

  // ── Start / stop detection loop ─────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !modelLoaded) return;

    // Small initial delay — let face-api.js finish its first tick first
    const startDelay = setTimeout(() => {
      detect(); // run immediately after delay
      intervalRef.current = setInterval(detect, DETECTION_INTERVAL);
    }, 3000);

    return () => {
      clearTimeout(startDelay);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [enabled, modelLoaded, detect]);

  return { modelLoaded, loadError };
};
