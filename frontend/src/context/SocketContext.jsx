/**
 * SocketContext
 * Manages Socket.io connection for real-time proctoring
 *
 * FIX B-14: The previous version depended on [isAuthenticated] in its
 * useEffect. The problem:
 *
 *   1. On app startup, AuthContext.checkAuth() runs async. isAuthenticated
 *      starts as false, then flips to true once the /auth/me call resolves.
 *      This false → true flip fires the useEffect, tearing down any socket
 *      that was already connected and rebuilding it — potentially dropping
 *      proctoring events that were emitted in the brief window between mount
 *      and auth resolution.
 *
 *   2. isAuthenticated is a boolean, not a stable identity key. Two different
 *      users logging in sequentially would both have isAuthenticated=true —
 *      the dependency would NOT trigger a rebuild, leaving stale auth tokens
 *      in the socket handshake.
 *
 * Fix:
 *   - Depend on [user?.user_id] instead of [isAuthenticated].
 *     * undefined → undefined: no rebuild (prevents the startup flap)
 *     * undefined → 42:        connect on login (correct)
 *     * 42        → undefined: disconnect on logout (correct)
 *     * 42        → 99:        rebuild on user-switch (correct)
 *   - Guard with early return when user_id is falsy so we never attempt to
 *     connect without a real authenticated user.
 *   - Read the token inside the effect (not captured in closure at render)
 *     so we always use the most current accessToken from localStorage.
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket]       = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // FIX B-14: depend on user?.user_id — a stable numeric ID, not a boolean
  useEffect(() => {
    const userId = user?.user_id;

    // No authenticated user — ensure any existing socket is closed
    if (!userId) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Read the token at effect-run time, not at render time.
    // By this point AuthContext has already confirmed the token is valid.
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // If there's already a live socket for this user, do nothing
    if (socketRef.current?.connected) return;

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection:      true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Cleanup: only runs when user_id changes (login/logout/switch)
    return () => {
      newSocket.close();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [user?.user_id]); // ← stable dependency — not isAuthenticated

  // ── Emitters ──────────────────────────────────────────────────────────────

  const joinTestRoom = useCallback((testId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_test_room', testId);
      console.log(`Joined test room: ${testId}`);
    }
  }, []);

  const leaveTestRoom = useCallback((testId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_test_room', testId);
      console.log(`Left test room: ${testId}`);
    }
  }, []);

  const emitProctoringEvent = useCallback((eventData) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('proctoring_event', eventData);
    }
  }, []);

  const sendHeartbeat = useCallback((testId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('heartbeat', { testId });
    }
  }, []);

  const notifySnapshotCaptured = useCallback((testId, snapshotUrl) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('snapshot_captured', { testId, snapshotUrl });
    }
  }, []);

  // ── Listener helpers ──────────────────────────────────────────────────────

  const on = useCallback((eventName, callback) => {
    if (socketRef.current) {
      socketRef.current.on(eventName, callback);
    }
  }, []);

  const off = useCallback((eventName, callback) => {
    if (socketRef.current) {
      socketRef.current.off(eventName, callback);
    }
  }, []);

  const value = {
    socket,
    connected,
    joinTestRoom,
    leaveTestRoom,
    emitProctoringEvent,
    sendHeartbeat,
    notifySnapshotCaptured,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;