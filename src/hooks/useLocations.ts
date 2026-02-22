import { useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/api';

export interface Province {
  id: string;
  name_en: string;
  name_si: string;
  code: string;
  created_at: string;
}

export interface District {
  id: string;
  province_id: string;
  name_en: string;
  name_si: string;
  code: string;
  created_at: string;
}

export interface Town {
  id: string;
  district_id: string;
  name_en: string;
  name_si: string;
  postal_code: string | null;
  created_at: string;
}

export const useProvinces = () => {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const { data } = await api.get('/locations/provinces');
      return data as Province[];
    },
    staleTime: 1000 * 60 * 60,
  });
};

export const useDistricts = (provinceId: string | null) => {
  return useQuery({
    queryKey: ['districts', provinceId],
    queryFn: async () => {
      if (!provinceId) return [];
      const { data } = await api.get(`/locations/districts`, { params: { provinceId } });
      return data as District[];
    },
    enabled: !!provinceId,
    staleTime: 1000 * 60 * 60,
  });
};

export const useAllDistricts = () => {
  return useQuery({
    queryKey: ['districts', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/locations/districts');
      return data as District[];
    },
    staleTime: 1000 * 60 * 60,
  });
};

export const useTowns = (districtId: string | null) => {
  return useQuery({
    queryKey: ['towns', districtId],
    queryFn: async () => {
      if (!districtId) return [];
      const { data } = await api.get(`/locations/towns`, { params: { districtId } });
      return data as Town[];
    },
    enabled: !!districtId,
    staleTime: 1000 * 60 * 60,
  });
};

export const useAllTowns = () => {
  return useQuery({
    queryKey: ['towns', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/locations/towns');
      return data as Town[];
    },
    staleTime: 1000 * 60 * 60,
  });
};

export const getLocationDisplayName = (
  town?: Town | null,
  district?: District | null,
  province?: Province | null
): string => {
  const parts: string[] = [];
  if (town) parts.push(town.name_en);
  if (district) parts.push(district.name_en);
  if (parts.length === 0 && province) parts.push(province.name_en);
  return parts.join(', ');
};
