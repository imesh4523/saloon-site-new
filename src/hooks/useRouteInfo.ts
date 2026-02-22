import { useState, useEffect, useCallback, useRef } from 'react';

interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

interface RouteInfo {
  distance: number;
  duration: number;
  durationMinutes: number;
  distanceKm: number;
  source: 'osrm' | 'fallback';
  geometry?: RouteGeometry;
}

export type { RouteInfo, RouteGeometry };

interface UseRouteInfoOptions {
  originLat: number | null;
  originLng: number | null;
  destLat: number | null;
  destLng: number | null;
  enabled?: boolean;
}

interface UseRouteInfoReturn {
  routeInfo: RouteInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const routeCache = new Map<string, { data: RouteInfo; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const getCacheKey = (originLat: number, originLng: number, destLat: number, destLng: number): string =>
  `${originLat.toFixed(4)},${originLng.toFixed(4)}-${destLat.toFixed(4)},${destLng.toFixed(4)}`;

const getCachedRoute = (key: string): RouteInfo | null => {
  const cached = routeCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  if (cached) routeCache.delete(key);
  return null;
};

const setCachedRoute = (key: string, data: RouteInfo): void => {
  routeCache.set(key, { data, timestamp: Date.now() });
};

// Haversine fallback (no external call needed)
const getFallbackRouteInfo = (originLat: number, originLng: number, destLat: number, destLng: number): RouteInfo => {
  const R = 6371;
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLon = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) *
    Math.cos((destLat * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  const durationMinutes = Math.round((distanceKm / 30) * 60);
  return { distance: distanceKm * 1000, duration: durationMinutes * 60, durationMinutes, distanceKm, source: 'fallback' };
};

// Fetch from OSRM public API directly (no Supabase needed)
const fetchOSRMRoute = async (
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  signal?: AbortSignal
): Promise<RouteInfo | null> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      distance: route.distance,
      duration: route.duration,
      durationMinutes: Math.round(route.duration / 60),
      distanceKm: Math.round(route.distance / 100) / 10,
      source: 'osrm',
      geometry: route.geometry,
    };
  } catch {
    return null;
  }
};

export const useRouteInfo = ({
  originLat, originLng, destLat, destLng, enabled = true,
}: UseRouteInfoOptions): UseRouteInfoReturn => {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRoute = useCallback(async () => {
    if (!enabled || originLat === null || originLng === null || destLat === null || destLng === null) return;

    const cacheKey = getCacheKey(originLat, originLng, destLat, destLng);
    const cached = getCachedRoute(cacheKey);
    if (cached) { setRouteInfo(cached); return; }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchOSRMRoute(originLat, originLng, destLat, destLng, abortControllerRef.current.signal);
      if (result) {
        setRouteInfo(result);
        setCachedRoute(cacheKey, result);
      } else {
        const fallback = getFallbackRouteInfo(originLat, originLng, destLat, destLng);
        setRouteInfo(fallback);
        setCachedRoute(cacheKey, fallback);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to get route');
        const fallback = getFallbackRouteInfo(originLat, originLng, destLat, destLng);
        setRouteInfo(fallback);
      }
    } finally {
      setIsLoading(false);
    }
  }, [originLat, originLng, destLat, destLng, enabled]);

  useEffect(() => {
    fetchRoute();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [fetchRoute]);

  const refetch = useCallback(() => {
    if (originLat !== null && originLng !== null && destLat !== null && destLng !== null) {
      routeCache.delete(getCacheKey(originLat, originLng, destLat, destLng));
    }
    fetchRoute();
  }, [fetchRoute, originLat, originLng, destLat, destLng]);

  return { routeInfo, isLoading, error, refetch };
};

interface BatchRouteDestination { id: string; lat: number; lng: number; }
interface BatchRouteResult { [id: string]: RouteInfo | null; }

export const useBatchRouteInfo = (
  originLat: number | null,
  originLng: number | null,
  destinations: BatchRouteDestination[],
  enabled = true
): { routes: BatchRouteResult; isLoading: boolean } => {
  const [routes, setRoutes] = useState<BatchRouteResult>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || originLat === null || originLng === null || destinations.length === 0) return;

    const fetchRoutes = async () => {
      setIsLoading(true);
      const results: BatchRouteResult = {};
      const batchSize = 3;

      for (let i = 0; i < destinations.length; i += batchSize) {
        const batch = destinations.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (dest) => {
          const cacheKey = getCacheKey(originLat, originLng, dest.lat, dest.lng);
          const cached = getCachedRoute(cacheKey);
          if (cached) return { id: dest.id, info: cached };

          const result = await fetchOSRMRoute(originLat, originLng, dest.lat, dest.lng);
          const info = result || getFallbackRouteInfo(originLat, originLng, dest.lat, dest.lng);
          if (result) setCachedRoute(cacheKey, info);
          return { id: dest.id, info };
        }));
        batchResults.forEach(({ id, info }) => { results[id] = info; });
      }

      setRoutes(results);
      setIsLoading(false);
    };

    fetchRoutes();
  }, [originLat, originLng, destinations, enabled]);

  return { routes, isLoading };
};

export const formatTravelDuration = (minutes: number): string => {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `~${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) return `~${hours} hr`;
  return `~${hours} hr ${remainingMinutes} min`;
};

export default useRouteInfo;
