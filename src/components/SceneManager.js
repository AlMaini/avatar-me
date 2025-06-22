import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export class SceneManager {
  constructor(canvas) {
    this.sizes = {
      width: window.innerWidth || 800,
      height: window.innerHeight || 600
    };
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.sizes.width / this.sizes.height);
    this.renderer = new THREE.WebGLRenderer({canvas, antialias: true});
    this.controls = null;
    this.light = null;
    this.light2 = null;
    this.lights = null;
    
    this.mouse = { x: 0, y: 0 };
    this.cameraPositions = {
      center: { x: 0, y: 8, z: 30 },
      left: { x: 5, y: 0, z: 20 },
      right: { x: -5, y: 0, z: 20 }
    };
    this.cameraRotations = {
      center: { x: -0.3, y: 0, z: 0 },
      left: { x: 0, y: 0.65, z: 0 },
      right: { x: 0, y: -0.65, z: 0 }
    };
    this.cameraStates = ['left', 'center', 'right'];
    this.currentCameraIndex = 1;
    this.currentCameraTarget = { ...this.cameraPositions.center };
    this.currentRotationTarget = { ...this.cameraRotations.center };
    
    this.initScene();
    this.setupEventListeners();
  }

  initScene() {
    this.camera.position.set(50, 0, 50);
    

    this.scene.add(this.camera);

    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;

    this.light = new THREE.PointLight("#98FFE7", 0, 100, 1.3); //#98FFE7
    //this.light = new THREE.AmbientLight(0x404040, 2); // Soft ambient light
    //this.light.position.set(20, 7, 5.5);
    this.light.position.set(-30, 8, 13);
    this.light.castShadow = true;
    this.scene.add(this.light);

    // Add second point light
    this.light2 = new THREE.PointLight("#98FFE7", 300, 100, 1.3);
    this.light2.position.set(20, 7, 13);
    this.light2.castShadow = true;
    this.scene.add(this.light2);


    // // Add light helpers
    // this.lightHelper = new THREE.PointLightHelper(this.light, 0.5);
    // this.scene.add(this.lightHelper);

    // this.lightHelper2 = new THREE.PointLightHelper(this.light2, 0.5);
    // this.scene.add(this.lightHelper2);

    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableDamping = true;
    // this.controls.dampingFactor = 0.25;

    // const transformControls = new TransformControls(this.camera, this.renderer.domElement);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.sizes.width = window.innerWidth || 800;
      this.sizes.height = window.innerHeight || 600;

      this.camera.aspect = this.sizes.width / this.sizes.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.sizes.width, this.sizes.height);
      
      this.onResize?.(this.sizes);
    });
    
    window.addEventListener('mousemove', (event) => {
      this.mouse.x = (event.clientX / this.sizes.width) * 2 - 1;
      this.mouse.y = -(event.clientY / this.sizes.height) * 2 + 1;
      
      this.updateCameraTarget();
    });

    // Add keyboard event listener for arrow keys
    window.addEventListener('keydown', (event) => {
      // Prevent default behavior for arrow keys
      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }
      
      // If already moving, don't allow another movement
      if (this.isMoving) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          if (this.currentCameraIndex > 0) {
            this.isMoving = true;
            this.currentCameraIndex--;
            this.updateCameraToCurrentState();
            
            setTimeout(() => {
              this.isMoving = false;
            }, 300);
          }
          break;
          
        case 'ArrowRight':
          if (this.currentCameraIndex < this.cameraStates.length - 1) {
            this.isMoving = true;
            this.currentCameraIndex++;
            this.updateCameraToCurrentState();
            
            setTimeout(() => {
              this.isMoving = false;
            }, 300);
          }
          break;
      }
    });
  }

  setResizeCallback(callback) {
    this.onResize = callback;
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  getLight() {
    return this.light;
  }

  getSizes() {
    return this.sizes;
  }

  updateCameraTarget() {
    const threshold = 0.7;
    
    // If already moving, don't allow another movement until timeout is complete
    if (this.isMoving) return;
    
    if (this.mouse.x > threshold) {
      if (this.currentCameraIndex < this.cameraStates.length - 1) {
        this.isMoving = true;
        this.currentCameraIndex++;
        this.updateCameraToCurrentState();
        
        // Reset moving flag after delay
        setTimeout(() => {
          this.isMoving = false;
        }, 300); // 1 second delay
      }
    } else if (this.mouse.x < -threshold) {
      if (this.currentCameraIndex > 0) {
        this.isMoving = true;
        this.currentCameraIndex--;
        this.updateCameraToCurrentState();
        
        // Reset moving flag after delay
        setTimeout(() => {
          this.isMoving = false;
        }, 300); // 1 second delay
      }
    }
  }

  updateCameraToCurrentState() {
    const currentState = this.cameraStates[this.currentCameraIndex];
    this.currentCameraTarget = { ...this.cameraPositions[currentState] };
    this.currentRotationTarget = { ...this.cameraRotations[currentState] };
  }

  update() {
    const lerpFactor = 0.05;
    
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.currentCameraTarget.x, lerpFactor);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.currentCameraTarget.y, lerpFactor);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.currentCameraTarget.z, lerpFactor);
    
    this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, this.currentRotationTarget.x, lerpFactor);
    this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, this.currentRotationTarget.y, lerpFactor);
    this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, this.currentRotationTarget.z, lerpFactor);
  }
}