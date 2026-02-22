import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';
import type { BookingStatus } from '@/types';
import { generateUniqueSlug } from '@/lib/slug';

export interface StaffShift {
  id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  staff?: { name: string; avatar_url: string | null };
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

export interface ServicePopularity {
  name: string;
  count: number;
  revenue: number;
}

// Fetch staff shifts
export const useStaffShifts = (salonId?: string, date?: Date) => {
  return useQuery({
    queryKey: ['staff_shifts', salonId, date?.toISOString()],
    queryFn: async () => {
      if (!salonId) return [];
      const dateStr = date ? format(date, 'yyyy-MM-dd') : undefined;
      const { data } = await api.get(`/staff-shifts`, { params: { salonId, date: dateStr } });
      return data as StaffShift[];
    },
    enabled: !!salonId,
  });
};

// Create staff shift
export const useCreateStaffShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shift: {
      staff_id: string;
      date: string;
      start_time: string;
      end_time: string;
      notes?: string;
    }) => {
      const { data } = await api.post(`/staff-shifts`, shift);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_shifts'] });
      toast.success('Shift created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create shift');
    },
  });
};

// Update staff shift
export const useUpdateStaffShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<StaffShift>;
    }) => {
      const { data } = await api.patch(`/staff-shifts/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_shifts'] });
      toast.success('Shift updated!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update shift');
    },
  });
};

// Delete staff shift
export const useDeleteStaffShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/staff-shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_shifts'] });
      toast.success('Shift deleted!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete shift');
    },
  });
};

// Analytics: Revenue by date
export const useRevenueAnalytics = (salonId?: string, months = 3) => {
  return useQuery({
    queryKey: ['revenue_analytics', salonId, months],
    queryFn: async () => {
      if (!salonId) return [];
      const { data } = await api.get(`/analytics/revenue`, { params: { salonId, months } });
      return data;
    },
    enabled: !!salonId,
  });
};

// Analytics: Service popularity
export const useServicePopularity = (salonId?: string) => {
  return useQuery({
    queryKey: ['service_popularity', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data } = await api.get(`/analytics/services`, { params: { salonId } });
      return data;
    },
    enabled: !!salonId,
  });
};

// Analytics: Customer demographics
export const useCustomerDemographics = (salonId?: string) => {
  return useQuery({
    queryKey: ['customer_demographics', salonId],
    queryFn: async () => {
      if (!salonId) return { totalCustomers: 0, repeatCustomers: 0, avgBookingsPerCustomer: 0 };
      const { data } = await api.get(`/analytics/demographics`, { params: { salonId } });
      return data;
    },
    enabled: !!salonId,
  });
};

// Monthly summary
export const useMonthlySummary = (salonId?: string) => {
  return useQuery({
    queryKey: ['monthly_summary', salonId],
    queryFn: async () => {
      if (!salonId) return null;
      const { data } = await api.get(`/analytics/monthly-summary`, { params: { salonId } });
      return data;
    },
    enabled: !!salonId,
  });
};

// Request payout
export const useRequestPayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      salonId,
      walletId,
      amount,
      bankDetails,
    }: {
      salonId: string;
      walletId: string;
      amount: number;
      bankDetails: Json;
    }) => {
      const { data } = await api.post(`/payout-requests`, {
        salon_id: salonId,
        wallet_id: walletId,
        amount,
        bank_details: bankDetails,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout_requests'] });
      toast.success('Payout request submitted!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit payout request');
    },
  });
};

// Update salon visibility
export const useUpdateSalonVisibility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      salonId,
      status,
    }: {
      salonId: string;
      status: 'approved' | 'suspended';
    }) => {
      const { data } = await api.patch(`/salons/${salonId}/status`, { status });
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['my_salon'] });
      queryClient.invalidateQueries({ queryKey: ['salons'] });
      toast.success(`Store is now ${status === 'approved' ? 'Online' : 'Offline'}!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update visibility');
    },
  });
};

// Create staff member
export const useCreateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staff: {
      salon_id: string;
      name: string;
      title?: string;
      bio?: string;
      avatar_url?: string;
    }) => {
      const { data } = await api.post(`/staff`, staff);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member added!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add staff');
    },
  });
};

// Update staff member
export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{ name: string; title: string; bio: string; avatar_url: string; is_active: boolean }>;
    }) => {
      const { data } = await api.patch(`/staff/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff updated!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update staff');
    },
  });
};

// Create service
export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: {
      salon_id: string;
      name: string;
      description?: string;
      price: number;
      duration_minutes: number;
      category_id?: string;
    }) => {
      const { data } = await api.post(`/services`, service);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service created!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create service');
    },
  });
};

// Update service
export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        name: string;
        description: string;
        price: number;
        duration_minutes: number;
        is_active: boolean;
        category_id: string;
      }>;
    }) => {
      const { data } = await api.patch(`/services/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service updated!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update service');
    },
  });
};

// Create new salon with auto-generated slug
export const useCreateSalon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salon: {
      owner_id: string;
      name: string;
      description?: string;
      address: string;
      city: string;
      phone?: string;
      email?: string;
      latitude?: number;
      longitude?: number;
      province_id?: string;
      district_id?: string;
      town_id?: string;
    }) => {
      // Slug logic is better placed on the backend but keeping it consistent here
      const slug = await generateUniqueSlug(salon.name);

      const { data } = await api.post(`/salons`, {
        ...salon,
        slug,
        status: 'pending',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_salon'] });
      queryClient.invalidateQueries({ queryKey: ['salons'] });
      toast.success('Salon created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create salon');
    },
  });
};

// Update salon details
export const useUpdateSalon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      salonId,
      updates,
    }: {
      salonId: string;
      updates: Partial<{
        name: string;
        slug: string;
        description: string | null;
        address: string;
        city: string;
        phone: string | null;
        email: string | null;
        cover_image: string | null;
        logo: string | null;
        latitude: number | null;
        longitude: number | null;
        province_id: string | null;
        district_id: string | null;
        town_id: string | null;
      }>;
    }) => {
      let finalUpdates = { ...updates };
      if (updates.name) {
        finalUpdates.slug = await generateUniqueSlug(updates.name, salonId);
      }

      const { data } = await api.patch(`/salons/${salonId}`, finalUpdates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_salon'] });
      queryClient.invalidateQueries({ queryKey: ['salons'] });
      toast.success('Salon details updated!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update salon');
    },
  });
};

// Upload salon image (cover or logo) - Now requires different logic usually in Node, maybe multipart/form-data
export const useUploadSalonImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      salonId,
      file,
      type,
    }: {
      salonId: string;
      file: File;
      type: 'cover' | 'logo';
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      // Assumes we will add an upload endpoint in Node
      const { data } = await api.post(`/salons/${salonId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_salon'] });
      queryClient.invalidateQueries({ queryKey: ['salons'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload image');
    },
  });
};

// Salon completion rate
export const useSalonCompletionRate = (salonId?: string) => {
  return useQuery({
    queryKey: ['salon_completion_rate', salonId],
    queryFn: async () => {
      if (!salonId) return { completed: 0, total: 0, rate: 0, previousRate: undefined };
      const { data } = await api.get(`/analytics/completion-rate`, { params: { salonId } });
      return data;
    },
    enabled: !!salonId,
  });
};
