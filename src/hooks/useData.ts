import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api';
import { toast } from 'sonner';

type SalonStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Fetch all salons (for explore/home)
export const useSalons = (status?: SalonStatus) => {
  return useQuery({
    queryKey: ['salons', status],
    queryFn: async () => {
      const { data } = await api.get('/salons', { params: { status } });
      return data;
    },
  });
};

// Fetch single salon by ID - skip query for invalid UUIDs
export const useSalon = (id: string) => {
  return useQuery({
    queryKey: ['salon', id],
    queryFn: async () => {
      if (!isValidUUID(id)) return null;
      try {
        const { data } = await api.get(`/salons/${id}`);
        return data;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!id,
  });
};

// Fetch single salon by slug
export const useSalonBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['salon', 'slug', slug],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/salons/slug/${slug}`);
        return data;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!slug,
  });
};

// Fetch services for a salon
export const useServices = (salonId?: string) => {
  return useQuery({
    queryKey: ['services', salonId],
    queryFn: async () => {
      if (salonId && !isValidUUID(salonId)) return [];
      const { data } = await api.get('/services', { params: { salonId } });
      return data;
    },
  });
};

// Fetch staff for a salon
export const useStaff = (salonId?: string) => {
  return useQuery({
    queryKey: ['staff', salonId],
    queryFn: async () => {
      if (salonId && !isValidUUID(salonId)) return [];
      const { data } = await api.get('/staff', { params: { salonId } });
      return data;
    },
  });
};

// Fetch staff availability
export const useStaffAvailability = (staffId: string) => {
  return useQuery({
    queryKey: ['staff_availability', staffId],
    queryFn: async () => {
      const { data } = await api.get(`/staff/${staffId}/availability`); // Requires API endpoint
      return data;
    },
    enabled: !!staffId,
  });
};

// Fetch reviews for a salon
export const useReviews = (salonId: string) => {
  return useQuery({
    queryKey: ['reviews', salonId],
    queryFn: async () => {
      if (!isValidUUID(salonId)) return [];
      const { data } = await api.get(`/salons/${salonId}/reviews`); // Requires API endpoint
      return data;
    },
    enabled: !!salonId,
  });
};

// Fetch bookings for customer
export const useMyBookings = (customerId?: string) => {
  return useQuery({
    queryKey: ['my_bookings', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data } = await api.get('/bookings/customer', { params: { customerId } });
      return data;
    },
    enabled: !!customerId,
  });
};

// Fetch bookings for vendor
export const useSalonBookings = (salonId?: string) => {
  return useQuery({
    queryKey: ['salon_bookings', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data } = await api.get('/bookings/salon', { params: { salonId } });
      return data;
    },
    enabled: !!salonId,
  });
};

// Create booking
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: {
      customer_id: string;
      salon_id: string;
      staff_id: string;
      service_id: string;
      booking_date: string;
      start_time: string;
      end_time: string;
      total_amount: number;
      platform_commission: number;
      vendor_payout: number;
      notes?: string;
      payment_method: 'cash' | 'online';
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    }) => {
      const { data } = await api.post('/bookings', booking);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['salon_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked_slots'] });
      toast.success('Booking created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Failed to create booking');
    },
  });
};

// Update booking status
export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { data } = await api.patch(`/bookings/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['salon_bookings'] });
      toast.success('Booking status updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update booking');
    },
  });
};

// Fetch service categories
export const useServiceCategories = () => {
  return useQuery({
    queryKey: ['service_categories'],
    queryFn: async () => {
      const { data } = await api.get('/services/categories'); // Requires API endpoint
      return data;
    },
  });
};

// Admin: Update salon status
export const useUpdateSalonStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SalonStatus }) => {
      const { data } = await api.patch(`/salons/${id}/status`, { status }); // Requires API endpoint
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salons'] });
      toast.success(`Salon ${variables.status} successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update salon status');
    },
  });
};

// Vendor: Get my salon
export const useMySalon = (ownerId?: string) => {
  return useQuery({
    queryKey: ['my_salon', ownerId],
    queryFn: async () => {
      if (!ownerId) return null;
      try {
        const { data } = await api.get('/salons', { params: { ownerId } });
        // If ownerId returns a list, find the first or adjust endpoint
        return Array.isArray(data) ? data[0] || null : data;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!ownerId,
  });
};

// Admin: Get platform stats
export const usePlatformStats = () => {
  return useQuery({
    queryKey: ['platform_stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/platform_stats'); // Requires API endpoint
      return data;
    },
  });
};
