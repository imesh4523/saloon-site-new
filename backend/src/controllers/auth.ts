import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma';
import crypto from 'crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helper: fetch roles for a user
const getUserRoles = async (userId: string): Promise<string[]> => {
    try {
        const roles = await (prisma as any).user_roles.findMany({
            where: { user_id: userId },
            select: { role: true }
        });
        return roles.map((r: any) => r.role);
    } catch {
        return ['customer']; // default role
    }
};

export const signUp = async (req: Request, res: Response) => {
    try {
        const { email, password, full_name } = req.body;

        const existingUser = await prisma.profiles.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUserId = crypto.randomUUID();

        const newUser = await prisma.profiles.create({
            data: {
                user_id: newUserId,
                email,
                encrypted_password: hashedPassword,
                full_name,
            }
        });

        // Assign default 'customer' role
        try {
            await (prisma as any).user_roles.create({
                data: { user_id: newUserId, role: 'customer' }
            });
        } catch { /* table may not exist yet */ }

        const roles = ['customer'];
        const token = jwt.sign(
            { id: newUser.user_id, email: newUser.email, roles },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser.user_id,
                email: newUser.email,
                full_name: newUser.full_name,
                roles
            },
            session: { access_token: token }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during signup' });
    }
};

export const signIn = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.profiles.findUnique({ where: { email } });

        if (!user || !user.encrypted_password) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.encrypted_password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Fetch roles from database
        const roles = await getUserRoles(user.user_id);

        const token = jwt.sign(
            { id: user.user_id, email: user.email, roles },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                roles
            },
            session: { access_token: token }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during signin' });
    }
};

export const getSession = async (req: any, res: Response) => {
    try {
        const user = await prisma.profiles.findUnique({
            where: { user_id: req.user.id },
            select: { user_id: true, email: true, full_name: true, avatar_url: true, phone: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const roles = await getUserRoles(user.user_id);

        res.json({
            user: {
                id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                phone: user.phone,
                roles
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateProfile = async (req: any, res: Response) => {
    try {
        const { full_name, phone, avatar_url } = req.body;

        const updated = await prisma.profiles.update({
            where: { user_id: req.user.id },
            data: {
                ...(full_name !== undefined && { full_name }),
                ...(phone !== undefined && { phone }),
                ...(avatar_url !== undefined && { avatar_url }),
                updated_at: new Date(),
            },
            select: { user_id: true, email: true, full_name: true, phone: true, avatar_url: true }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await prisma.profiles.findUnique({ where: { email } });

        // Always return success so we don't reveal if email exists
        if (!user) {
            return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }

        // TODO: Generate reset token, store in DB, send email via NodeMailer
        // For now, just return success
        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
