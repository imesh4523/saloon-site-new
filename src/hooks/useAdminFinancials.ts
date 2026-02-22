import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api';
import { toast } from 'sonner';

export const usePlatformReceivables = () => {
  return useQuery({
    queryKey: ['platform_receivables'],
    queryFn: async () => {
      const { data } = await api.get('/admin/financials/receivables');
      return data;
    },
  });
};

export const usePlatformReceivablesSummary = () => {
  return useQuery({
    queryKey: ['platform_receivables_summary'],
    queryFn: async () => {
      const { data } = await api.get('/admin/financials/receivables-summary');
      return data;
    },
  });
};

export const useAllCommissionSettlements = (type?: string) => {
  return useQuery({
    queryKey: ['all_commission_settlements', type],
    queryFn: async () => {
      const { data } = await api.get('/admin/financials/commission-settlements', { params: { type } });
      return data;
    },
  });
};

export const useCollectCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ salonId, amount, notes }: { salonId: string; amount: number; notes?: string }) => {
      const { data } = await api.post('/admin/financials/collect-commission', { salonId, amount, notes });
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['platform_receivables'] });
      queryClient.invalidateQueries({ queryKey: ['platform_receivables_summary'] });
      queryClient.invalidateQueries({ queryKey: ['salons'] });
      queryClient.invalidateQueries({ queryKey: ['all_commission_settlements'] });

      if (data?.wasUnfrozen) {
        toast.success('Commission collected! Salon has been automatically unfrozen.');
      } else {
        toast.success('Commission collected successfully!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to collect commission');
    },
  });
};

export const useFinancialOverview = () => {
  return useQuery({
    queryKey: ['financial_overview'],
    queryFn: async () => {
      const { data } = await api.get('/admin/financials/overview');
      return data;
    },
  });
};
