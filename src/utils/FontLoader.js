import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

export const loadCustomFont = async () => {
  const fontFace = new FontFace('CustomTerminal', 'url(./fonts/Glass_TTY_VT220.ttf)');
  await fontFace.load();
  document.fonts.add(fontFace);
  return fontFace;
};

// Singleton Three.js font loader
class ThreeFontManager {
  constructor() {
    this.fontLoader = new FontLoader();
    this.loadedFonts = new Map();
    this.loadingPromises = new Map();
  }

  async loadFont(fontPath) {
    // Return cached font if already loaded
    if (this.loadedFonts.has(fontPath)) {
      return this.loadedFonts.get(fontPath);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(fontPath)) {
      return this.loadingPromises.get(fontPath);
    }

    // Create new loading promise
    const loadingPromise = new Promise((resolve, reject) => {
      this.fontLoader.load(
        fontPath,
        (font) => {
          this.loadedFonts.set(fontPath, font);
          this.loadingPromises.delete(fontPath);
          resolve(font);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(fontPath);
          console.error('Error loading font:', error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(fontPath, loadingPromise);
    return loadingPromise;
  }

  dispose() {
    this.loadedFonts.clear();
    this.loadingPromises.clear();
  }
}

// Export singleton instance
export const threeFontManager = new ThreeFontManager();