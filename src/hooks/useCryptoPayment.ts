import { useState, useEffect, useCallback } from 'react';
import { api } from '@/integrations/api';

export type CryptoPaymentStatus =
  | 'waiting' | 'confirming' | 'confirmed' | 'sending'
  | 'partially_paid' | 'finished' | 'failed' | 'refunded' | 'expired';

export interface CryptoPaymentInfo {
  payment_id: string;
  invoice_id: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  status: CryptoPaymentStatus;
  actually_paid?: number;
  expires_at: string;
  paid_at?: string;
}

export interface CreateInvoiceParams {
  price_amount: number;
  price_currency?: string;
  pay_currency: string;
  order_id: string;
  order_description?: string;
}

export const useCryptoPayment = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<CryptoPaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createInvoice = useCallback(async (params: CreateInvoiceParams) => {
    setIsCreating(true);
    setError(null);

    try {
      const { data } = await api.post('/payments/crypto/create-invoice', params);
      if (!data?.success) throw new Error(data?.error || 'Failed to create invoice');

      const info: CryptoPaymentInfo = {
        payment_id: data.payment_id,
        invoice_id: data.invoice_id,
        pay_address: data.pay_address,
        pay_amount: data.pay_amount,
        pay_currency: data.pay_currency,
        price_amount: data.price_amount,
        price_currency: data.price_currency,
        status: 'waiting',
        expires_at: data.expires_at,
      };

      setPaymentInfo(info);
      return info;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create invoice';
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const checkStatus = useCallback(async (paymentId: string) => {
    try {
      const { data } = await api.post('/payments/crypto/check-status', { payment_id: paymentId });
      if (data?.success) {
        return {
          status: data.status as CryptoPaymentStatus,
          actually_paid: data.actually_paid,
          paid_at: data.paid_at,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!paymentInfo || !isPolling) return;
    if (['confirmed', 'finished', 'failed', 'expired', 'refunded'].includes(paymentInfo.status)) {
      setIsPolling(false);
      return;
    }

    const pollInterval = setInterval(async () => {
      const result = await checkStatus(paymentInfo.payment_id);
      if (result) {
        setPaymentInfo(prev => prev ? { ...prev, ...result } : prev);
        if (['confirmed', 'finished', 'failed', 'expired', 'refunded'].includes(result.status)) {
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [paymentInfo, isPolling, checkStatus]);

  const startPolling = useCallback(() => setIsPolling(true), []);
  const stopPolling = useCallback(() => setIsPolling(false), []);
  const reset = useCallback(() => { setPaymentInfo(null); setIsPolling(false); setError(null); }, []);

  return {
    createInvoice, checkStatus, startPolling, stopPolling, reset,
    paymentInfo, isCreating, isPolling, error,
    isConfirmed: paymentInfo?.status === 'confirmed' || paymentInfo?.status === 'finished',
    isFailed: paymentInfo?.status === 'failed',
    isExpired: paymentInfo?.status === 'expired',
    isPending: paymentInfo?.status === 'waiting' || paymentInfo?.status === 'confirming',
  };
};

export default useCryptoPayment;
