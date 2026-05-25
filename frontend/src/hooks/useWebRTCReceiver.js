/**
 * useWebRTCReceiver.js
 * Laptop side — receives the Camera 2 WebRTC stream from the phone.
 * Attaches the remote stream to a <video> element for true live preview.
 *
 * Place at: frontend/src/hooks/useWebRTCReceiver.js
 *
 * Flow:
 *  1. When enabled=true, emits 'webrtc_request_offer' to server
 *  2. Server forwards to phone → phone creates SDP offer
 *  3. Receives offer → creates SDP answer → sends back via server
 *  4. Both sides exchange ICE candidates
 *  5. onStream(MediaStream) fires → caller attaches to <video>.srcObject
 *  6. When enabled=false, closes connection cleanly
 */

import { useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export const useWebRTCReceiver = ({
  socket,
  enabled,
  onStream,      // (MediaStream) => void — attach to <video>.srcObject
  onDisconnect,  // () => void — called when connection drops
}) => {
  const pcRef        = useRef(null);
  const pendingIce   = useRef([]);  // buffer ICE candidates that arrive before remote desc is set

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      pendingIce.current = [];
      console.log('[WebRTC Receiver] connection closed');
    }
  }, []);

  useEffect(() => {
    if (!enabled || !socket) { cleanup(); return; }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // ── Remote stream arrives ───────────────────────────────────────────────
    pc.ontrack = ({ streams }) => {
      if (streams?.[0]) {
        console.log('[WebRTC Receiver] remote stream received — video is live');
        onStream?.(streams[0]);
      }
    };

    // ── Send ICE candidates to phone via server ─────────────────────────────
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket.connected) {
        socket.emit('webrtc_ice_candidate', { candidate, from: 'receiver' });
      }
    };

    // ── Connection state monitoring ─────────────────────────────────────────
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC Receiver] state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        onDisconnect?.();
      }
    };

    // ── Handler: receive SDP offer from phone ───────────────────────────────
    const handleOffer = async ({ sdp }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Flush any ICE candidates that arrived before the offer
        for (const candidate of pendingIce.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        pendingIce.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { sdp: pc.localDescription });
        console.log('[WebRTC Receiver] answer sent');
      } catch (err) {
        console.error('[WebRTC Receiver] answer failed:', err);
      }
    };

    // ── Handler: ICE candidate from phone ──────────────────────────────────
    const handleIce = async ({ candidate }) => {
      if (!candidate) return;
      if (!pc.remoteDescription) {
        // Offer not yet applied — buffer the candidate
        pendingIce.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC Receiver] ICE error:', err.message);
      }
    };

    socket.on('webrtc_offer',                     handleOffer);
    socket.on('webrtc_ice_candidate_to_receiver', handleIce);

    // Kick off the handshake — ask the phone to create an offer
    socket.emit('webrtc_request_offer');
    console.log('[WebRTC Receiver] requested offer from phone');

    return () => {
      socket.off('webrtc_offer',                     handleOffer);
      socket.off('webrtc_ice_candidate_to_receiver', handleIce);
      cleanup();
    };
  }, [enabled, socket, onStream, onDisconnect, cleanup]);
};
