/**
 * Express Application Configuration
 *
 * FIX B-08: candidateRoutes.js is the sole owner of /api/tests/:testId/candidates.
 *           testRoutes.js no longer has duplicate candidate routes.
 *           Section routes keep the original working mount point (/api/tests).
 *
 * FIX B-21: morgan access logging enabled in all environments.
 *           Development → coloured stdout. Production → file at logs/access.log.
 */

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const path      = require('path');
const fs        = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate Limiting ─────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
});

const monitoringLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many monitoring events. Please slow down.' },
});

app.use(globalLimiter);

// ── Body Parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP Access Logging (FIX B-21) ───────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const accessLogStream = fs.createWriteStream(
    path.join(logDir, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  app.use(morgan('dev'));
}

// ── Static Files ──────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success:     true,
    message:     'TalentProctor API is running',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version:     '1.0.0',
  });
});

// Auth
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', require('./routes/authRoutes'));

// Organization
app.use('/api/org', require('./routes/orgRoutes'));

// Users (Admin only)
app.use('/api/users', require('./routes/userRoutes'));

// Tests (Admin, Recruiter)
// testRoutes.js owns: CRUD + GET /:testId/questions
// candidateRoutes.js owns: /:testId/candidates (NOT duplicated in testRoutes)
app.use('/api/tests', require('./routes/testRoutes'));

// Questions (Admin, Recruiter)
// Owns: /api/questions/:id, /api/questions/mcq, /api/questions/coding
app.use('/api/questions', require('./routes/questionRoutes'));

// Sections
// nested mounts at /api/tests — its own /:testId segment produces:
//   GET  /api/tests/:testId/sections
//   POST /api/tests/:testId/sections
// standalone mounts at /api/sections — produces:
//   PUT    /api/sections/:sectionId
//   DELETE /api/sections/:sectionId
const sectionRoutes = require('./routes/sectionRoutes');
app.use('/api/tests',    sectionRoutes.nested);
app.use('/api/sections', sectionRoutes.standalone);

// Candidates (FIX B-08: sole owner of /api/tests/:testId/candidates)
app.use('/api', require('./routes/candidateRoutes'));

// Exam
app.use('/api/exam', require('./routes/examRoutes'));

// Monitoring
app.use('/api/monitoring', monitoringLimiter, require('./routes/monitoringRoutes'));

// Reports
app.use('/api/reports', require('./routes/reportsRoutes'));

// Code Execution
app.use('/api/execution', require('./routes/executionRoutes'));

// ── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path:    req.originalUrl,
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err,
    }),
  });
});

module.exports = app;