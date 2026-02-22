import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api';
import { toast } from 'sonner';

export const useSalonPlatformPayable = (salonId?: string) => {
  return useQuery({
    queryKey: ['salon_platform_payable', salonId],
    queryFn: async () => {
      if (!salonId) return null;
      const { data } = await api.get(`/vendor/financials/platform-payable/${salonId}`);
      return data;
    },
    enabled: !!salonId,
  });
};

export const useCommissionSettlements = (salonId?: string) => {
  return useQuery({
    queryKey: ['commission_settlements', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data } = await api.get(`/vendor/financials/commission-settlements/${salonId}`);
      return data;
    },
    enabled: !!salonId,
  });
};

export const useVendorWallet = (userId?: string, salonId?: string) => {
  return useQuery({
    queryKey: ['vendor_wallet', userId, salonId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await api.get(`/vendor/financials/wallet`, { params: { userId, salonId } });
      return data;
    },
    enabled: !!userId,
  });
};

export const usePaymentMethodBreakdown = (salonId?: string) => {
  return useQuery({
    queryKey: ['payment_method_breakdown', salonId],
    queryFn: async () => {
      if (!salonId) return { cash: 0, online: 0, crypto: 0 };
      const { data } = await api.get(`/vendor/financials/payment-breakdown/${salonId}`);
      return data;
    },
    enabled: !!salonId,
  });
};

export const useSettleCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ salonId, amount, notes }: { salonId: string; amount: number; notes?: string }) => {
      const { data } = await api.post('/vendor/financials/settle-commission', { salonId, amount, notes });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon_platform_payable'] });
      queryClient.invalidateQueries({ queryKey: ['commission_settlements'] });
      toast.success('Settlement request recorded. Admin will verify payment.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to record settlement');
    },
  });
};
