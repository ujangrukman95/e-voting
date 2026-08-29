/**
 * Supabase Client & Configuration Helper
 * 
 * Modul ini memudahkan integrasi langsung dengan Supabase PostgreSQL
 * saat mendeploy frontend ke Vercel atau hosting lainnya.
 * 
 * Konfigurasi di .env:
 * VITE_SUPABASE_URL=https://your-project.supabase.co
 * VITE_SUPABASE_ANON_KEY=your-anon-public-key
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const url = metaEnv?.VITE_SUPABASE_URL || '';
  const anonKey = metaEnv?.VITE_SUPABASE_ANON_KEY || '';

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
};

/**
 * Universal Supabase REST Fetcher (Zero external npm dependency needed)
 * Mendukung query langsung ke PostgREST API Supabase jika backend Express tidak digunakan.
 */
export async function supabaseRest<T>(
  table: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    query?: string;
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: string | null }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { data: null, error: 'Supabase URL atau Anon Key belum dikonfigurasi di Environment Variable.' };
  }

  try {
    const url = `${config.url}/rest/v1/${table}${options?.query ? `?${options.query}` : ''}`;
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ message: res.statusText }));
      return { data: null, error: errJson.message || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal terhubung ke Supabase.' };
  }
}
