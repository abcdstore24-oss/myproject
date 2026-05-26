import { useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export const useWebRTCReceiver = ({
  socket,
  enabled,
  onStream,
  onDisconnect,
}) => {
  const pcRef       = useRef(null);
  const pendingIce  = useRef([]);

  // ── Store callbacks in refs so they never trigger reconnection ──────────
  // The connection effect only depends on [enabled, socket] — not the callbacks.
  const onStreamRef     = useRef(onStream);
  const onDisconnectRef = useRef(onDisconnect);
  useEffect(() => { onStreamRef.current     = onStream;     }, [onStream]);
  useEffect(() => { onDisconnectRef.current = onDisconnect; }, [onDisconnect]);

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

    pc.ontrack = ({ streams }) => {
      if (streams?.[0]) {
        console.log('[WebRTC Receiver] remote stream received — video is live');
        onStreamRef.current?.(streams[0]);
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket.connected) {
        socket.emit('webrtc_ice_candidate', { candidate, from: 'receiver' });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC Receiver] state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        onDisconnectRef.current?.();
      }
    };

    const handleOffer = async ({ sdp }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

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

    const handleIce = async ({ candidate }) => {
      if (!candidate) return;
      if (!pc.remoteDescription) {
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

    socket.emit('webrtc_request_offer');
    console.log('[WebRTC Receiver] requested offer from phone');

    return () => {
      socket.off('webrtc_offer',                     handleOffer);
      socket.off('webrtc_ice_candidate_to_receiver', handleIce);
      cleanup();
    };
  }, [enabled, socket, cleanup]); // ← onStream and onDisconnect intentionally excluded
};