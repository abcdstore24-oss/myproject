/**
 * TalentProctor Backend Server
 * Main entry point for the Express application
 */

require('dotenv').config();

// Guard: crash immediately if critical env vars are missing
// so tokens are never signed with the string "undefined"
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('   Create a .env file based on .env.example and restart.');
  process.exit(1);
}

const http = require('http');
const app = require('./src/app');
const { testDatabaseConnection, pool } = require('./src/config/database');
const initializeSocket = require('./src/config/socketConfig'); 
const { checkDockerAvailable } = require('./src/services/codeExecutor');

const PORT = process.env.PORT || 5000;

// Test database connection before starting server
testDatabaseConnection()
  .then(async () => {
    // Warn loudly if Docker is unavailable — coding questions will score 0 silently otherwise
    const dockerOk = await checkDockerAvailable();
    if (!dockerOk) {
      console.warn('⚠️  WARNING: Docker is not available or not running.');
      console.warn('   Coding questions will NOT be evaluated until Docker is started.');
      console.warn('   All coding submissions will score 0 until this is resolved.');
    } else {
      console.log('🐳 Docker: Available');
    }

    // Create HTTP server (needed for Socket.io)
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = initializeSocket(server);  // ← ADD
    app.set('io', io);  // ← ADD

    // Start the server
    server.listen(PORT, () => {
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║                                                        ║');
      console.log('║          🎓 TalentProctor Backend Server               ║');
      console.log('║                                                        ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  Status:      ✅ Server Running                        ║`);
      console.log(`║  Port:        🚀 ${PORT}                                  ║`);
      console.log(`║  Environment: 🌍 ${process.env.NODE_ENV || 'development'}                           ║`);
      console.log(`║  Database:    ✅ MySQL Connected                       ║`);
      console.log(`║  Socket.io:   📡 Real-time Proctoring Enabled          ║`);  // ← ADD
      console.log('║                                                        ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  API URL:     http://localhost:${PORT}/api                ║`);
      console.log(`║  Health:      http://localhost:${PORT}/api/health         ║`);
      console.log('╚════════════════════════════════════════════════════════╝');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('⚠️  SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');
        pool.end(() => {
          console.log('✅ DB pool closed');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', () => {
      console.log('\n⚠️  SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');
        pool.end(() => {
          console.log('✅ DB pool closed');
          process.exit(0);
        });
      });
    });
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  });