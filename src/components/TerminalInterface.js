import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export class TerminalInterface {
  constructor() {
    this.currentText = '';
    this.interfacePlane = null;
    this.textMesh = null;
    this.cursorMesh = null;
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
  }

  async createInterface(scene) {
    this.scene = scene;
    
    // Load the font first
    await this.loadFont();
    
    const planeGeometry = new THREE.BoxGeometry(10, 8, 2);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      side: THREE.DoubleSide
    });
    this.interfacePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.interfacePlane.position.set(-10, 1, 5);
    this.interfacePlane.rotateY(0.65); // Rotate to face the camera
    scene.add(this.interfacePlane);
    
    // Create initial text geometry
    this.createTextGeometry();
    this.createCursorGeometry();
    
    return this.interfacePlane;
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

  createTextGeometry() {
    if (!this.font) return;
    
    // Remove existing text mesh if it exists
    if (this.textMesh) {
      this.scene.remove(this.textMesh);
      this.textMesh.geometry.dispose();
      this.textMesh.material.dispose();
    }
    
    let displayText = "";
    
    // Show loading animation if active
    if (this.isLoadingAnimating) {
      const dots = '.'.repeat(this.loadingDots);
      displayText = `LOADING${dots}`;
    } else if (this.isTyping) {
      displayText = `> ${this.currentText}`;
    }
    
    if (displayText) {
      const textGeometry = new TextGeometry(displayText, {
        font: this.font,
        size: 0.3,
        height: 0.05,
        curveSegments: 12,
        bevelEnabled: false
      });
      textGeometry.scale(1, 1, 0.000002);
      // Center the text
      textGeometry.computeBoundingBox();
      const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
      textGeometry.translate(-textWidth / 2, 0, 0);
      
      const textMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 1
      });
      this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
      this.textMesh.position.set(-10, 1, 9); // Slightly in front of the terminal plane
      this.textMesh.rotateY(0.65); // Match plane rotation
      this.scene.add(this.textMesh);
      
      // Update cursor position
      this.updateCursorPosition(textWidth);
    }
  }

  createCursorGeometry() {
    if (!this.font) return;
    
    // Remove existing cursor mesh if it exists
    if (this.cursorMesh) {
      this.scene.remove(this.cursorMesh);
      this.cursorMesh.geometry.dispose();
      this.cursorMesh.material.dispose();
    }
    
    const cursorGeometry = new THREE.BoxGeometry(0.02, 0.4, 0.05);
    cursorGeometry.scale(1, 1, 0.000002); // Match text scale
    const cursorMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    this.cursorMesh = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.cursorMesh.position.set(-10, 1.15, 9.1); // Base position
    this.cursorMesh.rotateY(0.65); // Match text rotation
    this.scene.add(this.cursorMesh);
  }

  updateCursorPosition(textWidth) {
    if (this.cursorMesh && this.isTyping && !this.isLoadingAnimating) {
      // Position cursor at the end of the text
      // Since text is centered, cursor should be at textWidth/2 from center
      this.cursorMesh.position.x = -10 + (textWidth / 2) + 0.1; // Base position + text width + small offset
    }
  }

  updateInterfaceWithText(text) {
    if (!this.interfacePlane || !this.font) return;
    
    this.currentText = text;
    this.createTextGeometry();
    
    // Start cursor animation if not already running and not loading
    if (!this.isAnimating && !this.isLoadingAnimating) {
      this.startCursorAnimation();
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

  createTextInput() {
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Type your command...';
    textInput.maxLength = 30;
    textInput.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      padding: 10px;
      font-size: 16px;
      font-family: monospace;
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #00ff88;
      color: #00ff88;
      border-radius: 5px;
      width: 300px;
      z-index: 100;
      outline: none;
    `;
    
    textInput.addEventListener('input', (event) => {
      this.currentText = event.target.value;
      this.isTyping = true; // Enable typing mode when user starts typing
      this.updateInterfaceWithText(this.currentText);
    });
    
    document.body.appendChild(textInput);
    return textInput;
  }
}