// File upload utilities for logo management

// Helper function to convert Docker internal URLs to browser-accessible URLs
const convertDockerUrlToBrowser = (url: string): string => {
  if (!url) return url;
  
  console.log('🔄 Converting URL:', url);
  
  // If it's already a localhost:8000 URL, return as is
  if (url.includes('localhost:8000')) {
    console.log('✅ Already localhost URL:', url);
    return url;
  }
  
  // If it contains kong:8000, replace with localhost:8000
  if (url.includes('kong:8000')) {
    const converted = url.replace('kong:8000', 'localhost:8000');
    console.log('🔄 Converted kong to localhost:', converted);
    return converted;
  }
  
  // If it's a relative path starting with /storage/, make it a full localhost URL
  if (url.startsWith('/storage/')) {
    const converted = `http://localhost:8000${url}`;
    console.log('🔄 Converted relative to full URL:', converted);
    return converted;
  }
  
  // If it contains just the storage path but starts with http, fix the hostname
  if (url.includes('/storage/v1/object/public/logos/') && !url.includes('localhost:8000')) {
    // Extract just the path part
    const pathMatch = url.match(/\/storage\/v1\/object\/public\/logos\/.+$/);
    if (pathMatch) {
      const converted = `http://localhost:8000${pathMatch[0]}`;
      console.log('🔄 Rebuilt URL with localhost:', converted);
      return converted;
    }
  }
  
  console.log('➡️ No conversion needed:', url);
  return url;
};

// Helper function to get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

