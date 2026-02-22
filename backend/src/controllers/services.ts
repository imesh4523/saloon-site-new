import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get services for a salon
export const getServices = async (req: Request, res: Response) => {
    try {
        const salonId = req.query.salonId as string;

        let whereClause: any = { is_active: true };
        if (salonId) {
            whereClause.salon_id = salonId;
        }

        const services = await prisma.services.findMany({
            where: whereClause,
            include: {
                service_categories: {
                    select: { name: true, icon: true }
                }
            }
        });

        res.json(services);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
};
