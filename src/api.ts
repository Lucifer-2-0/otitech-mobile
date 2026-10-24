export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PropertyImage = {
  id: number;
  url: string;
  altText?: string | null;
  isCover?: boolean;
};

export type PublicProperty = {
  id: number;
  slug: string;
  title: string;
  type: 'land' | 'house' | 'apartment' | 'commercial';
  purpose: 'sale' | 'rent';
  status: 'available' | 'under_offer' | 'sold' | 'let';
  location: string;
  size?: string | null;
  price?: number | string | null;
  priceLabel?: string | null;
  description?: string | null;
  features?: string[] | null;
  image?: string | null;
  images?: PropertyImage[];
};

export type PublicProject = {
  id: number;
  slug: string;
  title: string;
  category: 'residential' | 'commercial' | 'mixed_use' | 'renovation';
  status: 'planning' | 'ongoing' | 'completed';
  location: string;
  year?: string | null;
  size?: string | null;
  value?: number | string | null;
  description?: string | null;
  highlights?: string[] | null;
  image?: string | null;
  images?: PropertyImage[];
};

export type PublicSetting = {
  key: string;
  value: string;
};

export type ApiReadiness = {
  success: true;
  status: 'ready';
  timestamp: string;
};

export type EnquiryInput = {
  name: string;
  phone: string;
  email?: string;
  service: 'building_design' | 'construction' | 'real_estate' | 'project_support';
  message: string;
  propertyId?: number;
  projectId?: number;
};

const PRODUCTION_API_BASE = 'https://otitech-api-prod.fly.dev/api/v1';
const DEVELOPMENT_API_BASE = 'http://10.0.2.2:3000/api/v1';
const configuredEnvironment = process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase();
export const APP_ENV = configuredEnvironment === 'development' || configuredEnvironment === 'preview' || configuredEnvironment === 'production'
  ? configuredEnvironment
  : (__DEV__ ? 'development' : 'production');
const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
export const API_BASE_URL = (configuredBase || (APP_ENV === 'development' ? DEVELOPMENT_API_BASE : PRODUCTION_API_BASE)).replace(/\/+$/, '');

function isProductionApi(base: string) {
  try {
    return new URL(base).hostname.toLowerCase() === new URL(PRODUCTION_API_BASE).hostname;
  } catch {
    return false;
  }
}

export const CAN_SUBMIT_ENQUIRIES = APP_ENV === 'production'
  ? isProductionApi(API_BASE_URL)
  : Boolean(configuredBase) && !isProductionApi(API_BASE_URL);

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, requireData = true): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const callerSignal = init.signal;
  const cancelFromCaller = () => controller.abort();
  callerSignal?.addEventListener('abort', cancelFromCaller, { once: true });

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });
    const body = await response.json().catch(() => null) as {
      success?: boolean;
      data?: T;
      status?: string;
      error?: { message?: string };
    } | null;

    if (!response.ok) {
      const message = body?.error?.message || (response.status === 503
        ? 'The OTI-TECH service is not ready right now.'
        : `The request failed (${response.status}).`);
      throw new ApiError(message, response.status);
    }
    if (!body || body.success !== true || (requireData && !('data' in body))) {
      throw new ApiError('The server returned an unexpected response.', response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError('The request timed out or was cancelled. Check your connection and try again.');
    }
    throw new ApiError('Could not reach OTI-TECH. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', cancelFromCaller);
  }
}

export const apiGet = <T,>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal });

export async function checkApiReadiness(signal?: AbortSignal) {
  const result = await request<ApiReadiness>('/health/ready', { method: 'GET', signal }, false);
  if (result.status !== 'ready') throw new ApiError('The OTI-TECH service is not ready right now.');
  return result;
}

export const apiPost = <T,>(path: string, body: unknown) => request<T>(path, {
  method: 'POST',
  body: JSON.stringify(body),
});

export function queryPath(path: string, query: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `${path}?${encoded}` : path;
}

export function resolveImageUrl(path?: string | null) {
  if (!path) return undefined;
  try {
    return new URL(path, API_BASE_URL).toString();
  } catch {
    return undefined;
  }
}

export function formatPrice(price?: number | string | null, label?: string | null) {
  if (label?.trim()) return label;
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount <= 0) return 'Contact for price';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}