export const processLogoUpload = async (file: File): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        message: 'Please select a valid image file (PNG, JPG, WebP, or SVG)'
      };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return {
        success: false,
        message: 'File size must be less than 5MB. Consider compressing your image.'
      };
    }

    // Check image dimensions for better user guidance
    if (file.type !== 'image/svg+xml') {
      try {
        const dimensions = await getImageDimensions(file);
        const { width, height } = dimensions;
        const aspectRatio = width / height;
        
        // Provide guidance for optimal logo dimensions
        if (width < 64 || height < 64) {
          return {
            success: false,
            message: 'Image too small. Please use an image at least 64x64 pixels for best quality.'
          };
        }
        
        // Warn about very tall or very wide images
        if (aspectRatio > 4 || aspectRatio < 0.25) {
          return {
            success: false,
            message: 'Image aspect ratio is too extreme. For best results, use square (1:1) or wide (2:1 to 3:1) format images.'
          };
        }
      } catch (dimensionError) {
        console.warn('Could not check image dimensions:', dimensionError);
        // Continue with upload even if dimension check fails
      }
    }

    // Create FormData for file upload to Edge Function
    const formData = new FormData();
    formData.append('logo', file);

    // Upload to Supabase Edge Function
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
    console.log('📤 Uploading to:', `${baseUrl}/functions/v1/upload-logo`);
    const response = await fetch(`${baseUrl}/functions/v1/upload-logo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      return {
        success: false,
        message: errorData.error || 'Failed to upload logo'
      };
    }

    const result = await response.json();
    
    console.log('Upload result:', result); // Debug log
    
    if (result.success) {
      console.log('🔧 Original URL from server:', result.path);
      
      // Convert kong:8000 URLs to localhost:8000 for browser access
      const logoUrl = convertDockerUrlToBrowser(result.path);
      
      console.log('🔄 Converted URL:', logoUrl);
      
                // Store the Supabase Storage URL using persistent methods
        try {
          console.log('🔧 Original URL from server:', result.path);
          
          // Convert kong:8000 URLs to localhost:8000 for browser access
          const logoUrl = convertDockerUrlToBrowser(result.path);
          console.log('🔄 Converted URL:', logoUrl);
          
          // Use the new persistent storage method
          persistLogoUrl(logoUrl);
          
          // Verify it was stored
          const storedUrl = getLogoUrlFromStorage();
          console.log('✅ Logo URL stored and verified in storage:', storedUrl);
          
          // Also log all localStorage keys for debugging
          console.log('🔍 All localStorage keys after upload:', Object.keys(localStorage));
          console.log('🔍 All sessionStorage keys after upload:', Object.keys(sessionStorage));
          
          // Force a storage event to notify other components
          const storageEvent = new StorageEvent('storage', {
            key: 'organization-logo-url',
            newValue: logoUrl,
            oldValue: null,
            storageArea: localStorage
          });
          window.dispatchEvent(storageEvent);
          
          // Also dispatch custom events
          window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { url: logoUrl } }));
          window.dispatchEvent(new CustomEvent('forceLogoUpdate'));
          
          console.log('📡 All events dispatched for logo update');
          
        } catch (error) {
          console.error('❌ Error storing logo URL:', error);
        }      return {
        success: true,
        message: 'Logo uploaded successfully! Your logo is now active.'
      };
    } else {
      console.error('Upload failed:', result); // Debug log
      return {
        success: false,
        message: result.error || 'Upload failed'
      };
    }
    
  } catch (error) {
    console.error('File upload error:', error);
    
    // Check if it's a network error (Supabase not running)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: 'Cannot connect to Edge Functions. Please ensure Supabase is running with: supabase start'
      };
    }
    
    return {
      success: false,
      message: 'Upload failed. Please try again.'
    };
  }
};

export const checkLogoExists = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // First check for Supabase Storage logo using fallback keys
    let storageUrl = getLogoUrlFromStorage();
    
    console.log('🔍 checkLogoExists - storageUrl:', storageUrl); // Debug log
    
    if (storageUrl) {
      // Convert any problematic URLs to proper localhost:8000 URLs
      const convertedUrl = convertDockerUrlToBrowser(storageUrl);
      if (convertedUrl !== storageUrl) {
        console.log('🔄 Auto-fixed URL during check from:', storageUrl, 'to:', convertedUrl);
        // Update localStorage with the corrected URL
        localStorage.setItem('organization-logo-url', convertedUrl);
        storageUrl = convertedUrl;
      }
      
      console.log('📦 Testing storage URL:', storageUrl); // Debug log
      
      // Try a fetch request first to check if URL is accessible
      fetch(storageUrl, { method: 'HEAD' })
        .then(response => {
          console.log('🌐 Storage URL fetch response:', response.status, response.ok);
          if (response.ok) {
            console.log('✅ Storage URL is accessible, testing image load...');
            
            // If fetch succeeds, test image loading
            const storageImg = new window.Image();
            storageImg.onload = () => {
              console.log('✅ Storage logo loaded successfully'); // Debug log
              resolve(true);
            };
            storageImg.onerror = (error) => {
              console.warn('❌ Image load failed despite fetch success:', error);
              // Still return true if fetch worked, the image might just be loading slowly
              resolve(true);
            };
            storageImg.src = `${storageUrl}?t=${Date.now()}`;
          } else {
            console.warn('❌ Storage URL not accessible:', response.status);
            resolve(false);
          }
        })
        .catch(error => {
          console.warn('❌ Storage URL fetch failed:', error);
          resolve(false);
        });
    } else {
      console.log('📁 No storage URL, checking local logos'); // Debug log
      // Fallback to local logo check
      const pngImg = new window.Image();
      pngImg.onload = () => {
        console.log('✅ Local PNG logo loaded (no storage)'); // Debug log
        resolve(true);
      };
      pngImg.onerror = () => {
        console.warn('❌ Local PNG failed (no storage), checking SVG'); // Debug log
        const svgImg = new window.Image();
        svgImg.onload = () => {
          console.log('✅ Local SVG logo loaded (no storage)'); // Debug log
          resolve(true);
        };
        svgImg.onerror = () => {
          console.warn('❌ No logo found (no storage)'); // Debug log
          resolve(false);
        };
        svgImg.src = `/logo.svg?t=${Date.now()}`;
      };
      pngImg.src = `/logo.png?t=${Date.now()}`;
    }
  });
};

// Persistent logo URL storage using multiple methods
const LOGO_STORAGE_KEYS = [
  'organization-logo-url',
  'assetdex-logo-url', 
  'custom-logo',
  'app-logo-persistent',
  'logo-backup-url'
];

// Try to store in sessionStorage as backup
const persistLogoUrl = (url: string) => {
  console.log('💾 Persisting logo URL with multiple methods:', url);
  
  // Store in localStorage with multiple keys
  LOGO_STORAGE_KEYS.forEach(key => {
    try {
      localStorage.setItem(key, url);
    } catch (e) {
      console.warn(`Failed to store in localStorage key ${key}:`, e);
    }
  });
  
  // Also store in sessionStorage as backup
  try {
    sessionStorage.setItem('organization-logo-url', url);
    sessionStorage.setItem('logo-backup', url);
  } catch (e) {
    console.warn('Failed to store in sessionStorage:', e);
  }
  
  // Store in a global variable as last resort
  if (typeof window !== 'undefined') {
    (window as any).__ASSETDEX_LOGO_URL__ = url;
  }
};

// Helper function to get logo URL from any available storage
const getLogoUrlFromStorage = (): string | null => {
  // First try localStorage with multiple keys
  for (const key of LOGO_STORAGE_KEYS) {
    const url = localStorage.getItem(key);
    if (url) {
      console.log(`🔍 Found logo URL in localStorage key: ${key} = ${url}`);
      return url;
    }
  }
  
  // Try sessionStorage
  for (const key of ['organization-logo-url', 'logo-backup']) {
    const url = sessionStorage.getItem(key);
    if (url) {
      console.log(`🔍 Found logo URL in sessionStorage key: ${key} = ${url}`);
      // Restore to localStorage
      persistLogoUrl(url);
      return url;
    }
  }
  
  // Try global variable
  if (typeof window !== 'undefined' && (window as any).__ASSETDEX_LOGO_URL__) {
    const url = (window as any).__ASSETDEX_LOGO_URL__;
    console.log(`� Found logo URL in global variable: ${url}`);
    // Restore to localStorage
    persistLogoUrl(url);
    return url;
  }
  
  console.log('❌ No logo URL found in any storage method');
  return null;
};

// Function to check Supabase storage directly for logo file
const checkSupabaseStorageDirectly = async (): Promise<string | null> => {
  console.log('🔍 Checking Supabase storage directly for logo...');
  
  const possibleUrls = [
    'http://localhost:8000/storage/v1/object/public/logos/organization-logo.png',
    'http://localhost:8000/storage/v1/object/public/logos/organization-logo.jpg', 
    'http://localhost:8000/storage/v1/object/public/logos/organization-logo.jpeg',
    'http://localhost:8000/storage/v1/object/public/logos/organization-logo.webp',
    'http://localhost:8000/storage/v1/object/public/logos/organization-logo.svg'
  ];
  
  for (const url of possibleUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        console.log(`✅ Found logo file directly in Supabase: ${url}`);
        // Store this URL for future use
        persistLogoUrl(url);
        return url;
      }
    } catch (error) {
      // Continue to next URL
    }
  }
  
  console.log('❌ No logo file found in Supabase storage');
  return null;
};

// Organization name persistent storage (similar to logo URL)
const ORG_NAME_STORAGE_KEYS = [
  'organizationName',
  'organization-name-backup',
  'org-name-persistent',
  'assetdex-org-name',
  'app-organization-name'
];

// Persist organization name using multiple methods
const persistOrgName = (name: string) => {
  console.log('💾 Persisting organization name with multiple methods:', name);
  
  // Store in localStorage with multiple keys
  ORG_NAME_STORAGE_KEYS.forEach(key => {
    try {
      localStorage.setItem(key, name);
    } catch (e) {
      console.warn(`Failed to store org name in localStorage key ${key}:`, e);
    }
  });
  
  // Also store in sessionStorage as backup
  try {
    sessionStorage.setItem('organizationName', name);
    sessionStorage.setItem('org-name-backup', name);
  } catch (e) {
    console.warn('Failed to store org name in sessionStorage:', e);
  }
  
  // Store in a global variable as last resort
  if (typeof window !== 'undefined') {
    (window as any).__ASSETDEX_ORG_NAME__ = name;
  }
};

// Get organization name from any available storage
const getOrgNameFromStorage = (): string | null => {
  // First try localStorage with multiple keys
  for (const key of ORG_NAME_STORAGE_KEYS) {
    const name = localStorage.getItem(key);
    if (name) {
      console.log(`🔍 Found org name in localStorage key: ${key} = ${name}`);
      return name;
    }
  }
  
  // Try sessionStorage
  for (const key of ['organizationName', 'org-name-backup']) {
    const name = sessionStorage.getItem(key);
    if (name) {
      console.log(`🔍 Found org name in sessionStorage key: ${key} = ${name}`);
      // Restore to localStorage
      persistOrgName(name);
      return name;
    }
  }
  
  // Try global variable
  if (typeof window !== 'undefined' && (window as any).__ASSETDEX_ORG_NAME__) {
    const name = (window as any).__ASSETDEX_ORG_NAME__;
    console.log(`🔍 Found org name in global variable: ${name}`);
    // Restore to localStorage
    persistOrgName(name);
    return name;
  }
  
  console.log('❌ No organization name found in any storage method');
  return null;
};

// Public functions for organization name management
export const saveOrganizationName = (name: string) => {
  persistOrgName(name);
  
  // Dispatch event to notify other components
  window.dispatchEvent(new CustomEvent('organizationNameUpdated', { detail: { name } }));
  
  const storageEvent = new StorageEvent('storage', {
    key: 'organizationName',
    newValue: name,
    oldValue: null,
    storageArea: localStorage
  });
  window.dispatchEvent(storageEvent);
};

// Get organization name from database with localStorage fallback
export const getOrganizationName = async (): Promise<string> => {
  // First try localStorage (user temporary customization)
  const localName = getOrgNameFromStorage();
  if (localName) {
    return localName;
  }
  
  // Try to get from database
  try {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
    const response = await fetch(`${baseUrl}/functions/v1/app-settings?key=organization_name`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      }
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.value) {
        console.log('🗄️ Using organization name from database:', result.value);
        return result.value;
      }
    }
  } catch (error) {
    console.error('❌ Error fetching organization name from database:', error);
  }
  
  // Fallback to environment variable
  const envName = import.meta.env.VITE_ORGANIZATION_NAME;
  if (envName) {
    console.log('🌍 Using organization name from environment variable:', envName);
    return envName;
  }
  
  // Final fallback
  console.log('🔧 Using default organization name: DCIMS');
  return 'DCIMS';
};

// Synchronous version for immediate use (uses localStorage/env only)
export const getOrganizationNameSync = (): string => {
  // First try localStorage
  const localName = getOrgNameFromStorage();
  if (localName) {
    return localName;
  }
  
  // Fallback to environment variable
  const envName = import.meta.env.VITE_ORGANIZATION_NAME;
  if (envName) {
    return envName;
  }
  
  // Final fallback
  return 'DCIMS';
};

export const getCurrentLogoUrl = (): string => {
  // First check for Supabase Storage logo using fallback keys
  let storageUrl = getLogoUrlFromStorage();
  
  console.log('🔗 getCurrentLogoUrl - storageUrl:', storageUrl); // Debug log
  
  if (storageUrl) {
    // Convert any problematic URLs to proper localhost:8000 URLs
    const convertedUrl = convertDockerUrlToBrowser(storageUrl);
    if (convertedUrl !== storageUrl) {
      console.log('🔄 Auto-fixed URL from:', storageUrl, 'to:', convertedUrl);
      // Update localStorage with the corrected URL
      localStorage.setItem('organization-logo-url', convertedUrl);
      storageUrl = convertedUrl;
    }
    
    const url = `${storageUrl}?t=${Date.now()}`;
    console.log('📦 Using storage URL:', url); // Debug log
    return url;
  }
  
  // Fallback to local logo
  const fallbackUrl = `/logo.png?t=${Date.now()}`;
  console.log('📁 Using fallback URL:', fallbackUrl); // Debug log
  return fallbackUrl;
};

// Force logo state to true and update all components
export const forceLogoUpdate = () => {
  console.log('🔄 Forcing logo update...');
  
  // Check if we have a relative URL that needs to be converted
  const currentUrl = localStorage.getItem('organization-logo-url');
  if (currentUrl && currentUrl.startsWith('/storage/')) {
    const fullUrl = `http://localhost:8000${currentUrl}`;
    console.log('🔧 Fixed relative URL to full URL:', fullUrl);
    localStorage.setItem('organization-logo-url', fullUrl);
  }
  
  // Dispatch multiple events to ensure all components update
  window.dispatchEvent(new CustomEvent('logoUpdated'));
  
  const event = new StorageEvent('storage', {
    key: 'organization-logo-url',
    newValue: localStorage.getItem('organization-logo-url'),
    storageArea: localStorage
  });
  window.dispatchEvent(event);
  
  // Also dispatch a custom force update event
  window.dispatchEvent(new CustomEvent('forceLogoUpdate'));
  
  console.log('✅ Logo update events dispatched');
};

