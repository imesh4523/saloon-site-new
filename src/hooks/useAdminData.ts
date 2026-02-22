import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// Types
export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'credit' | 'debit' | 'refund' | 'commission' | 'payout' | 'adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  assigned_admin_id: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  related_booking_id: string | null;
  related_salon_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null };
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null };
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  profiles?: { full_name: string | null };
}

export interface PayoutRequest {
  id: string;
  salon_id: string;
  wallet_id: string;
  amount: number;
  status: string;
  bank_details: Record<string, unknown> | null;
  processed_by: string | null;
  processed_at: string | null;
  notes: string | null;
  created_at: string;
  salons?: { name: string; owner_id: string };
}

// Fetch all users with profiles and roles
export const useAllUsers = () => {
  return useQuery({
    queryKey: ['all_users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users');
      return data;
    },
  });
};

// Fetch user wallet
export const useUserWallet = (userId?: string) => {
  return useQuery({
    queryKey: ['user_wallet', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await api.get(`/admin/wallets/${userId}`);
      return data as Wallet | null;
    },
    enabled: !!userId,
  });
};

// Fetch wallet transactions
export const useWalletTransactions = (walletId?: string) => {
  return useQuery({
    queryKey: ['wallet_transactions', walletId],
    queryFn: async () => {
      if (!walletId) return [];
      const { data } = await api.get(`/admin/wallets/${walletId}/transactions`);
      return data as WalletTransaction[];
    },
    enabled: !!walletId,
  });
};

// Create/update wallet and add transaction
export const useWalletAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      amount,
      type,
      description,
    }: {
      userId: string;
      amount: number;
      type: 'credit' | 'debit' | 'refund' | 'adjustment';
      description: string;
    }) => {
      const { data } = await api.post('/admin/wallets/adjust', { userId, amount, type, description });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_users'] });
      queryClient.invalidateQueries({ queryKey: ['user_wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet_transactions'] });
      toast.success('Wallet adjusted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to adjust wallet');
    },
  });
};

// Freeze/unfreeze wallet
export const useToggleWalletFreeze = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ walletId, freeze }: { walletId: string; freeze: boolean }) => {
      const { data } = await api.patch(`/admin/wallets/${walletId}/freeze`, { freeze });
      return data;
    },
    onSuccess: (_, { freeze }) => {
      queryClient.invalidateQueries({ queryKey: ['all_users'] });
      queryClient.invalidateQueries({ queryKey: ['user_wallet'] });
      toast.success(`Wallet ${freeze ? 'frozen' : 'unfrozen'} successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update wallet');
    },
  });
};

// Fetch support tickets
export const useSupportTickets = (status?: string) => {
  return useQuery({
    queryKey: ['support_tickets', status],
    queryFn: async () => {
      const { data } = await api.get('/admin/tickets', { params: { status } });
      return data as SupportTicket[];
    },
  });
};

// Fetch ticket messages
export const useTicketMessages = (ticketId?: string) => {
  return useQuery({
    queryKey: ['ticket_messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data } = await api.get(`/admin/tickets/${ticketId}/messages`);
      return data as TicketMessage[];
    },
    enabled: !!ticketId,
  });
};

// Send ticket message
export const useSendTicketMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      senderId,
      message,
      isAdmin,
    }: {
      ticketId: string;
      senderId: string;
      message: string;
      isAdmin: boolean;
    }) => {
      const { data } = await api.post(`/admin/tickets/${ticketId}/messages`, {
        senderId,
        message,
        isAdmin,
      });
      return data;
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket_messages', ticketId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send message');
    },
  });
};

// Update ticket status
export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      status,
      assignedAdminId,
    }: {
      ticketId: string;
      status: 'open' | 'in_progress' | 'resolved' | 'closed';
      assignedAdminId?: string;
    }) => {
      const { data } = await api.patch(`/admin/tickets/${ticketId}/status`, {
        status,
        assignedAdminId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
      toast.success('Ticket updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update ticket');
    },
  });
};

// Fetch activity logs
export const useActivityLogs = (limit = 50) => {
  return useQuery({
    queryKey: ['activity_logs', limit],
    queryFn: async () => {
      const { data } = await api.get('/admin/activity-logs', { params: { limit } });
      return data as ActivityLog[];
    },
  });
};

// Log activity
export const useLogActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      action,
      entityType,
      entityId,
      details,
    }: {
      userId?: string;
      action: string;
      entityType: string;
      entityId?: string;
      details?: Json;
    }) => {
      const { data } = await api.post('/admin/activity-logs', {
        userId,
        action,
        entityType,
        entityId,
        details,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity_logs'] });
    },
  });
};

// Fetch payout requests
export const usePayoutRequests = (status?: string) => {
  return useQuery({
    queryKey: ['payout_requests', status],
    queryFn: async () => {
      const { data } = await api.get('/admin/payout-requests', { params: { status } });
      return data as PayoutRequest[];
    },
  });
};

// Process payout request
export const useProcessPayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payoutId,
      status,
      processedBy,
      notes,
    }: {
      payoutId: string;
      status: 'approved' | 'rejected';
      processedBy: string;
      notes?: string;
    }) => {
      const { data } = await api.patch(`/admin/payout-requests/${payoutId}/process`, {
        status,
        processedBy,
        notes,
      });
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['payout_requests'] });
      toast.success(`Payout ${status} successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process payout');
    },
  });
};

