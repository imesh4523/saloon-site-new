import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const BACKEND_URL = process.env.BACKEND_URL || '';
const FRONTEND_URL = process.env.FRONTEND_URL || '';

// Helper: get user roles from DB
const getUserRoles = async (userId: string): Promise<string[]> => {
    try {
        const roles = await (prisma as any).user_roles.findMany({
            where: { user_id: userId },
            select: { role: true }
        });
        return roles.length > 0 ? roles.map((r: any) => r.role) : ['customer'];
    } catch {
        return ['customer'];
    }
};

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: BACKEND_URL ? `${BACKEND_URL}/api/auth/google/callback` : '/api/auth/google/callback',
        proxy: true,
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email from Google'), undefined);

            // Check if user exists
            let user = await prisma.profiles.findUnique({ where: { email } });

            if (!user) {
                // Create new user from Google profile
                const newUserId = crypto.randomUUID();
                user = await prisma.profiles.create({
                    data: {
                        user_id: newUserId,
                        email,
                        full_name: profile.displayName,
                        avatar_url: profile.photos?.[0]?.value || null,
                        // No password for social login users
                    }
                });

                // Assign default role
                try {
                    await (prisma as any).user_roles.create({
                        data: { user_id: newUserId, role: 'customer' }
                    });
                } catch { /* ignore if table doesn't exist */ }
            }

            return done(null, user);
        } catch (error) {
            return done(error as Error, undefined);
        }
    }));
}

passport.serializeUser((user: any, done) => {
    done(null, user.user_id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.profiles.findUnique({ where: { user_id: id } });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export const googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
});

export const googleCallback = [
    passport.authenticate('google', { session: false, failureRedirect: FRONTEND_URL ? `${FRONTEND_URL}/auth?error=google_failed` : `/auth?error=google_failed` }),
    async (req: any, res: any) => {
        try {
            const user = req.user as any;
            const roles = await getUserRoles(user.user_id);

            const token = jwt.sign(
                { id: user.user_id, email: user.email, roles },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            const params = `token=${token}&id=${user.user_id}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.full_name || '')}&roles=${encodeURIComponent(roles.join(','))}`;
            res.redirect(FRONTEND_URL ? `${FRONTEND_URL}/auth/callback?${params}` : `/auth/callback?${params}`);
        } catch (error) {
            res.redirect(FRONTEND_URL ? `${FRONTEND_URL}/auth?error=google_failed` : `/auth?error=google_failed`);
        }
    }
];

export { passport };
