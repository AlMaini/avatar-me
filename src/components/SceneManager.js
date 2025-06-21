import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  constructor(canvas) {
    this.sizes = {
      width: window.innerWidth || 800,
      height: window.innerHeight || 600
    };
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.sizes.width / this.sizes.height);
    this.renderer = new THREE.WebGLRenderer({canvas, antialias: true});
    // this.controls = null;
    this.light = null;
    
    this.mouse = { x: 0, y: 0 };
    this.cameraPositions = {
      center: { x: 0, y: 0, z: 30 },
      left: { x: -5, y: 0, z: 25 },
      right: { x: 5, y: 0, z: 25 }
    };
    this.cameraRotations = {
      center: { x: 0, y: 0, z: 0 },
      left: { x: 0, y: 0.2, z: 0 },
      right: { x: 0, y: -0.2, z: 0 }
    };
    this.currentCameraTarget = { ...this.cameraPositions.center };
    this.currentRotationTarget = { ...this.cameraRotations.center };
    
    this.initScene();
    this.setupEventListeners();
  }

  initScene() {
    this.camera.position.z = 30;
    this.scene.add(this.camera);

    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;

    this.light = new THREE.PointLight("#98FFE7", 0, 100, 1.7); //#98FFE7
    // this.light = new THREE.AmbientLight(0x404040, 2); // Soft ambient light
    this.light.position.set(10, 10, 10);
    this.light.castShadow = true;
    this.scene.add(this.light);

    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableDamping = true;
    // this.controls.dampingFactor = 0.25;
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
    
    if (this.mouse.x > threshold) {
      this.currentCameraTarget = { ...this.cameraPositions.right };
      this.currentRotationTarget = { ...this.cameraRotations.right };
    } else if (this.mouse.x < -threshold) {
      this.currentCameraTarget = { ...this.cameraPositions.left };
      this.currentRotationTarget = { ...this.cameraRotations.left };
    } else {
      this.currentCameraTarget = { ...this.cameraPositions.center };
      this.currentRotationTarget = { ...this.cameraRotations.center };
    }
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