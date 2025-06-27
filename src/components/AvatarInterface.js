import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { threeFontManager } from '../utils/FontLoader.js';

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
    
    // Blinking animation properties
    this.isBlinking = false;
    this.blinkDuration = 150; // How long eyes stay closed (ms)
    this.blinkInterval = 3000; // Time between blinks (ms)
    this.lastBlinkTime = Date.now();
    this.blinkStartTime = 0;
    
    // Eye references for blinking optimization
    this.leftEyeGroup = null;
    this.rightEyeGroup = null;
    this.leftEyeClosed = null;
    this.rightEyeClosed = null;
    this.mouthGroup = null;
    
    // Mouse tracking properties
    this.mouse = { x: 0, y: 0 };
    this.eyeBasePositions = {
      left: { x: -0.1, y: 0.3 },
      right: { x: 0.1, y: 0.3 }
    };
    
    // Damping properties for smooth movement
    this.currentEyePosition = { x: 0, y: 0 };
    this.targetEyePosition = { x: 0, y: 0 };
    this.dampingFactor = 0.12; // Lower = smoother but slower response
    
    // Individual eye damping for natural variation
    this.leftEyeDamping = 0.12;
    this.rightEyeDamping = 0.14; // Slightly different for natural movement
    this.currentLeftEyePosition = { x: 0, y: 0 };
    this.currentRightEyePosition = { x: 0, y: 0 };
    
    // Breathing animation properties
    this.breathingOffset = 0;
    this.breathingSpeed = 0.05;
    this.breathingAmplitude = 0.02;
    this.mouthBasePosition = { x: 0, y: -0.8 };
    
    // Shared materials
    this.avatarMaterial = null;
    this.textMaterial = null;
  }

  async createInterface(scene) {
    this.scene = scene;
    
    // Load the font first
    await this.loadFont();
    
    // Initialize shared materials
    this.initializeMaterials();
    
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

  initializeMaterials() {
    this.avatarMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00FF41,
      emissive: 0x00FF41,
      emissiveIntensity: 3
    });
    
    this.textMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 3
    });
  }

  async loadFont() {
    try {
      this.font = await threeFontManager.loadFont('/fonts/Glass TTY VT220_Medium.json');
    } catch (error) {
      console.error('Error loading font:', error);
      throw error;
    }
  }

  createAvatarMesh() {
    // Only create if it doesn't exist
    if (this.avatarMesh) return;

    if (!this.font) return;

    // Create a group to hold all avatar elements
    this.avatarMesh = new THREE.Group();

    // Define eye states
    const leftEyeOpen = [
      '########',
      '#       #',
      '########'
    ];

    const rightEyeOpen = [
      '########',
      '#       #',
      '########'
    ];

    const leftEyeClosed = [
      '####',
      '####'
    ];
    
    const rightEyeClosed = [
      '####',
      '####'
    ];

    const mouth = [
      '      #',
      '#           #',
      '###########',
      ' ###   ### '
    ];

    // Function to create ASCII art text geometry from array
    const createASCIIGroup = (asciiArray, offsetX, offsetY) => {
      const group = new THREE.Group();
      
      for (let row = 0; row < asciiArray.length; row++) {
        const line = asciiArray[row];
        
        // Create text geometry for each line
        const textGeometry = new TextGeometry(line, {
          font: this.font,
          size: 0.3,
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

        const textMesh = new THREE.Mesh(textGeometry, this.avatarMaterial);
        
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

    // Create both open and closed eye states
    this.leftEyeGroup = createASCIIGroup(leftEyeOpen, -1.4, 0.8);
    this.rightEyeGroup = createASCIIGroup(rightEyeOpen, 1.4, 0.8);
    this.leftEyeClosed = createASCIIGroup(leftEyeClosed, -1.4, 0.8);
    this.rightEyeClosed = createASCIIGroup(rightEyeClosed, 1.4, 0.8);
    this.mouthGroup = createASCIIGroup(mouth, 0, -0.8);

    // Initially show open eyes, hide closed eyes
    this.leftEyeClosed.visible = false;
    this.rightEyeClosed.visible = false;

    // Add all groups to the main avatar mesh
    this.avatarMesh.add(this.leftEyeGroup);
    this.avatarMesh.add(this.rightEyeGroup);
    this.avatarMesh.add(this.leftEyeClosed);
    this.avatarMesh.add(this.rightEyeClosed);
    this.avatarMesh.add(this.mouthGroup);

    // Position the avatar mesh relative to the interface plane
    this.avatarMesh.position.copy(this.interfacePlane.position);
    this.avatarMesh.position.z += 0.9; // In front of the plane
    this.avatarMesh.position.y += 0.5; // Slightly higher

    this.avatarMesh.visible = false; // Hidden initially

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

      this.textMesh = new THREE.Mesh(textGeometry, this.textMaterial);
      
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
      
      // Update eye tracking
      this.updateEyeTracking();
      
      // Update breathing animation
      this.updateBreathing();
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
    
    // Toggle eye visibility
    if (this.leftEyeGroup && this.rightEyeGroup && this.leftEyeClosed && this.rightEyeClosed) {
      this.leftEyeGroup.visible = false;
      this.rightEyeGroup.visible = false;
      this.leftEyeClosed.visible = true;
      this.rightEyeClosed.visible = true;
    }
  }

  endBlink() {
    this.isBlinking = false;
    this.lastBlinkTime = Date.now();
    
    // Toggle eye visibility back
    if (this.leftEyeGroup && this.rightEyeGroup && this.leftEyeClosed && this.rightEyeClosed) {
      this.leftEyeGroup.visible = true;
      this.rightEyeGroup.visible = true;
      this.leftEyeClosed.visible = false;
      this.rightEyeClosed.visible = false;
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
    
    // Show avatar after loading completes
    if (this.avatarMesh) {
      this.avatarMesh.visible = true;
    }
    
    if (this.loadingResolve) {
      this.loadingResolve(); // Fixed: was calling resolve instead of this.loadingResolve()
      this.loadingResolve = null;
    }
  }

  updateMouse(mouseX, mouseY) {
    this.mouse.x = mouseX;
    this.mouse.y = mouseY;
  }

  updateEyeTracking() {
    if (!this.leftEyeGroup || !this.rightEyeGroup) return;
    
    // Calculate target eye movement based on mouse position
    const eyeMovementRange = 0.3; // How far eyes can move
    const mouseInfluence = 0.9; // How much mouse affects eye position
    
    this.targetEyePosition.x = this.mouse.x * eyeMovementRange * mouseInfluence;
    this.targetEyePosition.y = this.mouse.y * eyeMovementRange * mouseInfluence * 0.3; // Less vertical movement
    
    // Apply individual damping to each eye for natural variation
    this.currentLeftEyePosition.x += (this.targetEyePosition.x - this.currentLeftEyePosition.x) * this.leftEyeDamping;
    this.currentLeftEyePosition.y += (this.targetEyePosition.y - this.currentLeftEyePosition.y) * this.leftEyeDamping;
    
    this.currentRightEyePosition.x += (this.targetEyePosition.x - this.currentRightEyePosition.x) * this.rightEyeDamping;
    this.currentRightEyePosition.y += (this.targetEyePosition.y - this.currentRightEyePosition.y) * this.rightEyeDamping;
    
    // Update left eye position with its own damped values
    this.leftEyeGroup.position.set(
      this.eyeBasePositions.left.x + this.currentLeftEyePosition.x,
      this.eyeBasePositions.left.y + this.currentLeftEyePosition.y,
      0
    );
    
    // Update right eye position with its own damped values
    this.rightEyeGroup.position.set(
      this.eyeBasePositions.right.x + this.currentRightEyePosition.x,
      this.eyeBasePositions.right.y + this.currentRightEyePosition.y,
      0
    );
    
    // Also update closed eye positions for blinking
    if (this.leftEyeClosed && this.rightEyeClosed) {
      this.leftEyeClosed.position.set(
        this.eyeBasePositions.left.x + this.currentLeftEyePosition.x,
        this.eyeBasePositions.left.y + this.currentLeftEyePosition.y,
        0
      );
      
      this.rightEyeClosed.position.set(
        this.eyeBasePositions.right.x + this.currentRightEyePosition.x,
        this.eyeBasePositions.right.y + this.currentRightEyePosition.y,
        0
      );
    }
    
    // Update mouth position to follow eyes with damping (using average of both eyes)
    if (this.mouthGroup) {
      // Calculate breathing movement (sine wave)
      const breathingY = Math.sin(this.breathingOffset) * this.breathingAmplitude;
      
      // Use average of both eye positions for mouth movement
      const avgEyeX = (this.currentLeftEyePosition.x + this.currentRightEyePosition.x) / 2;
      const avgEyeY = (this.currentLeftEyePosition.y + this.currentRightEyePosition.y) / 2;
      
      // Move mouth with eyes but with less influence and damping
      const mouthInfluence = 0.9; // Less movement than eyes
      this.mouthGroup.position.set(
        this.mouthBasePosition.x + (avgEyeX * mouthInfluence),
        this.mouthBasePosition.y + (avgEyeY * mouthInfluence) + breathingY,
        0
      );
    }
  }

  updateBreathing() {
    if (!this.mouthGroup) return;
    
    // Update breathing offset
    this.breathingOffset += this.breathingSpeed;
    
    // Calculate breathing movement (sine wave)
    const breathingY = Math.sin(this.breathingOffset) * this.breathingAmplitude;
    
    // Update mouth position
    // this.mouthGroup.position.set(
    //   this.mouthBasePosition.x,
    //   this.mouthBasePosition.y + breathingY,
    //   0
    // );
    this.mouthGroup.position.y = this.mouthBasePosition.y + breathingY; // Only update Y position
  }

  dispose() {
    // Dispose of avatar mesh and all its children
    if (this.avatarMesh) {
      this.avatarMesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
      });
      this.scene.remove(this.avatarMesh);
      this.avatarMesh = null;
    }

    // Dispose of text mesh
    if (this.textMesh) {
      this.textMesh.geometry.dispose();
      this.scene.remove(this.textMesh);
      this.textMesh = null;
    }

    // Dispose of shared materials
    if (this.avatarMaterial) {
      this.avatarMaterial.dispose();
      this.avatarMaterial = null;
    }
    if (this.textMaterial) {
      this.textMaterial.dispose();
      this.textMaterial = null;
    }

    // Reset references
    this.leftEyeGroup = null;
    this.rightEyeGroup = null;
    this.leftEyeClosed = null;
    this.rightEyeClosed = null;
  }
}