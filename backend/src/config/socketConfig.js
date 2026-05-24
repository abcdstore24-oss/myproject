/**
 * Socket.io Server Configuration
 */

const socketIO = require('socket.io');
const MonitoringLog = require('../models/MonitoringLog');
const TestCandidate = require('../models/TestCandidate');
const { validateToken, deleteToken } = require('../services/mobileCameraTokens');

function initializeSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ─── Auth Middleware ────────────────────────────────────────────────────────
  // Allow connections with no JWT (mobile camera clients).
  // Mobile camera auth happens at event level via session token.
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      // No JWT — mark as unauthenticated, allow through for mobile-cam flow
      socket.isUnauthenticated = true;
      return next();
    }

    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.isUnauthenticated = false;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (auth: ${!socket.isUnauthenticated})`);

    // Auto-join personal room so we can emit directly to a user by userId
    if (socket.userId) {
      socket.join(`user_${socket.userId}`);
    }

    // ── Mobile camera join (no JWT — uses session token) ──────────────────────
    socket.on('mobile_cam_join', async (data) => {
      // Only unauthenticated sockets can join as mobile camera
      if (!socket.isUnauthenticated) return;

      const { token } = data || {};
      const session = validateToken(token);

      if (!session) {
        socket.emit('mobile_cam_error', {
          message: 'Invalid or expired QR code. Please regenerate.',
        });
        socket.disconnect();
        return;
      }

      deleteToken(token);

      socket.mobileSession = session;
      socket.join(`mobile_${session.assignmentId}`);

      console.log(`📱 Mobile camera joined assignment: ${session.assignmentId}`);

      // Tell mobile page it joined successfully — camera not yet started
      socket.emit('mobile_cam_ready', {
        assignmentId: session.assignmentId,
        message: 'Socket connected. Please allow camera access.',
      });
      // DO NOT emit secondary_camera_status: connected yet
      // That only fires after camera permission is granted (mobile_cam_camera_ready)
    });

    // ── Mobile camera granted permission and started ─────────────────────────
    // Fired by mobile page after getUserMedia() succeeds
    socket.on('mobile_cam_camera_ready', () => {
      if (!socket.mobileSession) return;
      const { assignmentId, testId, candidateId } = socket.mobileSession;

      const payload = { assignmentId, candidateId, status: 'connected', timestamp: new Date() };
      // Now tell candidate: camera is live
      io.to(`user_${candidateId}`).emit('secondary_camera_status', payload);
      // Tell recruiter room too
      io.to(`test_${testId}`).emit('secondary_camera_status', payload);

      console.log(`📱 Mobile camera LIVE for assignment: ${assignmentId}`);
    });

    // ── Exam ended — stop mobile camera session ──────────────────────────────
    socket.on('exam_ended', () => {
      if (!socket.mobileSession) return;
      console.log(`📱 Exam ended — disconnecting mobile camera for assignment: ${socket.mobileSession.assignmentId}`);
      socket.emit('exam_ended', { message: 'Exam submitted. You can close this tab.' });
      socket.disconnect();
    });

    // ── Mobile cam distance status relay ─────────────────────────────────────
    // Phone runs useDistanceCheck and emits this; we forward it to the
    // candidate's laptop so PreExamChecks can update its gate state.
    socket.on('mobile_cam_distance_status', (data) => {
      if (!socket.mobileSession) return;
      const { candidateId } = socket.mobileSession;
      io.to(`user_${candidateId}`).emit('mobile_cam_distance_status', {
        status:    data.status,   // 'ok' | 'too_close' | 'no_face'
        timestamp: new Date(),
      });
    });

    // ── Mobile camera frame relay ─────────────────────────────────────────────
    socket.on('mobile_cam_frame', (data) => {
      if (!socket.mobileSession) return;
      if (socket.examEnded) return; // stop relaying after exam ends
      const { frame } = data || {};
      if (!frame) return;

      const payload = {
        assignmentId: socket.mobileSession.assignmentId,
        candidateId:  socket.mobileSession.candidateId,
        frame,
        timestamp: new Date(),
      };

      // Recruiter room — existing line
      io.to(`test_${socket.mobileSession.testId}`).emit('secondary_camera_frame', payload);

      // ADD THIS — candidate also receives their own Camera 2 frames for AI detection
      io.to(`user_${socket.mobileSession.candidateId}`).emit('secondary_camera_frame', payload);
    });

    // ── Recruiter joins test room ─────────────────────────────────────────────
    socket.on('join_test_room', (testId) => {
      if (socket.userRole === 'recruiter' || socket.userRole === 'admin') {
        socket.join(`test_${testId}`);
        console.log(`User ${socket.userId} joined test room: ${testId}`);
      }
    });

    socket.on('leave_test_room', (testId) => {
      socket.leave(`test_${testId}`);
    });

    // ── Proctoring event from candidate ───────────────────────────────────────
    socket.on('proctoring_event', async (data) => {
      try {
        const { testId, eventType, eventDescription, severity, latitude, longitude } = data;
        const candidateId = socket.userId;

        const assignment = await TestCandidate.getAssignment(testId, candidateId);
        if (!assignment) {
          socket.emit('error', { message: 'Assignment not found' });
          return;
        }

        const logId = await MonitoringLog.saveLog({
          assignment_id: assignment.assignment_id,
          event_type: eventType,
          event_description: eventDescription,
          severity: severity || 'medium',
          latitude,
          longitude,
          user_agent: socket.handshake.headers['user-agent'],
          ip_address: socket.handshake.address,
        });

        if (eventType === 'tab_switch') {
          await TestCandidate.incrementTabSwitches(testId, candidateId);
        } else if (eventType === 'window_blur') {
          await TestCandidate.incrementWindowBlurs(testId, candidateId);
        }

        io.to(`test_${testId}`).emit('candidate_event', {
          assignmentId: assignment.assignment_id,
          candidateId,
          eventType,
          eventDescription,
          severity,
          timestamp: new Date(),
        });

        socket.emit('event_logged', { logId });
      } catch (error) {
        console.error('Proctoring event error:', error);
        socket.emit('error', { message: 'Failed to log event' });
      }
    });

    // ── Heartbeat ─────────────────────────────────────────────────────────────
    socket.on('heartbeat', async (data) => {
      const { testId } = data;
      io.to(`test_${testId}`).emit('candidate_active', {
        candidateId: socket.userId,
        timestamp: new Date(),
      });
    });

    // ── Snapshot notification ─────────────────────────────────────────────────
    socket.on('snapshot_captured', async (data) => {
      const { testId, snapshotUrl } = data;
      io.to(`test_${testId}`).emit('new_snapshot', {
        candidateId: socket.userId,
        snapshotUrl,
        timestamp: new Date(),
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);

      // Notify recruiter if this was a mobile camera
      if (socket.mobileSession) {
        const disconnectPayload = {
          assignmentId: socket.mobileSession.assignmentId,
          candidateId: socket.mobileSession.candidateId,
          status: 'disconnected',
          timestamp: new Date(),
        };
        // Notify candidate directly
        io.to(`user_${socket.mobileSession.candidateId}`).emit('secondary_camera_status', disconnectPayload);
        // Notify recruiter room
        io.to(`test_${socket.mobileSession.testId}`).emit('secondary_camera_status', disconnectPayload);
      }
    });
  });

  return io;
}

module.exports = initializeSocket;