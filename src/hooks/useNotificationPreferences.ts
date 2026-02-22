import { useState, useEffect, useCallback } from 'react';
import { api } from '@/integrations/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface NotificationPreferences {
  push_enabled: boolean;
  push_booking_updates: boolean;
  push_reminders: boolean;
  push_payment_updates: boolean;
  email_booking_confirm: boolean;
  email_booking_reminder: boolean;
  email_booking_complete: boolean;
  email_booking_cancelled: boolean;
  email_payment_received: boolean;
  email_promotions: boolean;
  sms_enabled: boolean;
}

const defaultPreferences: NotificationPreferences = {
  push_enabled: true,
  push_booking_updates: true,
  push_reminders: true,
  push_payment_updates: true,
  email_booking_confirm: true,
  email_booking_reminder: true,
  email_booking_complete: true,
  email_booking_cancelled: true,
  email_payment_received: true,
  email_promotions: false,
  sms_enabled: false,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }

    const fetchPreferences = async () => {
      try {
        const { data } = await api.get(`/profile/notification-preferences`);
        if (data) setPreferences(data);
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const updatePreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      if (!user) return;
      setPreferences(prev => ({ ...prev, [key]: value }));

      try {
        await api.patch(`/profile/notification-preferences`, { [key]: value });
        toast.success('Preference updated');
      } catch (err) {
        setPreferences(prev => ({ ...prev, [key]: !value }));
        toast.error('Failed to update preference');
      }
    },
    [user]
  );

  return { preferences, isLoading, updatePreference };
}
