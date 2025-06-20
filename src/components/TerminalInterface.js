import * as THREE from 'three';

export class TerminalInterface {
  constructor() {
    this.currentText = '';
    this.interfacePlane = null;
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
  }

  createInterface(scene) {
    const planeGeometry = new THREE.BoxGeometry(7, 6, 2);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      side: THREE.DoubleSide
    });
    this.interfacePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.interfacePlane.position.set(0, 2, 1);
    scene.add(this.interfacePlane);
    return this.interfacePlane;
  }

  updateInterfaceWithText(text) {
    if (!this.interfacePlane) return;
    
    this.currentText = text;
    this.renderText();
    
    // Start cursor animation if not already running and not loading
    if (!this.isAnimating && !this.isLoadingAnimating) {
      this.startCursorAnimation();
    }
  }

  renderText() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 384;

    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#00ff88';
    context.font = 'bold 32px CustomTerminal, monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    let displayText;
    displayText = ""
    
    // Show loading animation if active
    if (this.isLoadingAnimating) {
      const dots = '.'.repeat(this.loadingDots);
      displayText = `LOADING${dots}`;
    } else if (this.isTyping) {
      // Always display the prompt and text (even if empty)
      displayText = `> ${this.currentText}`;
    }
    
    context.fillText(displayText, canvas.width/2, canvas.height/2);
    
    // Draw cursor if it should be visible and not loading
    if (this.cursorVisible && this.isTyping && !this.isLoadingAnimating) {
      context.fillRect(canvas.width/2 + context.measureText(displayText).width/2 + 5, 
                      canvas.height/2 - 16, 3, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    this.interfacePlane.material = new THREE.MeshBasicMaterial({ 
      map: texture,
      side: THREE.DoubleSide
    });
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
          this.renderText(); // Re-render with new loading state
        }
      } else {
        // Update cursor visibility based on time
        if (now - this.lastCursorUpdate > this.cursorBlinkInterval) {
          this.cursorVisible = !this.cursorVisible;
          this.lastCursorUpdate = now;
          this.renderText(); // Re-render with new cursor state
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
    this.renderText();
  }

  stopLoadingAnimation() {
    this.isLoadingAnimating = false;
    this.isTyping = true; // Enable normal text display
    this.cursorVisible = true; // Ensure cursor starts visible
    this.lastCursorUpdate = Date.now(); // Reset cursor timing
    this.renderText();
    
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