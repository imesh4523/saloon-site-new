import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { PrismaClient } from './generated/prisma';

dotenv.config();

// Initialize Google OAuth strategy (must be done after dotenv.config)
import './controllers/googleAuth';

const app = express();
const port = process.env.PORT || 5000;
const prisma = new PrismaClient();

import authRoutes from './routes/auth';
import salonRoutes from './routes/salons';
import servicesRoutes from './routes/services';
import staffRoutes from './routes/staff';
import bookingsRoutes from './routes/bookings';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

app.use(cors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'session-secret',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/bookings', bookingsRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
