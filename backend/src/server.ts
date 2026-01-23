import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import bookRoutes from './routes/books';
import leaderboardRoutes from './routes/leaderboard';
import commentRoutes from './routes/comments';
import announcementRoutes from './routes/announcements';
import pointRoutes from './routes/points';
import lexileRoutes from './routes/lexile';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/lexile', lexileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { io };

