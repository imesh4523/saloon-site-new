import { useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/api';

interface BookedSlot {
  start_time: string;
  end_time: string;
  status: string;
}

export const useBookedSlots = (
  staffId: string | undefined,
  salonId: string | undefined,
  date: Date | undefined
) => {
  const dateStr = date?.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['booked_slots', staffId, salonId, dateStr],
    queryFn: async () => {
      if (!staffId || !salonId || !dateStr) return [];
      const { data } = await api.get('/bookings/booked-slots', {
        params: { staffId, salonId, date: dateStr }
      });
      return data as BookedSlot[];
    },
    enabled: !!staffId && !!salonId && !!dateStr,
    staleTime: 1000 * 30,
  });
};

export const isSlotAvailable = (
  slotTime: string,
  bookedSlots: BookedSlot[],
  serviceDurationMinutes: number = 30
): boolean => {
  if (!bookedSlots || bookedSlots.length === 0) return true;

  const [slotHour, slotMinute] = slotTime.split(':').map(Number);
  const slotStart = slotHour * 60 + slotMinute;
  const slotEnd = slotStart + serviceDurationMinutes;

  for (const booking of bookedSlots) {
    const [bookingStartHour, bookingStartMinute] = booking.start_time.split(':').map(Number);
    const [bookingEndHour, bookingEndMinute] = booking.end_time.split(':').map(Number);
    const bookingStart = bookingStartHour * 60 + bookingStartMinute;
    const bookingEnd = bookingEndHour * 60 + bookingEndMinute;

    if (slotStart < bookingEnd && slotEnd > bookingStart) return false;
  }

  return true;
};

export const getAvailableTimeSlots = (
  allSlots: string[],
  bookedSlots: BookedSlot[],
  serviceDurationMinutes: number = 30
): { time: string; available: boolean }[] => {
  return allSlots.map(time => ({
    time,
    available: isSlotAvailable(time, bookedSlots, serviceDurationMinutes),
  }));
};
