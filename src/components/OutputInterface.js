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
    this.streamingSpeed = 100; // ms between character batches
    this.charactersPerBatch = 5; // characters to add per batch
    this.lastStreamUpdate = Date.now();
    this.streamingTimeout = null;
    this.pendingUpdate = false;
    
    // Interface dimensions
    this.interfaceWidth = 10;
    this.interfaceHeight = 8;
    this.maxCharsPerLine = 40;
    this.lineHeight = 0.5;
    this.textLines = [];
    
    // Object pooling for text geometries
    this.textMeshPool = [];
    this.activeMeshes = [];
    this.maxPoolSize = 50; // Increased pool size for better performance
    
    // Performance optimizations
    this.lastGeometryUpdate = 0;
    this.geometryUpdateThrottle = 16; // ~60fps max updates
    
    // Shared materials
    this.textMaterial = null;
    this.planeMaterial = null;
    
    // Caching for performance
    this.cachedText = null;
  }

  async createInterface(scene) {
    this.scene = scene;
    
    await this.loadFont();
    this.initializeMaterials();
    
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
      emissiveIntensity: 3
    });
    
    // Add hidden material for characters that haven't been revealed yet
    this.hiddenTextMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x000000,
      emissive: 0x000000,
      emissiveIntensity: -1
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

  getPooledTextMesh(text) {
    const pooledMesh = this.textMeshPool.find(mesh => mesh.userData.text === text);
    if (pooledMesh) {
      const index = this.textMeshPool.indexOf(pooledMesh);
      this.textMeshPool.splice(index, 1);
      this.activeMeshes.push(pooledMesh);
      return pooledMesh;
    }

    const textGeometry = new TextGeometry(text || ' ', {
      font: this.font,
      size: 0.25,
      height: 0.03,
      curveSegments: 12,
      bevelEnabled: false
    });
    
    const lineMesh = new THREE.Mesh(textGeometry, this.textMaterial);
    lineMesh.userData.text = text;
    lineMesh.scale.set(1, 1, 0.001);
    this.activeMeshes.push(lineMesh);
    return lineMesh;
  }

  returnMeshToPool(mesh) {
    const activeIndex = this.activeMeshes.indexOf(mesh);
    if (activeIndex !== -1) {
      this.activeMeshes.splice(activeIndex, 1);
    }

    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }

    if (this.textMeshPool.length < this.maxPoolSize) {
      this.textMeshPool.push(mesh);
    } else {
      mesh.geometry.dispose();
    }
  }

  returnAllMeshesToPool() {
    const meshesToReturn = [...this.activeMeshes];
    meshesToReturn.forEach(mesh => this.returnMeshToPool(mesh));
  }

  wrapText(text, maxCharsPerLine) {
    // First split by newlines to respect explicit line breaks
    const paragraphs = text.split('\n');
    const allLines = [];
    
    paragraphs.forEach(paragraph => {
      if (paragraph.length === 0) {
        // Preserve empty lines
        allLines.push('');
        return;
      }
      
      if (paragraph.length <= maxCharsPerLine) {
        allLines.push(paragraph);
        return;
      }
      
      // Wrap long paragraphs
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (let word of words) {
        // Handle words longer than maxCharsPerLine
        while (word.length > maxCharsPerLine) {
          if (currentLine) {
            allLines.push(currentLine);
            currentLine = '';
          }
          allLines.push(word.substring(0, maxCharsPerLine));
          word = word.substring(maxCharsPerLine);
        }
        
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        
        if (testLine.length <= maxCharsPerLine) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            allLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = word;
          }
        }
      }
      
      if (currentLine) {
        allLines.push(currentLine);
      }
    });
    
    return allLines.length > 0 ? allLines : [''];
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
    
    if (this.currentText) {
      // Only re-wrap text if it has changed significantly
      if (!this.cachedText || this.currentText !== this.cachedText) {
        this.textLines = this.wrapText(this.currentText, this.maxCharsPerLine);
        this.cachedText = this.currentText;
      }
      
      this.textMesh = new THREE.Group();
      this.characterMeshes = []; // Store references to individual character meshes
      
      const maxLines = Math.floor(this.interfaceHeight / this.lineHeight) - 1;
      const visibleLines = this.textLines.slice(-maxLines);
      
      let globalCharIndex = 0;
      
      visibleLines.forEach((line, lineIndex) => {
        const startX = -this.interfaceWidth / 2 + 1;
        const startY = this.interfaceHeight / 2 - 1 - (lineIndex * this.lineHeight);
        
        // Create individual character meshes for granular control
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          const char = line[charIndex];
          
          const charGeometry = new TextGeometry(char, {
            font: this.font,
            size: 0.30,
            height: 0.03,
            curveSegments: 12,
            bevelEnabled: false
          });
          
          // Determine if this character should be visible based on streaming progress
          const shouldBeVisible = globalCharIndex < this.displayedText.length;
          const material = shouldBeVisible ? this.textMaterial : this.hiddenTextMaterial;
          
          const charMesh = new THREE.Mesh(charGeometry, material);
          charMesh.scale.set(1, 1, 0.001);
          
          // Standardize positioning - don't use individual bounding boxes
          // Position character with consistent spacing
          const charWidth = 0.20; // Consistent character width
          const charX = startX + (charIndex * charWidth);
          
          charMesh.position.set(charX, startY, 0);
          charMesh.userData.globalIndex = globalCharIndex;
          
          this.characterMeshes.push(charMesh);
          this.textMesh.add(charMesh);
          
          globalCharIndex++;
        }
      });
      
      this.textMesh.position.set(0, 0, 1.1);
      this.interfaceGroup.add(this.textMesh);
    }
  }

  updateStreamingDisplay() {
    if (!this.characterMeshes) return;
    
    // Update character materials based on current displayed text length
    this.characterMeshes.forEach((charMesh) => {
      const shouldBeVisible = charMesh.userData.globalIndex < this.displayedText.length;
      charMesh.material = shouldBeVisible ? this.textMaterial : this.hiddenTextMaterial;
    });
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
          
          // Update character visibility instead of recreating geometry
          this.updateStreamingDisplay();
          
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
    
    // Create all geometries upfront
    this.createTextGeometry();
    
    this.startStreaming();
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
    this.textMeshPool.forEach(mesh => {
      mesh.geometry.dispose();
    });
    this.textMeshPool = [];
    this.activeMeshes = [];
    this.characterMeshes = [];

    if (this.textMesh) {
      this.interfaceGroup.remove(this.textMesh);
      this.textMesh = null;
    }

    if (this.textMaterial) {
      this.textMaterial.dispose();
      this.textMaterial = null;
    }
    
    if (this.hiddenTextMaterial) {
      this.hiddenTextMaterial.dispose();
      this.hiddenTextMaterial = null;
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