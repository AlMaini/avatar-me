import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export class TerminalInterface {
  constructor() {
    this.currentText = '';
    this.interfacePlane = null;
    this.textMesh = null;
    this.cursorMesh = null;
    this.interfaceGroup = null;
    this.font = null;
    this.scene = null;
    this.cursorVisible = true;
    this.lastCursorUpdate = Date.now();
    this.cursorBlinkInterval = 500; // 500ms blink interval
    this.isAnimating = false;
    this.isLoadingAnimating = false;
    this.isTyping = false;
    this.loadingDots = 0;
    this.lastLoadingUpdate = Date.now();
    this.loadingInterval = 300; // 300ms between dots
    this.loadingDuration = 3000; // Total loading time in ms
    this.loadingStartTime = 0;
    this.fontLoader = new FontLoader();
    // Interface dimensions for text wrapping
    this.interfaceWidth = 10;
    this.interfaceHeight = 8;
    this.maxCharsPerLine = 35; // Approximate chars per line
    this.lineHeight = 0.5;
    this.currentLine = 0;
    this.textLines = [];
    this.updateTimeout = null;
  }

  async createInterface(scene) {
    this.scene = scene;
    
    // Load the font first
    await this.loadFont();
    
    // Create a group to hold all interface elements
    this.interfaceGroup = new THREE.Group();
    this.interfaceGroup.position.set(-10, 1, 5);
    this.interfaceGroup.rotateY(0.65); // Rotate to face the camera
    
    const planeGeometry = new THREE.BoxGeometry(this.interfaceWidth, this.interfaceHeight, 2);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      side: THREE.DoubleSide
    });
    this.interfacePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.interfaceGroup.add(this.interfacePlane);
    
    scene.add(this.interfaceGroup);
    
    // Create initial text geometry
    this.createTextGeometry();
    this.createCursorGeometry();
    
    return this.interfaceGroup;
  }

  loadFont() {
    return new Promise((resolve, reject) => {
      this.fontLoader.load(
        '/fonts/Glass TTY VT220_Medium.json',
        (font) => {
          this.font = font;
          resolve(font);
        },
        undefined,
        (error) => {
          console.error('Error loading font:', error);
          reject(error);
        }
      );
    });
  }

  wrapText(text, maxCharsPerLine) {
    if (text.length <= maxCharsPerLine) {
      return [text];
    }
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let word of words) {
      // Handle words longer than maxCharsPerLine
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
    
    // Remove existing text mesh if it exists
    if (this.textMesh) {
      this.interfaceGroup.remove(this.textMesh);
      // Properly dispose of all child geometries and materials
      this.textMesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.textMesh = null;
    }
    
    let displayText = "";
    
    if (this.isTyping) {
      displayText = `> ${this.currentText}`;
      this.textLines = this.wrapText(displayText, this.maxCharsPerLine);
    } else {
      this.textLines = [];
    }
    
    // Debug logging
    console.log('Display text:', displayText);
    console.log('Text lines:', this.textLines);
    
    // Create text mesh group for multi-line text
    if (this.textLines.length > 0) {
      this.textMesh = new THREE.Group();
      
      const maxLines = Math.floor(this.interfaceHeight / this.lineHeight) - 1;
      const visibleLines = this.textLines.slice(-maxLines);
      
      visibleLines.forEach((line, index) => {
        const textGeometry = new TextGeometry(line || ' ', {
          font: this.font,
          size: 0.3,
          height: 0.05,
          curveSegments: 12,
          bevelEnabled: false
        });
        
        textGeometry.computeBoundingBox();
        
        // Position text within interface bounds
        const startX = -this.interfaceWidth / 2 + 1;
        const startY = this.interfaceHeight / 2 - 1 - (index * this.lineHeight);
        
        textGeometry.translate(startX, startY, 0);
        
        const textMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x00ff88,
          emissive: 0x00ff88,
          emissiveIntensity: 0.5
        });
        
        const lineMesh = new THREE.Mesh(textGeometry, textMaterial);
        lineMesh.position.z = 0;
        lineMesh.scale.set(1, 1, 0.001);
        this.textMesh.add(lineMesh);
      });
      
      this.textMesh.position.set(0, 0, 1.1);
      this.interfaceGroup.add(this.textMesh);
      
      // Update cursor position for the last line
      this.currentLine = visibleLines.length - 1;
      const lastLine = visibleLines[visibleLines.length - 1] || '';
      this.updateCursorPosition(lastLine);
    } else {
      // If no text lines, position cursor at the beginning of prompt
      this.currentLine = 0;
      this.updateCursorPosition('> ');
    }
  }
  
  updateInterfaceWithText(text) {
    if (!this.interfacePlane || !this.font) return;
    
    this.currentText = text;
    
    // Add a small delay to prevent rapid re-creation
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    this.updateTimeout = setTimeout(() => {
      this.createTextGeometry();
      
      // Start cursor animation if not already running and not loading
      if (!this.isAnimating && !this.isLoadingAnimating) {
        this.startCursorAnimation();
      }
    }, 16); // ~60fps
  }

  createCursorGeometry() {
    if (!this.font) return;
    
    // Remove existing cursor mesh if it exists
    if (this.cursorMesh) {
      this.interfaceGroup.remove(this.cursorMesh);
      this.cursorMesh.geometry.dispose();
      this.cursorMesh.material.dispose();
    }
    
    const cursorGeometry = new THREE.BoxGeometry(0.02, 0.3, 0.05);
    cursorGeometry.scale(1, 1, 0.000002); // Match text scale
    const cursorMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5
    });
    this.cursorMesh = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.cursorMesh.position.set(0, 0, 1.1); // Base position within group
    this.interfaceGroup.add(this.cursorMesh);
  }

  updateCursorPosition(lastLineText) {
    if (this.cursorMesh && this.isTyping && !this.isLoadingAnimating) {
      // Calculate cursor position based on last line text length
      const charWidth = 0.21; // Approximate character width
      const textLength = lastLineText.length;
      
      // Position cursor at the end of the last line
      const startX = -this.interfaceWidth / 2 + 1; // Match text start position
      const startY = this.interfaceHeight / 2 - 1 - (this.currentLine * this.lineHeight);
      
      this.cursorMesh.position.x = startX + (textLength * charWidth) + 0.05;
      this.cursorMesh.position.y = startY + 0.15;
      
      // Keep cursor within bounds - but allow it to move to next line if needed
      const maxX = this.interfaceWidth / 2 - 0.3;
      if (this.cursorMesh.position.x > maxX) {
        // If cursor would go beyond bounds, it should be on the next line
        // This is handled by the text wrapping, so just clamp to max position
        this.cursorMesh.position.x = maxX;
      }
    }
  }


  startCursorAnimation() {
    this.isAnimating = true;
    
    const animate = () => {
      const now = Date.now();
      
      // Handle loading animation
      if (this.isLoadingAnimating) {
        // Check if loading duration has elapsed
        if (now - this.loadingStartTime >= this.loadingDuration) {
          this.stopLoadingAnimation();
          return;
        }
        
        // Add dots continuously
        if (now - this.lastLoadingUpdate > this.loadingInterval) {
          this.loadingDots++;
          this.lastLoadingUpdate = now;
          this.createTextGeometry(); // Re-render with new loading state
        }
      } else {
        // Update cursor visibility based on time
        if (now - this.lastCursorUpdate > this.cursorBlinkInterval) {
          this.cursorVisible = !this.cursorVisible;
          this.lastCursorUpdate = now;
          // Toggle cursor visibility in 3D
          if (this.cursorMesh) {
            this.cursorMesh.visible = this.cursorVisible && this.isTyping && !this.isLoadingAnimating;
          }
        }
      }
      
      if (this.isAnimating) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  startLoadingAnimation(duration = null) {
    this.isLoadingAnimating = true;
    this.loadingDots = 0;
    this.loadingStartTime = Date.now();
    this.lastLoadingUpdate = Date.now();
    if (duration) {
      this.loadingDuration = duration;
    }
    if (this.cursorMesh) {
      this.cursorMesh.visible = false; // Hide cursor during loading
    }
    this.createTextGeometry();
  }

  stopLoadingAnimation() {
    this.isLoadingAnimating = false;
    this.isTyping = true; // Enable normal text display
    this.cursorVisible = true; // Ensure cursor starts visible
    this.lastCursorUpdate = Date.now(); // Reset cursor timing
    this.createTextGeometry();
    
    // Show cursor after loading completes
    if (this.cursorMesh) {
      this.cursorMesh.visible = true;
    }
    
    // Start cursor animation after loading completes
    if (!this.isAnimating) {
      this.startCursorAnimation();
    }
  }

  setupKeyboardListeners() {
    document.addEventListener('keydown', (event) => {
      // Ignore if any input elements are focused
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      
      if (event.key === 'Backspace') {
        event.preventDefault();
        this.currentText = this.currentText.slice(0, -1);
        this.isTyping = true;
        this.updateInterfaceWithText(this.currentText);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        // Handle command submission here if needed
        console.log('Command entered:', this.currentText);
        this.currentText = '';
        this.updateInterfaceWithText(this.currentText);
      } else if (event.key.length === 1) {
        // Only add printable characters
        event.preventDefault();
        this.currentText += event.key;
        this.isTyping = true;
        this.updateInterfaceWithText(this.currentText);
      }
    });
  }
}