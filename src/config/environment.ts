// Centralized environment configuration for AssetDex-DCIM

interface Environment {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
  apiUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

export const env: Environment = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE',
  appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:3001',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Helper function to build API URLs
export const buildApiUrl = (path: string): string => {
  const baseUrl = env.apiUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

// Helper function to build app URLs
export const buildAppUrl = (path: string): string => {
  const baseUrl = env.appUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

// Helper function to convert Docker URLs to proper URLs based on environment
export const convertDockerUrlToBrowser = (url: string): string => {
  if (!url) return url;
  
  // In development, convert kong:8000 to localhost:8000
  if (env.isDevelopment && url.includes('kong:8000')) {
    const convertedUrl = url.replace('kong:8000', 'localhost:8000');
    console.log('🔄 [ENV] Converted Docker URL:', url, '→', convertedUrl);
    return convertedUrl;
  }
  
  // In production behind reverse proxy, convert absolute localhost URLs to relative paths
  if (env.isProduction) {
    // Convert absolute localhost URLs to use the current domain
    const convertedUrl = url.replace(/https?:\/\/localhost:\d+/, '');
    if (convertedUrl !== url) {
      console.log('🔄 [ENV] Converted production URL:', url, '→', convertedUrl);
    }
    return convertedUrl;
  }
  
  return url;
};

// Helper function to get the correct base URL for the current environment
export const getBaseUrl = (): string => {
  if (env.isProduction) {
    // In production, use the current location
    return window.location.origin;
  }
  return env.appUrl;
};

// Helper function to normalize URLs for storage
export const normalizeStorageUrl = (url: string): string => {
  if (!url) return url;
  
  // Convert Docker URLs first
  let normalizedUrl = convertDockerUrlToBrowser(url);
  
  // In production, convert to relative URLs for storage
  if (env.isProduction && normalizedUrl.startsWith('http')) {
    // Store relative URLs in production
    try {
      const urlObj = new URL(normalizedUrl);
      normalizedUrl = urlObj.pathname + urlObj.search;
    } catch (error) {
      console.warn('Failed to parse URL for normalization:', normalizedUrl);
    }
  }
  
  return normalizedUrl;
};

// Helper function to resolve URLs for display/fetching
export const resolveUrl = (url: string): string => {
  if (!url) return url;
  
  // If it's already an absolute URL, convert Docker URLs if needed
  if (url.startsWith('http')) {
    return convertDockerUrlToBrowser(url);
  }
  
  // If it's a relative URL, make it absolute based on current environment
  if (url.startsWith('/')) {
    return `${getBaseUrl()}${url}`;
  }
  
  return url;
};

// Debug utility
export const debugEnvironment = (): void => {
  console.log('=== ENVIRONMENT DEBUG INFO ===');
  console.log('Environment:', {
    isDevelopment: env.isDevelopment,
    isProduction: env.isProduction,
    supabaseUrl: env.supabaseUrl,
    appUrl: env.appUrl,
    apiUrl: env.apiUrl,
    baseUrl: getBaseUrl(),
  });
  
  console.log('Environment Variables:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_APP_URL: import.meta.env.VITE_APP_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE,
  });
  
  console.log('Example URLs:', {
    apiFunction: buildApiUrl('/functions/v1/upload-logo'),
    appResource: buildAppUrl('/logo.png'),
    dockerConversion: convertDockerUrlToBrowser('http://kong:8000/storage/v1/object/public/logos/test.png'),
  });
  
  console.log('===============================');
};

// Make debug function available globally in development
if (env.isDevelopment && typeof window !== 'undefined') {
  (window as any).debugEnvironment = debugEnvironment;
}

export default env;