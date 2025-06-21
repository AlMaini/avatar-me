import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export class AvatarInterface {
  constructor() {
    this.interfacePlane = null;
    this.textMesh = null;
    this.font = null;
    this.scene = null;
    this.isLoadingAnimating = false;
    this.loadingDots = 0;
    this.lastLoadingUpdate = Date.now();
    this.loadingInterval = 300; // 300ms between dots
    this.loadingDuration = 3000; // Total loading time in ms
    this.loadingStartTime = 0;
    this.loadingResolve = null;
    this.fontLoader = new FontLoader();
  }

  async createInterface(scene) {
    this.scene = scene;
    
    // Load the font first
    await this.loadFont();
    
    const planeGeometry = new THREE.BoxGeometry(7, 6.5, 1.5);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      side: THREE.DoubleSide
    });
    this.interfacePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.interfacePlane.position.set(0, 2, 1.3);
    scene.add(this.interfacePlane);
    
    // Create initial text geometry
    this.createTextGeometry();
    
    return this.interfacePlane;
  }

  loadFont() {
    return new Promise((resolve, reject) => {
      this.fontLoader.load(
        '/fonts/Glass TTY VT220_Medium.json',
        (font) => {
          this.font = font;
          resolve();
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
    // Remove existing text mesh
    if (this.textMesh) {
      this.scene.remove(this.textMesh);
      this.textMesh.geometry.dispose();
      this.textMesh.material.dispose();
    }

    if (!this.font) return;

    let displayText = '';
    
    // Show loading animation if active
    if (this.isLoadingAnimating) {
      const dots = '.'.repeat(this.loadingDots);
      displayText = `LOADING${dots}`;
    }

    if (displayText) {
      const textGeometry = new TextGeometry(displayText, {
        font: this.font,
        size: 0.3,
        height: 0.01,
        curveSegments: 4,
        bevelEnabled: false,
      });

      textGeometry.scale(1, 1, 0.000002);

      textGeometry.computeBoundingBox();
      const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
      const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;

      textGeometry.translate(-textWidth / 2, -textHeight / 2, 0);

      const textMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      // Position relative to the interface plane
      this.textMesh.position.copy(this.interfacePlane.position);
      this.textMesh.position.z += 0.8; // Slightly in front of the plane
      
      this.scene.add(this.textMesh);
    }
  }

  update() {
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
    }
  }

  startLoadingAnimation(duration = null) {
    return new Promise((resolve) => {
      this.isLoadingAnimating = true;
      this.loadingDots = 0;
      this.loadingStartTime = Date.now();
      this.lastLoadingUpdate = Date.now();
      this.loadingResolve = resolve;
      if (duration) {
        this.loadingDuration = duration;
      }
      this.createTextGeometry();
    });
  }

  stopLoadingAnimation() {
    this.isLoadingAnimating = false;
    this.createTextGeometry();
    if (this.loadingResolve) {
      this.loadingResolve();
      this.loadingResolve = null;
    }
  }
}