import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiEnvelope, ApiError, apiGet } from './api';

type ResourceCacheEntry = { data: unknown; savedAt: number };
type PageCacheEntry = { items: unknown[]; page: number; totalPages: number; total: number; savedAt: number };
type PublicCollection = 'properties' | 'projects';

const resourceCache = new Map<string, ResourceCacheEntry>();
const pageCache = new Map<string, PageCacheEntry>();
const listInvalidationListeners: Record<PublicCollection, Set<() => void>> = {
  properties: new Set(),
  projects: new Set(),
};
const MAX_CACHE_ENTRIES = 24;
const MAX_CACHE_AGE_MS = 15 * 60 * 1000;

function collectionForListPath(path: string): PublicCollection | null {
  if (path === '/properties' || path.startsWith('/properties?')) return 'properties';
  if (path === '/projects' || path.startsWith('/projects?')) return 'projects';
  return null;
}

function invalidateListCachesForDetail(path: string) {
  const collection: PublicCollection | null = path.startsWith('/properties/')
    ? 'properties'
    : path.startsWith('/projects/')
      ? 'projects'
      : null;
  if (!collection) return;

  const collectionPath = `/${collection}`;
  for (const key of resourceCache.keys()) {
    if (key === collectionPath || key.startsWith(`${collectionPath}?`)) resourceCache.delete(key);
  }
  for (const key of pageCache.keys()) {
    if (key === collectionPath || key.startsWith(`${collectionPath}?`)) pageCache.delete(key);
  }
  for (const listener of [...listInvalidationListeners[collection]]) listener();
}

function useListCacheInvalidation(path: string, setRefreshCount: Dispatch<SetStateAction<number>>) {
  const collection = collectionForListPath(path);
  useEffect(() => {
    if (!collection) return;
    const listener = () => setRefreshCount((current) => current + 1);
    listInvalidationListeners[collection].add(listener);
    return () => {
      listInvalidationListeners[collection].delete(listener);
    };
  }, [collection, setRefreshCount]);
}

function readCache<T>(cache: Map<string, T & { savedAt: number }>, key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.savedAt > MAX_CACHE_AGE_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

function remember<T>(cache: Map<string, T>, key: string, value: T) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

function useFreshnessTimer(setIsStale: Dispatch<SetStateAction<boolean>>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const freshAt = useRef<number | null>(null);
  const clearFreshnessTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const resetFreshness = useCallback(() => {
    clearFreshnessTimer();
    freshAt.current = null;
  }, [clearFreshnessTimer]);
  const refreshFreshness = useCallback(() => {
    if (freshAt.current === null) return;
    clearFreshnessTimer();
    const remaining = MAX_CACHE_AGE_MS - (Date.now() - freshAt.current);
    if (remaining <= 0) {
      setIsStale(true);
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      setIsStale(true);
    }, remaining);
  }, [clearFreshnessTimer, setIsStale]);
  const markFresh = useCallback(() => {
    freshAt.current = Date.now();
    setIsStale(false);
    refreshFreshness();
  }, [refreshFreshness, setIsStale]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshFreshness();
    });
    return () => subscription.remove();
  }, [refreshFreshness]);

  useEffect(() => resetFreshness, [resetFreshness]);

  return { markFresh, resetFreshness };
}