// Update salon commission rate
export const useUpdateSalonCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ salonId, rate }: { salonId: string; rate: number }) => {
      const { data } = await api.patch(`/admin/salons/${salonId}/commission`, { rate });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salons'] });
      toast.success('Commission rate updated!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update commission');
    },
  });
};

// Search users and salons
export const useGlobalSearch = (searchTerm: string) => {
  return useQuery({
    queryKey: ['global_search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return { users: [], salons: [] };
      const { data } = await api.get('/admin/search', { params: { q: searchTerm } });
      return data;
    },
    enabled: searchTerm.length >= 2,
  });
};

// Polling substitution for realtime tickets
export const useRealtimeTickets = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['realtime_tickets_polling'],
    queryFn: async () => {
      // In a real app with WebSockets, we'd do socket.on()
      // For REST, refetchInterval handles the polling automatically
      return true;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
};

// Polling substitution for realtime activity logs
export const useRealtimeActivityLogs = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['realtime_activity_polling'],
    queryFn: async () => {
      return true;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
};

// Fetch all transactions (bookings with payment info)
export interface TransactionData {
  id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  platform_commission: number;
  vendor_payout: number;
  status: string;
  salon_id: string;
  service_id: string;
  customer_id: string;
  salons?: { name: string; owner_id: string };
  services?: { name: string };
}

export const useAllTransactions = (filters?: {
  salonId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentStatus?: string;
}) => {
  return useQuery({
    queryKey: ['all_transactions', filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/transactions', { params: filters });
      return data as TransactionData[];
    },
  });
};

// Get salon financial summary
export const useSalonFinancials = (salonId: string) => {
  return useQuery({
    queryKey: ['salon_financials', salonId],
    queryFn: async () => {
      if (!salonId) return null;
      const { data } = await api.get(`/admin/salons/${salonId}/financials`);
      return data;
    },
    enabled: !!salonId,
  });
};

// ============= BOOKING MANAGEMENT HOOKS =============

export interface BookingWithDetails {
  id: string;
  customer_id: string;
  salon_id: string;
  staff_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_amount: number;
  platform_commission: number;
  vendor_payout: number;
  notes: string | null;
  payment_method: string;
  payment_status: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  salon?: { name: string; logo: string | null };
  staff?: { name: string };
  service?: { name: string };
  customer?: { full_name: string | null; avatar_url: string | null };
}

export const useAllBookings = () => {
  return useQuery({
    queryKey: ['all_bookings'],
    queryFn: async () => {
      const { data } = await api.get('/admin/bookings');
      return data as BookingWithDetails[];
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      const { data } = await api.patch(`/admin/bookings/${bookingId}/cancel`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['salon_bookings'] });
      toast.success('Booking cancelled successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel booking');
    },
  });
};

export const useRefundBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, amount }: { bookingId: string; amount?: number }) => {
      const { data } = await api.post(`/admin/bookings/${bookingId}/refund`, { amount });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['salon_bookings'] });
      toast.success('Booking refunded successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to refund booking');
    },
  });
};

// ============= SERVICE CATEGORY MANAGEMENT HOOKS =============

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string | null;
  display_order: number | null;
  is_active: boolean;
  created_at: string;
}

export const useServiceCategories = () => {
  return useQuery({
    queryKey: ['service_categories'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories');
      return data as ServiceCategory[];
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: { name: string; icon?: string; display_order?: number }) => {
      const { data } = await api.post('/admin/categories', category);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_categories'] });
      toast.success('Category created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create category');
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; icon?: string; display_order?: number; is_active?: boolean }) => {
      const { data } = await api.patch(`/admin/categories/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_categories'] });
      toast.success('Category updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update category');
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/categories/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_categories'] });
      toast.success('Category deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete category');
    },
  });
};

// ============= REVIEW MODERATION HOOKS =============

export interface AdminReview {
  id: string;
  salon_id: string;
  customer_id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  salon?: { name: string };
  customer?: { full_name: string | null; avatar_url: string | null };
}

export const useAllReviews = () => {
  return useQuery({
    queryKey: ['all_reviews'],
    queryFn: async () => {
      const { data } = await api.get('/admin/reviews');
      return data as AdminReview[];
    },
  });
};

export const useHideReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, isHidden, reason }: { reviewId: string; isHidden: boolean; reason?: string }) => {
      const { data } = await api.patch(`/admin/reviews/${reviewId}/hide`, { isHidden, reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_reviews'] });
      toast.success('Review visibility updated!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update review');
    },
  });
};

export const useRespondToReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      const { data } = await api.patch(`/admin/reviews/${reviewId}/respond`, { response });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_reviews'] });
      toast.success('Response saved successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save response');
    },
  });
};
