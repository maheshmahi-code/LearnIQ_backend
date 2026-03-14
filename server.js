/**
 * LearnIQ Platform - Backend Server
 * Node.js + Express REST API
 * (Reloaded)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/database');
const { PORT, CLIENT_URL } = require('./config/environment');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const quizRoutes = require('./routes/quizRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const weaknessRoutes = require('./routes/weaknessRoutes');
const communityRoutes = require('./routes/communityRoutes');
const chatRoutes = require('./routes/chatRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const notesRoutes = require('./routes/notesRoutes');

const app = express();

// Security Headers
app.use(helmet());

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', globalLimiter);

// Strict Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/register attempts per hour
  message: { success: false, message: 'Too many auth attempts, please try again in an hour.' }
});
app.use('/api/auth', authLimiter);

const allowedOrigins = [
  CLIENT_URL,
  'https://learn-iq-frontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/weakness', weaknessRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/notes', notesRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// #region agent log
const { _log } = require('./utils/debugLog');
// #endregion
connectDB()
  .then(() => {
    // #region agent log
    _log('server.js:startup', 'DB connected, server listening', { port: PORT }, 'E');
    // #endregion
    const server = app.listen(PORT, () => {
      console.log(`LearnIQ Server running on port ${PORT}`);
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`\n❌ ERROR: PORT ${PORT} IS ALREADY IN USE ❌`);
        console.error(`Another instance of the backend is already running in a different terminal.`);
        console.error(`Please close other active 'npm run dev' terminals running the server.`);
        process.exit(1);
      } else {
        console.error('Server error:', e);
      }
    });
  })
  .catch((e) => {
    // #region agent log
    _log('server.js:startup:error', 'DB connect failed', { msg: e?.message }, 'E');
    // #endregion
    console.error('Failed to start:', e);
    process.exit(1);
  });