export const preloadLogo = (): Promise<string | null> => {
  return new Promise((resolve) => {
    // First try Supabase Storage logo
    let storageUrl = localStorage.getItem('organization-logo-url');
    
    if (storageUrl) {
      // Convert kong:8000 URLs to localhost:8000 for browser access
      const convertedUrl = convertDockerUrlToBrowser(storageUrl);
      if (convertedUrl !== storageUrl) {
        console.log('🔄 Converted URL from kong to localhost for preload:', convertedUrl);
        // Update localStorage with the corrected URL
        localStorage.setItem('organization-logo-url', convertedUrl);
        storageUrl = convertedUrl;
      }
      
      const storageImg = new window.Image();
      storageImg.onload = () => resolve(`${storageUrl}?t=${Date.now()}`);
      storageImg.onerror = () => {
        // Fallback to local PNG
        const pngImg = new window.Image();
        pngImg.onload = () => resolve(`/logo.png?t=${Date.now()}`);
        pngImg.onerror = () => {
          // Fallback to SVG
          const svgImg = new window.Image();
          svgImg.onload = () => resolve(`/logo.svg?t=${Date.now()}`);
          svgImg.onerror = () => resolve(null);
          svgImg.src = `/logo.svg?t=${Date.now()}`;
        };
        pngImg.src = `/logo.png?t=${Date.now()}`;
      };
      storageImg.src = `${storageUrl}?t=${Date.now()}`;
    } else {
      // Fallback to local logo check
      const pngImg = new window.Image();
      pngImg.onload = () => resolve(`/logo.png?t=${Date.now()}`);
      pngImg.onerror = () => {
        const svgImg = new window.Image();
        svgImg.onload = () => resolve(`/logo.svg?t=${Date.now()}`);
        svgImg.onerror = () => resolve(null);
        svgImg.src = `/logo.svg?t=${Date.now()}`;
      };
      pngImg.src = `/logo.png?t=${Date.now()}`;
    }
  });
};

