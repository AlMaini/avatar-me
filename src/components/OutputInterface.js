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
    this.maxCharsPerLine = 35;
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
      emissiveIntensity: 2
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
        const lineMesh = this.getPooledTextMesh(line);
        
        lineMesh.geometry.computeBoundingBox();
        const bbox = lineMesh.geometry.boundingBox;
        lineMesh.geometry.translate(-bbox.min.x, -bbox.min.y, -bbox.min.z);
        
        const startX = -this.interfaceWidth / 2 + 1;
        const startY = this.interfaceHeight / 2 - 1 - (index * this.lineHeight);
        
        lineMesh.geometry.translate(startX, startY, 0);
        lineMesh.position.set(0, 0, 0);
        
        this.textMesh.add(lineMesh);
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
    this.textMeshPool.forEach(mesh => {
      mesh.geometry.dispose();
    });
    this.textMeshPool = [];
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