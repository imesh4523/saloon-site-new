import { Router } from 'express';
import { getMyBookings, getSalonBookings, createBooking, updateBookingStatus, getBookedSlots } from '../controllers/bookings';

const router = Router();

router.get('/booked-slots', getBookedSlots as any);
router.get('/customer', getMyBookings);
router.get('/salon', getSalonBookings);
router.post('/', createBooking);
router.patch('/:id/status', updateBookingStatus);

export default router;