// Helper function to fix any existing relative URLs in localStorage
export const fixStoredLogoUrl = () => {
  const currentUrl = getLogoUrlFromStorage();
  if (currentUrl) {
    const fixedUrl = convertDockerUrlToBrowser(currentUrl);
    if (fixedUrl !== currentUrl) {
      console.log('🔧 Fixed stored URL:', currentUrl, '→', fixedUrl);
      localStorage.setItem('organization-logo-url', fixedUrl);
      localStorage.setItem('assetdex-logo-url', fixedUrl); // Backup
      return fixedUrl;
    }
  }
  return currentUrl;
};

// Manual function to save logo URL to localStorage (for debugging)
export const manualSaveLogoUrl = (url: string) => {
  console.log('🔧 Manually saving logo URL:', url);
  const convertedUrl = convertDockerUrlToBrowser(url);
  localStorage.setItem('organization-logo-url', convertedUrl);
  const verified = localStorage.getItem('organization-logo-url');
  console.log('✅ Manual save verified:', verified);
  return verified === convertedUrl;
};

// Initialize organization name system
export const initializeOrgNameSystem = async (): Promise<string> => {
  console.log('🎯 Initializing organization name system...');
  
  // First try to get name from any local storage
  let orgName = getOrgNameFromStorage();
  console.log('🔍 Organization name from local storage:', orgName);
  
  // If no name found in storage, check database then environment
  if (!orgName) {
    try {
      orgName = await getOrganizationName();
      console.log('🔍 Organization name after database check:', orgName);
    } catch (error) {
      console.error('❌ Error fetching from database, using fallback:', error);
      orgName = getOrganizationNameSync();
    }
  } else {
    // If found in storage, re-persist to ensure all storage methods are populated
    console.log('🔧 Re-persisting existing organization name from storage...');
    persistOrgName(orgName);
  }
  
  console.log('🎯 Organization name system initialized:', orgName);
  return orgName;
};

