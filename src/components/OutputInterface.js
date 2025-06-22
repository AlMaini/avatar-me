import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { threeFontManager, loadCustomFont } from '../utils/FontLoader.js';

export class OutputInterface {
  constructor() {
    this.currentText = '';
    this.displayedText = '';
    this.interfacePlane = null;
    this.textMesh = null;
    this.interfaceGroup = null;
    this.font = null;
    this.scene = null;
    
    // Streaming properties
    this.isStreaming = false;
    this.streamQueue = [];
    this.streamingSpeed = 30; // ms between character batches
    this.charactersPerBatch = 5; // characters to add per batch
    this.lastStreamUpdate = Date.now();
    this.streamingTimeout = null;
    this.pendingUpdate = false;
    
    // Interface dimensions
    this.interfaceWidth = 10;
    this.interfaceHeight = 8;
    this.maxCharsPerLine = 45;
    this.lineHeight = 0.8;
    this.textLines = [];
    
    // Canvas-based text rendering
    this.canvas = null;
    this.canvasContext = null;
    this.textTexture = null;
    this.textPlane = null;
    this.canvasWidth = 1024;
    this.canvasHeight = 512;
    
    // Performance optimizations
    this.lastGeometryUpdate = 0;
    this.geometryUpdateThrottle = 16; // ~60fps max updates
    
    // Shared materials
    this.textMaterial = null;
    this.planeMaterial = null;
    
    // Caching for performance
    this.cachedText = null;
    
    // Font settings for canvas
    this.fontSize = 32;
    this.fontFamily = 'CustomTerminal, Courier New, monospace'; // Use custom font as fallback
    this.lineSpacing = 40;
    this.charWidth = 19.2; // Approximate monospace character width
    this.customFontLoaded = false;
  }

