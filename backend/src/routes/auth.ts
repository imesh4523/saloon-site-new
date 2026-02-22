import { Router } from 'express';
import { signUp, signIn, getSession, updateProfile, forgotPassword } from '../controllers/auth';
import { googleAuth, googleCallback } from '../controllers/googleAuth';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/sign-in', signIn);  // alias
router.post('/sign-up', signUp);  // alias
router.get('/session', authenticateToken, getSession);
router.patch('/profile', authenticateToken, updateProfile as any);
router.post('/forgot-password', forgotPassword);

// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback as any);

export default router;