export function useApiResource<T>(path: string) {
  const [data, setData] = useState<T | null>(() => (readCache(resourceCache, path)?.data as T | undefined) || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | undefined>();
  const [isStale, setIsStale] = useState(() => Boolean(readCache(resourceCache, path)));
  const [refreshCount, setRefreshCount] = useState(0);
  const { markFresh, resetFreshness } = useFreshnessTimer(setIsStale);

  const retry = useCallback(() => setRefreshCount((current) => current + 1), []);
  useListCacheInvalidation(path, setRefreshCount);

  useEffect(() => {
    const controller = new AbortController();
    const cached = readCache(resourceCache, path);
    if (cached) {
      setData(cached.data as T);
      setIsStale(true);
    } else {
      setData(null);
      setIsStale(false);
    }
    setLoading(true);
    setError(null);
    setHttpStatus(undefined);

    apiGet<T>(path, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        remember(resourceCache, path, { data: result, savedAt: Date.now() });
        setData(result);
        markFresh();
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const status = reason instanceof ApiError ? reason.status : undefined;
        setHttpStatus(status);
        if (status === 404) {
          resourceCache.delete(path);
          setData(null);
          setIsStale(false);
          invalidateListCachesForDetail(path);
        }
        setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.');
        if (status !== 404) setIsStale(Boolean(cached));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      resetFreshness();
    };
  }, [path, refreshCount, markFresh, resetFreshness]);

  return { data, loading, error, httpStatus, isStale, retry };
}

function pagePath(path: string, page: number, limit: number) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}page=${page}&limit=${limit}`;
}

export function usePaginatedApiResource<T>(path: string, limit = 12) {
  const [items, setItems] = useState<T[]>(() => (readCache(pageCache, path)?.items as T[] | undefined) || []);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | undefined>();
  const [isStale, setIsStale] = useState(() => Boolean(readCache(pageCache, path)));
  const [pageError, setPageError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const { markFresh, resetFreshness } = useFreshnessTimer(setIsStale);
  const pathRef = useRef(path);
  const requestVersion = useRef(0);
  const loadMoreController = useRef<AbortController | null>(null);
  pathRef.current = path;

  const retry = useCallback(() => setRefreshCount((current) => current + 1), []);
  useListCacheInvalidation(path, setRefreshCount);

  useEffect(() => {
    const version = ++requestVersion.current;
    const controller = new AbortController();
    const cached = readCache(pageCache, path);
    loadMoreController.current?.abort();
    loadMoreController.current = null;
    setItems((cached?.items as T[] | undefined) || []);
    setPage(cached?.page || 1);
    setTotalPages(cached?.totalPages || 1);
    setTotal(cached?.total || 0);
    setIsStale(Boolean(cached));
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setHttpStatus(undefined);
    setPageError(null);

    apiGet<ApiEnvelope<T[]>>(pagePath(path, 1, limit), controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        remember(pageCache, path, {
          items: result.data,
          page: result.pagination?.page || 1,
          totalPages: result.pagination?.totalPages || 1,
          total: result.pagination?.total ?? result.data.length,
          savedAt: Date.now(),
        });
        setItems(result.data);
        setPage(result.pagination?.page || 1);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotal(result.pagination?.total ?? result.data.length);
        markFresh();
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const status = reason instanceof ApiError ? reason.status : undefined;
        setHttpStatus(status);
        if (status === 404) {
          pageCache.delete(path);
          setItems([]);
          setPage(1);
          setTotalPages(1);
          setTotal(0);
          setIsStale(false);
        }
        setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.');
        if (status !== 404) setIsStale(Boolean(cached));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      resetFreshness();
      if (requestVersion.current === version) requestVersion.current += 1;
      loadMoreController.current?.abort();
      loadMoreController.current = null;
    };
  }, [path, limit, refreshCount, markFresh, resetFreshness]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    const version = requestVersion.current;
    const requestedPath = path;
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setPageError(null);
    try {
      const result = await apiGet<ApiEnvelope<T[]>>(pagePath(requestedPath, nextPage, limit), controller.signal);
      if (controller.signal.aborted || version !== requestVersion.current || pathRef.current !== requestedPath) return;
      const updatedItems = [...items, ...result.data];
      const updatedPage = result.pagination?.page || nextPage;
      const updatedTotalPages = result.pagination?.totalPages || totalPages;
      const updatedTotal = result.pagination?.total ?? total;
      const savedAt = pageCache.get(requestedPath)?.savedAt ?? Date.now();
      remember(pageCache, requestedPath, {
        items: updatedItems,
        page: updatedPage,
        totalPages: updatedTotalPages,
        total: updatedTotal,
        savedAt,
      });
      setItems(updatedItems);
      setPage(updatedPage);
      setTotalPages(updatedTotalPages);
      setTotal(updatedTotal);
    } catch (reason) {
      if (!controller.signal.aborted && version === requestVersion.current && pathRef.current === requestedPath) {
        setPageError(reason instanceof Error ? reason.message : 'Could not load more results.');
      }
    } finally {
      if (!controller.signal.aborted && version === requestVersion.current && pathRef.current === requestedPath) {
        setLoadingMore(false);
      }
      if (loadMoreController.current === controller) loadMoreController.current = null;
    }
  }, [loading, loadingMore, page, totalPages, path, limit, total, items]);

  return { items, loading, loadingMore, error, httpStatus, pageError, isStale, page, totalPages, total, hasMore: page < totalPages, retry, loadMore };
}