  async createInterface(scene) {
    this.scene = scene;
    
    // Load custom font before initializing
    await this.loadCustomFont();
    
    this.initializeMaterials();
    this.initializeCanvas();
    
    this.interfaceGroup = new THREE.Group();
    this.interfaceGroup.position.set(10, 1, 5);
    this.interfaceGroup.rotateY(-0.65);
    
    const planeGeometry = new THREE.BoxGeometry(this.interfaceWidth, this.interfaceHeight, 2);
    this.planeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x1a1a1a,
      side: THREE.DoubleSide
    });
    this.interfacePlane = new THREE.Mesh(planeGeometry, this.planeMaterial);
    this.interfaceGroup.add(this.interfacePlane);
    
    // Create text plane with canvas texture
    this.createTextPlane();
    
    scene.add(this.interfaceGroup);
    
    this.updateTextTexture();
    
    return this.interfaceGroup;
  }

  async loadCustomFont() {
    try {
      // Load the custom web font
      await loadCustomFont();
      this.customFontLoaded = true;
      console.log('Custom font loaded successfully');
    } catch (error) {
      console.warn('Failed to load custom font, using fallback:', error);
      this.fontFamily = 'Courier New, monospace';
    }
  }

  initializeMaterials() {
    // Material will be created after canvas initialization
  }
  
  initializeCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvasContext = this.canvas.getContext('2d');
    
    // Set up canvas text properties with loaded font
    this.canvasContext.font = `${this.fontSize}px ${this.fontFamily}`;
    this.canvasContext.textAlign = 'left';
    this.canvasContext.textBaseline = 'top';
    this.canvasContext.imageSmoothingEnabled = false;
    
    // Create texture from canvas
    this.textTexture = new THREE.CanvasTexture(this.canvas);
    this.textTexture.magFilter = THREE.NearestFilter;
    this.textTexture.minFilter = THREE.NearestFilter;
  }
  
  createTextPlane() {
    const planeGeometry = new THREE.PlaneGeometry(this.interfaceWidth - 0.2, this.interfaceHeight - 0.2);
    const planeMaterial = new THREE.MeshBasicMaterial({
      map: this.textTexture,
      transparent: false,
      side: THREE.DoubleSide,
      alphaTest: 0.1
    });
    
    this.textPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.textPlane.position.set(0, 0, 1.1);
    this.interfaceGroup.add(this.textPlane);
  }

  updateTextTexture() {
    if (!this.canvasContext || !this.textTexture) return;
    
    // Clear canvas with black background
    this.canvasContext.fillStyle = 'rgba(0, 0, 0, 1)';
    this.canvasContext.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    if (this.displayedText) {
      // Ensure font is set with the loaded custom font
      this.canvasContext.font = `${this.fontSize}px ${this.fontFamily}`;
      this.canvasContext.textAlign = 'left';
      this.canvasContext.textBaseline = 'top';
      
      // Wrap text and render to canvas
      const lines = this.wrapText(this.displayedText, Math.floor(this.canvasWidth / this.charWidth));
      const maxLines = Math.floor((this.canvasHeight - 20) / this.lineSpacing);
      const visibleLines = lines.slice(-maxLines);
      
      // Draw text with green glow
      this.canvasContext.fillStyle = '#00ff88';
      this.canvasContext.shadowColor = '#00ff88';
      this.canvasContext.shadowBlur = 8;
      
      visibleLines.forEach((line, index) => {
        const y = index * this.lineSpacing + 20;
        this.canvasContext.fillText(line, 100, y);
      });
    }
    
    // Update texture
    this.textTexture.needsUpdate = true;
  }


  wrapText(text, maxCharsPerLine) {
    if (text.length <= maxCharsPerLine) {
      return [text];
    }
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let word of words) {
      while (word.length > maxCharsPerLine) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        lines.push(word.substring(0, maxCharsPerLine));
        word = word.substring(maxCharsPerLine);
      }
      
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = word;
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [''];
  }

  createTextGeometry() {
    // Throttle texture updates for performance
    const now = Date.now();
    if (now - this.lastGeometryUpdate < this.geometryUpdateThrottle) {
      return;
    }
    this.lastGeometryUpdate = now;
    
    this.updateTextTexture();
  }

  updateText(text) {
    if (this.isStreaming) {
      this.streamQueue.push(text);
      return;
    }
    
    this.currentText = text;
    this.displayedText = text;
    this.updateTextTexture();
  }

  streamText(text, speed = null) {
    if (speed !== null) {
      this.streamingSpeed = speed;
    }
    
    if (this.isStreaming) {
      this.streamQueue.push(text);
      return;
    }
    
    this.currentText = text;
    this.displayedText = '';
    this.isStreaming = true;
    this.lastStreamUpdate = Date.now();
    
    this.startStreaming();
  }

  startStreaming() {
    const streamBatch = () => {
      const now = Date.now();
      
      if (now - this.lastStreamUpdate >= this.streamingSpeed) {
        if (this.displayedText.length < this.currentText.length) {
          // Add multiple characters per update for better performance
          const remainingChars = this.currentText.length - this.displayedText.length;
          const charsToAdd = Math.min(this.charactersPerBatch, remainingChars);
          
          this.displayedText += this.currentText.substr(this.displayedText.length, charsToAdd);
          
          // Only update texture if we're not already pending an update
          if (!this.pendingUpdate) {
            this.pendingUpdate = true;
            // Use requestAnimationFrame to batch texture updates
            requestAnimationFrame(() => {
              this.updateTextTexture();
              this.pendingUpdate = false;
            });
          }
          
          this.lastStreamUpdate = now;
        } else {
          this.isStreaming = false;
          
          if (this.streamQueue.length > 0) {
            const nextText = this.streamQueue.shift();
            setTimeout(() => this.streamText(nextText), 100);
          }
          return;
        }
      }
      
      if (this.isStreaming) {
        this.streamingTimeout = requestAnimationFrame(streamBatch);
      }
    };
    
    streamBatch();
  }

  clearText() {
    this.currentText = '';
    this.displayedText = '';
    this.streamQueue = [];
    this.isStreaming = false;
    this.pendingUpdate = false;
    
    if (this.streamingTimeout) {
      cancelAnimationFrame(this.streamingTimeout);
      this.streamingTimeout = null;
    }
    
    this.updateTextTexture();
  }

  dispose() {
    if (this.textTexture) {
      this.textTexture.dispose();
      this.textTexture = null;
    }
    
    if (this.textPlane) {
      this.interfaceGroup.remove(this.textPlane);
      this.textPlane.geometry.dispose();
      this.textPlane.material.dispose();
      this.textPlane = null;
    }
    
    if (this.planeMaterial) {
      this.planeMaterial.dispose();
      this.planeMaterial = null;
    }

    if (this.streamingTimeout) {
      cancelAnimationFrame(this.streamingTimeout);
      this.streamingTimeout = null;
    }

    this.canvas = null;
    this.canvasContext = null;
    this.isStreaming = false;
    this.streamQueue = [];
  }
}