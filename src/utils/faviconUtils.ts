import { fetchPublicSettings, getSettingValue } from '../services/settingsService';

/**
 * Updates the favicon to use the uploaded school logo
 * Falls back to default favicon if no logo is set
 */
export const updateFavicon = async (): Promise<void> => {
  try {
    // Get the current school logo URL from settings
    const settings = await fetchPublicSettings();
    const logoUrl = getSettingValue(settings, 'school_logo');
    
    if (logoUrl) {
      // Create a favicon from the logo image
      await createFaviconFromImage(logoUrl);
    }
    // If no logo is set, keep the default favicon
  } catch (error) {
    console.error('Error updating favicon:', error);
    // Keep default favicon on error
  }
};

/**
 * Creates a canvas-based favicon from an image URL and updates the DOM
 * This ensures the favicon works properly across all browsers
 */
export const createFaviconFromImage = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create a canvas to resize the image to 32x32
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = 32;
        canvas.height = 32;
        
        // Draw the image scaled to fit the canvas
        ctx.drawImage(img, 0, 0, 32, 32);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        // Update the favicon in the DOM
        updateFaviconInDOM(dataUrl);
        
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

/**
 * Updates the favicon link element in the document head
 * Creates a new link element if one doesn't exist
 */
const updateFaviconInDOM = (dataUrl: string): void => {
  // Find existing favicon link element
  let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  
  if (!faviconLink) {
    // If no favicon link exists, create one
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/png';
    document.head.appendChild(faviconLink);
  }
  
  // Update the href with the new data URL
  faviconLink.href = dataUrl;
};