/**
 * useAIProctor.js
 * Runs face-api.js on Camera 1's live video feed throughout the exam.
 *
 * Place at: frontend/src/hooks/useAIProctor.js
 *
 * Detects every DETECTION_INTERVAL ms:
 *   • No face in frame
 *   • Multiple faces
 *   • Distance violation (too close / too far)
 *   • Gaze deviation (looking away from screen)
 *
 * Calls onViolation(eventType, description, severity) for each finding.
 * The caller (ExamInterface) pipes this straight into logProctoringEvent()
 * so all detections flow through the existing socket + DB pipeline.
 *
 * Skips a tick if the previous detection hasn't finished yet — prevents
 * queue buildup on slower devices.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadFaceApiModels, faceapi } from '../utils/faceApiLoader';

// ── Tuning constants ────────────────────────────────────────────────────────
const DETECTION_INTERVAL = 4000;  // ms between detection ticks (don't go below 2000)
const SCORE_THRESHOLD    = 0.5;   // min confidence for face detection
const CAM1_MIN           = 0.18;  // slightly looser than pre-exam check (allow leaning back)
const CAM1_MAX           = 0.55;
const GAZE_X_THRESHOLD   = 0.28;  // horizontal nose deviation relative to face width
const GAZE_Y_THRESHOLD   = 0.28;  // vertical nose deviation relative to face height

export const useAIProctor = ({
  videoRef,
  enabled     = false,
  onViolation,   // (eventType: string, description: string, severity: string) => void
}) => {
  const [modelsLoaded, setModLoaded] = useState(false);
  const [loadError,    setLoadError] = useState(null);

  const detectingRef = useRef(false);
  const intervalRef  = useRef(null);

  // ── Load models (shared singleton — no double-fetch if useDistanceCheck
  //    already loaded them during pre-exam checks) ───────────────────────────
  useEffect(() => {
    loadFaceApiModels()
      .then(() => setModLoaded(true))
      .catch((err) => {
        console.error('[useAIProctor] model load failed:', err);
        setLoadError(err.message);
      });
  }, []);

  // ── Single detection tick ───────────────────────────────────────────────────
  const detect = useCallback(async () => {
    if (detectingRef.current) return; // skip if still processing last frame

    const video = videoRef?.current;
    if (!video || video.readyState < 2 || video.paused) return;

    detectingRef.current = true;
    try {
      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: SCORE_THRESHOLD })
        )
        .withFaceLandmarks(true); // true = use tiny landmark model

      const frameW = video.videoWidth || video.clientWidth || 640;

      // ── No face ─────────────────────────────────────────────────────────────
      if (detections.length === 0) {
        onViolation?.(
          'face_not_detected',
          'No face visible in webcam — candidate may have left the frame',
          'high'
        );
        return;
      }

      // ── Multiple faces ───────────────────────────────────────────────────────
      if (detections.length > 1) {
        onViolation?.(
          'multiple_faces_detected',
          `${detections.length} faces detected in frame — another person may be present`,
          'critical'
        );
        return;
      }

      // ── Single face — distance + gaze ────────────────────────────────────────
      const { detection, landmarks } = detections[0];
      const box       = detection.box;
      const faceRatio = box.width / frameW;

      if (faceRatio < CAM1_MIN) {
        onViolation?.(
          'cam1_distance_violation',
          'Candidate moved too far from the camera',
          'medium'
        );
      } else if (faceRatio > CAM1_MAX) {
        onViolation?.(
          'cam1_distance_violation',
          'Candidate is too close to the camera',
          'medium'
        );
      }

      // Gaze estimation: measure how far the nose tip has deviated from face centre.
      // Nose tip = landmarks.getNose()[3] (index 3 is the tip in the 68-point model).
      if (landmarks) {
        const noseTip   = landmarks.getNose()[3];
        const centreX   = box.x + box.width  / 2;
        const centreY   = box.y + box.height / 2;
        const devX      = Math.abs(noseTip.x - centreX) / box.width;
        const devY      = Math.abs(noseTip.y - centreY) / box.height;

        if (devX > GAZE_X_THRESHOLD || devY > GAZE_Y_THRESHOLD) {
          onViolation?.(
            'gaze_deviation',
            'Candidate appears to be looking away from the screen',
            'medium'
          );
        }
      }
    } catch (err) {
      console.warn('[useAIProctor] detection error:', err.message);
    } finally {
      detectingRef.current = false;
    }
  }, [videoRef, onViolation]);

  // ── Start / stop detection loop ─────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !modelsLoaded) return;

    intervalRef.current = setInterval(detect, DETECTION_INTERVAL);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [enabled, modelsLoaded, detect]);

  return { modelsLoaded, loadError };
};
