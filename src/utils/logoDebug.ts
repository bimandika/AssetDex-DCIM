// Debug utilities for logo system
import { getCurrentLogoUrl as getLogoUrl } from './fileUpload';

export const debugLogoState = () => {
  const storageUrl = localStorage.getItem('organization-logo-url');
  
  console.group('🖼️ Logo Debug Information');
  console.log('Storage URL:', storageUrl);
  console.log('Current logo function result:', getLogoUrl());
  
  if (storageUrl) {
    // Test if the storage URL is accessible
    fetch(storageUrl)
      .then(response => {
        console.log('Storage URL fetch result:', response.ok ? 'SUCCESS' : 'FAILED', response.status);
      })
      .catch(error => {
        console.error('Storage URL fetch error:', error);
      });
  }
  
  // Test local fallbacks
  const testImage = (url: string, name: string) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log(`${name} load result:`, 'SUCCESS');
        resolve(true);
      };
      img.onerror = () => {
        console.log(`${name} load result:`, 'FAILED');
        resolve(false);
      };
      img.src = url;
    });
  };
  
  Promise.all([
    testImage('/logo.png', 'Local PNG'),
    testImage('/logo.svg', 'Local SVG')
  ]).then(() => {
    console.groupEnd();
  });
};

export const forceLogoRefresh = async () => {
  console.log('🔄 Force refreshing logo state...');
  
  // Clear any cached images
  const storageUrl = localStorage.getItem('organization-logo-url');
  if (storageUrl) {
    const img = new Image();
    img.src = `${storageUrl}?t=${Date.now()}`;
  }
  
  // Dispatch all possible events
  window.dispatchEvent(new CustomEvent('logoUpdated'));
  window.dispatchEvent(new CustomEvent('storage', {
    detail: { key: 'organization-logo-url' }
  } as any));
  
  // Also fire the standard storage event
  const event = new StorageEvent('storage', {
    key: 'organization-logo-url',
    newValue: localStorage.getItem('organization-logo-url'),
    storageArea: localStorage
  });
  window.dispatchEvent(event);
  
  console.log('✅ Logo refresh events dispatched');
};

// Helper to import getCurrentLogoUrl in runtime
export const initLogoDebug = (logoUrlFn: () => string) => {
  // Store reference for debugging
  if (typeof window !== 'undefined') {
    (window as any).getCurrentLogoUrlRef = logoUrlFn;
  }
};

// Make functions available globally for debugging
declare global {
  interface Window {
    debugLogo: typeof debugLogoState;
    refreshLogo: typeof forceLogoRefresh;
  }
}

if (typeof window !== 'undefined') {
  window.debugLogo = debugLogoState;
  window.refreshLogo = forceLogoRefresh;
}