// Update organization name in database permanently
export const updateOrganizationNameInDatabase = async (name: string): Promise<{success: boolean, message: string}> => {
  try {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
    const response = await fetch(`${baseUrl}/functions/v1/app-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        key: 'organization_name', 
        value: name,
        description: 'Organization display name'
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Organization name updated in database:', name);
      return {
        success: true,
        message: 'Organization name saved permanently to database'
      };
    } else {
      console.error('❌ Failed to update database:', result);
      return {
        success: false,
        message: result.error || 'Failed to update database'
      };
    }
  } catch (error) {
    console.error('❌ Error calling app-settings function:', error);
    return {
      success: false,
      message: 'Network error while updating database'
    };
  }
};

// Initialize logo system - call this on app startup
export const initializeLogoSystem = async (): Promise<boolean> => {
  console.log('🎯 Initializing logo system...');
  console.log('🌐 Current origin:', window.location.origin);
  
  // Test localStorage persistence
  const testKey = 'test-persistence';
  const testValue = `test-${Date.now()}`;
  localStorage.setItem(testKey, testValue);
  const retrievedTest = localStorage.getItem(testKey);
  console.log('🧪 localStorage test - stored:', testValue, 'retrieved:', retrievedTest);
  localStorage.removeItem(testKey);
  
  // Debug: Check all storage
  console.log('🔍 All localStorage keys:', Object.keys(localStorage));
  console.log('🔍 All sessionStorage keys:', Object.keys(sessionStorage));
  
  // First try to get URL from any storage
  let logoUrl = getLogoUrlFromStorage();
  console.log('🔍 Logo URL from storage:', logoUrl);
  
  // If not found in storage, check Supabase directly
  if (!logoUrl) {
    console.log('🔍 No URL in storage, checking Supabase directly...');
    logoUrl = await checkSupabaseStorageDirectly();
  }
  
  if (logoUrl) {
    // Fix any URL issues
    const fixedUrl = convertDockerUrlToBrowser(logoUrl);
    if (fixedUrl !== logoUrl) {
      console.log('🔧 Fixed URL:', logoUrl, '→', fixedUrl);
      persistLogoUrl(fixedUrl);
      logoUrl = fixedUrl;
    }
    
    // Verify the URL is accessible
    const exists = await checkLogoExists();
    console.log('🎯 Logo system initialized. Has custom logo:', exists);
    return exists;
  } else {
    console.log('🎯 Logo system initialized. No custom logo found.');
    return false;
  }
};
