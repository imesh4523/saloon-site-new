import { api } from '@/integrations/api';

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

export const isValidSlug = (slug: string): boolean => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

export const generateUniqueSlug = async (name: string, excludeId?: string): Promise<string> => {
  const baseSlug = generateSlug(name);
  try {
    const { data } = await api.get('/salons/check-slug', { params: { slug: baseSlug, excludeId } });
    return data.slug || baseSlug;
  } catch {
    // Fallback: append timestamp, let backend handle final uniqueness
    return `${baseSlug}-${Date.now()}`;
  }
};
