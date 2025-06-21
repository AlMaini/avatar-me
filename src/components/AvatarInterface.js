import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export class AvatarInterface {
  constructor() {
    this.interfacePlane = null;
    this.textMesh = null;
    this.avatarMesh = null;
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
    
    // Blinking animation properties
    this.isBlinking = false;
    this.blinkDuration = 150; // How long eyes stay closed (ms)
    this.blinkInterval = 5000; // Time between blinks (ms)
    this.lastBlinkTime = Date.now();
    this.blinkStartTime = 0;
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
    
    // Create avatar mesh
    this.createAvatarMesh();
    
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

  createAvatarMesh() {
    // Remember the current visibility state
    const wasVisible = this.avatarMesh ? this.avatarMesh.visible : false;
    
    // Remove existing avatar mesh
    if (this.avatarMesh) {
      this.scene.remove(this.avatarMesh);
      this.avatarMesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    if (!this.font) return;

    // Create a group to hold all avatar elements
    this.avatarMesh = new THREE.Group();

    // Simplified ASCII art using # blocks - with blinking states
    let leftEye, rightEye;
    
    if (this.isBlinking) {
      // Closed eyes - top and bottom lines converged
      leftEye = [
        '######',
        '######'
      ];
      
      rightEye = [
        '######',
        '######'
      ];
    } else {
      // Open eyes - normal state
      leftEye = [
        '##########',
        '#         #',
        '##########'
      ];

      rightEye = [
        '##########',
        '#         #',
        '##########'
      ];
    }

    const mouth = [
      '        #',
      '#             #',
      '#############',
      ' ###     ### '
    ];

    // Use same material as text for all avatar parts
    const avatarMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5
    });

    // Function to create ASCII art text geometry from array
    const createASCIIGroup = (asciiArray, offsetX, offsetY) => {
      const group = new THREE.Group();
      
      for (let row = 0; row < asciiArray.length; row++) {
        const line = asciiArray[row];
        
        // Create text geometry for each line
        const textGeometry = new TextGeometry(line, {
          font: this.font,
          size: 0.15,
          height: 0.02,
          curveSegments: 12,
          bevelEnabled: false,
        });

        textGeometry.scale(1, 1, 0.000002);

        textGeometry.computeBoundingBox();
        const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
        const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;

        // Center the text horizontally
        textGeometry.translate(-textWidth / 2, 0, 0);

        const textMesh = new THREE.Mesh(textGeometry, avatarMaterial);
        
        // Position each line
        textMesh.position.set(
          offsetX,
          offsetY - (row * 0.2), // Stack lines vertically
          0
        );
        
        group.add(textMesh);
      }
      
      return group;
    };

    // Create eyes and mouth as text
    const leftEyeGroup = createASCIIGroup(leftEye, -1.4, 0.8);
    const rightEyeGroup = createASCIIGroup(rightEye, 1.4, 0.8);
    const mouthGroup = createASCIIGroup(mouth, 0, -0.8);

    // Add all groups to the main avatar mesh
    this.avatarMesh.add(leftEyeGroup);
    this.avatarMesh.add(rightEyeGroup);
    this.avatarMesh.add(mouthGroup);

    // Position the avatar mesh relative to the interface plane
    this.avatarMesh.position.copy(this.interfacePlane.position);
    this.avatarMesh.position.z += 0.9; // In front of the plane
    this.avatarMesh.position.y += 0.5; // Slightly higher

    // Restore the visibility state instead of always hiding
    this.avatarMesh.visible = wasVisible;

    this.scene.add(this.avatarMesh);
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
        size: 0.5,
        height: 0.05,
        curveSegments: 12,
        bevelEnabled: false,
      });

      textGeometry.scale(1, 1, 0.000002);

      textGeometry.computeBoundingBox();
      const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
      const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;

      textGeometry.translate(-textWidth / 2, -textHeight / 2, 0);

      const textMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ff88,
                emissive: 0x00ff88,
                emissiveIntensity: 0.5
              });
      this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      // Position relative to the interface plane, below the avatar
      this.textMesh.position.copy(this.interfacePlane.position);
      this.textMesh.position.z += 0.8; // Slightly in front of the plane
      //this.textMesh.position.y -= 1.5; // Below the avatar
      
      this.scene.add(this.textMesh);
    }
  }

  update() {
    const now = Date.now();
    
    // Handle blinking animation (only when avatar is visible)
    if (this.avatarMesh && this.avatarMesh.visible) {
      if (!this.isBlinking) {
        // Check if it's time to start a blink
        if (now - this.lastBlinkTime > this.blinkInterval) {
          this.startBlink();
        }
      } else {
        // Check if blink duration has elapsed
        if (now - this.blinkStartTime > this.blinkDuration) {
          this.endBlink();
        }
      }
    }
    
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

  startBlink() {
    this.isBlinking = true;
    this.blinkStartTime = Date.now();
    this.createAvatarMesh(); // Recreate with closed eyes
  }

  endBlink() {
    this.isBlinking = false;
    this.lastBlinkTime = Date.now();
    this.createAvatarMesh(); // Recreate with open eyes
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
    
    // Show avatar after loading completes
    if (this.avatarMesh) {
      this.avatarMesh.visible = true;
    }
    
    if (this.loadingResolve) {
      this.loadingResolve(); // Fixed: was calling resolve instead of this.loadingResolve()
      this.loadingResolve = null;
    }
  }
}