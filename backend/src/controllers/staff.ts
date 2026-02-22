import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get staff for a salon
export const getStaff = async (req: Request, res: Response) => {
    try {
        const salonId = req.query.salonId as string;

        let whereClause: any = { is_active: true };
        if (salonId) {
            whereClause.salon_id = salonId;
        }

        const staffMembers = await prisma.staff.findMany({
            where: whereClause
        });

        res.json(staffMembers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
};
