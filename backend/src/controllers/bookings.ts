import { Request, Response } from 'express';
import { PrismaClient, booking_status } from '@prisma/client';

const prisma = new PrismaClient();

// Get bookings for customer
export const getMyBookings = async (req: Request, res: Response) => {
    try {
        const customerId = req.query.customerId as string;

        if (!customerId) return res.status(400).json({ error: 'Customer ID required' });

        const bookings = await prisma.bookings.findMany({
            where: { customer_id: customerId },
            include: {
                salons: { select: { id: true, name: true, logo: true, address: true, city: true } },
                services: { select: { id: true, name: true, price: true, duration_minutes: true } },
                staff: { select: { id: true, name: true, avatar_url: true, title: true } }
            },
            orderBy: { booking_date: 'desc' }
        });

        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
};

// Get bookings for salon
export const getSalonBookings = async (req: Request, res: Response) => {
    try {
        const salonId = req.query.salonId as string;

        if (!salonId) return res.status(400).json({ error: 'Salon ID required' });

        const bookings = await prisma.bookings.findMany({
            where: { salon_id: salonId },
            include: {
                services: { select: { id: true, name: true, price: true, duration_minutes: true } },
                staff: { select: { id: true, name: true, avatar_url: true, title: true } },
                // Instead of profiles joining natively, we just include the customer ID
                // Note: the frontend relies on `profiles!bookings_customer_id_fkey` which Prisma doesn't do natively unless explicitly mapped
                // Assuming we need to fetch profile manually or if there's no FK, we just provide customer_id
            },
            orderBy: [
                { booking_date: 'asc' },
                { start_time: 'asc' }
            ]
        });

        // If needed, we manually attach profiles
        const customerIds = [...new Set(bookings.map(b => b.customer_id))];
        const profiles = await prisma.profiles.findMany({
            where: { user_id: { in: customerIds } },
            select: { user_id: true, full_name: true, avatar_url: true, phone: true }
        });

        const profileMap = new Map(profiles.map(p => [p.user_id, p]));

        const formattedBookings = bookings.map(b => ({
            ...b,
            profiles: profileMap.get(b.customer_id) || null
        }));

        res.json(formattedBookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch salon bookings' });
    }
};

// Create booking
export const createBooking = async (req: Request, res: Response) => {
    try {
        const {
            customer_id, salon_id, staff_id, service_id,
            booking_date, start_time, end_time, total_amount,
            platform_commission, vendor_payout, notes, payment_method, payment_status
        } = req.body;

        // Check conflicts
        // Note: actual conflict logic involves parsing and comparing times nicely. 
        // We'll keep it simple or align with the frontend's native throw logic
        const existingBookings = await prisma.bookings.findMany({
            where: {
                staff_id,
                salon_id,
                booking_date: new Date(booking_date),
                status: {
                    in: ['pending', 'confirmed', 'in_progress'] as booking_status[]
                }
            },
            select: { start_time: true, end_time: true }
        });

        // Time overlap logic
        const [newStartH, newStartM] = start_time.split(':').map(Number);
        const [newEndH, newEndM] = end_time.split(':').map(Number);
        const newStart = newStartH * 60 + newStartM;
        const newEnd = newEndH * 60 + newEndM;

        for (const existing of existingBookings) {
            // Prisma returns Dates for Time types!
            const eStart = existing.start_time.getHours() * 60 + existing.start_time.getMinutes();
            const eEnd = existing.end_time.getHours() * 60 + existing.end_time.getMinutes();

            if (newStart < eEnd && newEnd > eStart) {
                return res.status(409).json({ error: 'This time slot is already booked. Please choose another time.' });
            }
        }

        const booking = await prisma.bookings.create({
            data: {
                customer_id, salon_id, staff_id, service_id,
                booking_date: new Date(booking_date),
                start_time: new Date(`1970-01-01T${start_time}:00Z`), // Using 1970 to parse time natively
                end_time: new Date(`1970-01-01T${end_time}:00Z`),
                total_amount, platform_commission, vendor_payout, notes,
                payment_method, payment_status,
                status: 'pending' as booking_status
            }
        });

        res.status(201).json(booking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
};

// Update booking status
export const updateBookingStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const booking = await prisma.bookings.update({
            where: { id },
            data: { status: status as booking_status, updated_at: new Date() }
        });

        res.json(booking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
};
