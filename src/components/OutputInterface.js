import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { threeFontManager } from '../utils/FontLoader.js';

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
    
    // Character geometry pooling
    this.characterGeometryPool = new Map(); // Cache geometries by character
    this.characterMeshPool = new Map(); // Pool of meshes by character
    this.activeMeshes = [];
    this.maxPoolSizePerChar = 10; // Max meshes per character
    
    // Performance optimizations
    this.lastGeometryUpdate = 0;
    this.geometryUpdateThrottle = 16; // ~60fps max updates
    
    // Shared materials
    this.textMaterial = null;
    this.planeMaterial = null;
    
    // Caching for performance
    this.cachedText = null;
    
    // Common characters for pre-pooling
    this.commonChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?;:\'"()-_/\\@#$%^&*+=[]{}|<>~`';
  }

  async createInterface(scene) {
    this.scene = scene;
    
    await this.loadFont();
    this.initializeMaterials();
    this.preloadCharacterGeometries();
    
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
    
    scene.add(this.interfaceGroup);
    
    this.createTextGeometry();
    
    return this.interfaceGroup;
  }

  initializeMaterials() {
    this.textMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 1
    });
  }

  async loadFont() {
    try {
      this.font = await threeFontManager.loadFont('/fonts/Glass TTY VT220_Medium.json');
      return this.font;
    } catch (error) {
      console.error('Error loading font:', error);
      throw error;
    }
  }

  preloadCharacterGeometries() {
    if (!this.font) return;
    
    // Pre-create geometries for common characters
    for (const char of this.commonChars) {
      this.getCharacterGeometry(char);
    }
  }

  getCharacterGeometry(char) {
    if (this.characterGeometryPool.has(char)) {
      return this.characterGeometryPool.get(char);
    }
    
    const geometry = new TextGeometry(char, {
      font: this.font,
      size: 0.3,
      height: 0.05,
      curveSegments: 12, // Reduced from 12 for better performance
      bevelEnabled: false
    });
    
    this.characterGeometryPool.set(char, geometry);
    return geometry;
  }

  getPooledCharacterMesh(char) {
    const charPool = this.characterMeshPool.get(char) || [];
    
    if (charPool.length > 0) {
      const mesh = charPool.pop();
      this.activeMeshes.push(mesh);
      return mesh;
    }
    
    // Create new mesh with shared geometry
    const geometry = this.getCharacterGeometry(char);
    const mesh = new THREE.Mesh(geometry, this.textMaterial);
    mesh.userData.char = char;
    mesh.scale.set(1, 1, 0.002);
    this.activeMeshes.push(mesh);
    return mesh;
  }

  returnMeshToPool(mesh) {
    const activeIndex = this.activeMeshes.indexOf(mesh);
    if (activeIndex !== -1) {
      this.activeMeshes.splice(activeIndex, 1);
    }

    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }

    const char = mesh.userData.char;
    if (char) {
      const charPool = this.characterMeshPool.get(char) || [];
      if (charPool.length < this.maxPoolSizePerChar) {
        charPool.push(mesh);
        this.characterMeshPool.set(char, charPool);
      }
      // Don't dispose geometry - it's shared across all meshes for this character
    }
  }

  returnAllMeshesToPool() {
    const meshesToReturn = [...this.activeMeshes];
    meshesToReturn.forEach(mesh => this.returnMeshToPool(mesh));
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
    if (!this.font) return;
    
    // Throttle geometry updates for performance
    const now = Date.now();
    if (now - this.lastGeometryUpdate < this.geometryUpdateThrottle) {
      return;
    }
    this.lastGeometryUpdate = now;
    
    this.returnAllMeshesToPool();
    
    if (this.textMesh) {
      this.interfaceGroup.remove(this.textMesh);
      this.textMesh = null;
    }
    
    if (this.displayedText) {
      // Only re-wrap text if it has changed significantly
      if (!this.cachedText || this.displayedText !== this.cachedText) {
        this.textLines = this.wrapText(this.displayedText, this.maxCharsPerLine);
        this.cachedText = this.displayedText;
      }
      
      this.textMesh = new THREE.Group();
      
      const maxLines = Math.floor(this.interfaceHeight / this.lineHeight) - 1;
      const visibleLines = this.textLines.slice(-maxLines);
      
      visibleLines.forEach((line, index) => {
        const lineGroup = new THREE.Group();
        let currentX = -this.interfaceWidth / 2 + 1;
        const currentY = this.interfaceHeight / 2 - 1 - (index * this.lineHeight);
        
        // Create individual character meshes for the line
        const fixedCharWidth = 0.15; // Fixed width for monospace consistency
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const charMesh = this.getPooledCharacterMesh(char);
          
          // Position character
          charMesh.position.set(currentX, currentY, 0);
          lineGroup.add(charMesh);
          
          // Advance position for next character
          currentX += fixedCharWidth;
        }
        
        this.textMesh.add(lineGroup);
      });
      
      this.textMesh.position.set(0, 0, 1.1);
      this.interfaceGroup.add(this.textMesh);
    }
  }

  updateText(text) {
    if (this.isStreaming) {
      this.streamQueue.push(text);
      return;
    }
    
    this.currentText = text;
    this.displayedText = text;
    this.createTextGeometry();
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
          
          // Only update geometry if we're not already pending an update
          if (!this.pendingUpdate) {
            this.pendingUpdate = true;
            // Use requestAnimationFrame to batch geometry updates
            requestAnimationFrame(() => {
              this.createTextGeometry();
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
    
    this.createTextGeometry();
  }

  dispose() {
    this.returnAllMeshesToPool();
    
    // Dispose character geometries
    this.characterGeometryPool.forEach(geometry => {
      geometry.dispose();
    });
    this.characterGeometryPool.clear();
    this.characterMeshPool.clear();
    this.activeMeshes = [];

    if (this.textMesh) {
      this.interfaceGroup.remove(this.textMesh);
      this.textMesh = null;
    }

    if (this.textMaterial) {
      this.textMaterial.dispose();
      this.textMaterial = null;
    }
    
    if (this.planeMaterial) {
      this.planeMaterial.dispose();
      this.planeMaterial = null;
    }

    if (this.streamingTimeout) {
      cancelAnimationFrame(this.streamingTimeout);
      this.streamingTimeout = null;
    }

    this.isStreaming = false;
    this.streamQueue = [];
  }
}