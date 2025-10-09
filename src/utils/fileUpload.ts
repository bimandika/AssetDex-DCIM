// File upload utilities for logo management

export const processLogoUpload = async (file: File): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        message: 'Please select a valid image file (PNG, JPG, etc.)'
      };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return {
        success: false,
        message: 'File size must be less than 5MB'
      };
    }

    // Create canvas for image processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return {
        success: false,
        message: 'Canvas not supported in this browser'
      };
    }

    // Create image element
    const img = new window.Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        try {
          // Calculate optimal size (max 400x400 while maintaining aspect ratio)
          const maxSize = 400;
          let { width, height } = img;
          
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
          
          // Set canvas size and draw image
          canvas.width = width;
          canvas.height = height;
          
          // Clear canvas and draw image
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              // Create download link
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'logo.png';
              a.style.display = 'none';
              
              // Add to DOM, click, and remove
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              // Clean up
              URL.revokeObjectURL(url);
              
              resolve({
                success: true,
                message: 'Logo file prepared for download. Please save the downloaded "logo.png" file to your /public folder.'
              });
            } else {
              resolve({
                success: false,
                message: 'Failed to process image. Please try again.'
              });
            }
          }, 'image/png', 0.95); // High quality PNG
          
        } catch (error) {
          console.error('Error processing image:', error);
          resolve({
            success: false,
            message: 'Error processing image. Please try again.'
          });
        }
      };
      
      img.onerror = () => {
        resolve({
          success: false,
          message: 'Invalid image file. Please select a different image.'
        });
      };
      
      // Load the image
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = () => {
        resolve({
          success: false,
          message: 'Failed to read file. Please try again.'
        });
      };
      reader.readAsDataURL(file);
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      message: 'Upload failed. Please try again.'
    };
  }
};

export const checkLogoExists = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // First check for PNG logo
    const pngImg = new window.Image();
    
    pngImg.onload = () => resolve(true);
    pngImg.onerror = () => {
      // If PNG fails, check for SVG logo as fallback
      const svgImg = new window.Image();
      svgImg.onload = () => resolve(true);
      svgImg.onerror = () => resolve(false);
      svgImg.src = `/logo.svg?t=${Date.now()}`;
    };
    
    // Add timestamp to prevent caching
    pngImg.src = `/logo.png?t=${Date.now()}`;
  });
};

export const preloadLogo = (): Promise<string | null> => {
  return new Promise((resolve) => {
    // First try PNG
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
  });
};
