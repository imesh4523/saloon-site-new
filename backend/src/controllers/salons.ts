import { Request, Response } from 'express';
import { PrismaClient, salon_status } from '@prisma/client';

const prisma = new PrismaClient();

// Get all salons (public)
export const getSalons = async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string;

        let whereClause = {};
        if (status) {
            whereClause = { status: status as salon_status };
        }

        const salons = await prisma.salons.findMany({
            where: whereClause,
            orderBy: { rating: 'desc' }
        });

        res.json(salons);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch salons' });
    }
};

// Get single salon by ID
export const getSalonById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const salon = await prisma.salons.findUnique({
            where: { id }
        });

        if (!salon) return res.status(404).json({ error: 'Salon not found' });

        res.json(salon);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch salon' });
    }
};

// Get single salon by Slug
export const getSalonBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const salon = await prisma.salons.findUnique({
            where: { slug }
        });

        if (!salon) return res.status(404).json({ error: 'Salon not found' });

        res.json(salon);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch salon' });
    }
};
