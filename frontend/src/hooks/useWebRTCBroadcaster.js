/**
 * useWebRTCBroadcaster.js
 * Phone side — sends the local camera stream to the laptop via WebRTC.
 * Used ONLY during pre-exam checks so the candidate can see a live
 * Camera 2 preview while positioning their phone.
 *
 * Place at: frontend/src/hooks/useWebRTCBroadcaster.js
 *
 * Flow:
 *  1. Laptop emits 'webrtc_request_offer' → server → phone
 *  2. Phone creates RTCPeerConnection + adds stream tracks
 *  3. Phone creates SDP offer → sends 'webrtc_offer' → server → laptop
 *  4. Laptop creates answer → sends 'webrtc_answer' → server → phone
 *  5. Both sides exchange ICE candidates
 *  6. Peer connection established — video travels peer-to-peer
 *
 * When enabled becomes false the connection is closed immediately.
 */

import { useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export const useWebRTCBroadcaster = ({ socketRef, streamRef, enabled }) => {
  const pcRef = useRef(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      console.log('[WebRTC Broadcaster] connection closed');
    }
  }, []);

  useEffect(() => {
    if (!enabled) { cleanup(); return; }

    const socket = socketRef?.current;
    if (!socket) return;

    // ── Handler: laptop requests an offer ──────────────────────────────────
    const handleRequestOffer = async () => {
      cleanup(); // tear down any previous connection first

      const stream = streamRef?.current;
      if (!stream) {
        console.warn('[WebRTC Broadcaster] no stream available yet');
        return;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Add all camera tracks to the peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Forward ICE candidates to the laptop via server
      pc.onicecandidate = ({ candidate }) => {
        if (candidate && socket.connected) {
          socket.emit('webrtc_ice_candidate', { candidate, from: 'broadcaster' });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC Broadcaster] connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') cleanup();
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { sdp: pc.localDescription });
        console.log('[WebRTC Broadcaster] offer sent');
      } catch (err) {
        console.error('[WebRTC Broadcaster] offer failed:', err);
        cleanup();
      }
    };

    // ── Handler: receive answer from laptop ─────────────────────────────────
    const handleAnswer = async ({ sdp }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('[WebRTC Broadcaster] answer accepted');
      } catch (err) {
        console.error('[WebRTC Broadcaster] set remote description failed:', err);
      }
    };

    // ── Handler: receive ICE candidate from laptop ──────────────────────────
    const handleIce = async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC Broadcaster] ICE error:', err.message);
      }
    };

    socket.on('webrtc_request_offer',                handleRequestOffer);
    socket.on('webrtc_answer',                       handleAnswer);
    socket.on('webrtc_ice_candidate_to_broadcaster', handleIce);

    return () => {
      socket.off('webrtc_request_offer',                handleRequestOffer);
      socket.off('webrtc_answer',                       handleAnswer);
      socket.off('webrtc_ice_candidate_to_broadcaster', handleIce);
      cleanup();
    };
  }, [enabled, socketRef, streamRef, cleanup]);
};
