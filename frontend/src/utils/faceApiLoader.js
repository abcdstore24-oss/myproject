/**
 * faceApiLoader.js
 * Module-level singleton for face-api.js model loading.
 * Ensures models are only fetched once, even when multiple hooks
 * (useDistanceCheck + useAIProctor) are mounted at the same time.
 *
 * Place at: frontend/src/utils/faceApiLoader.js
 * Models go in: frontend/public/models/
 */

import * as faceapi from 'face-api.js';

const MODELS_URL = '/models';

let _promise = null;

/**
 * Load TinyFaceDetector + Face Landmark 68 Tiny models.
 * Safe to call multiple times — returns the same Promise after the first call.
 */
export const loadFaceApiModels = () => {
  if (_promise) return _promise;

  _promise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
  ]).catch((err) => {
    // Reset so a future call can retry
    _promise = null;
    throw err;
  });

  return _promise;
};

export { faceapi };
