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
    this.controls = null;
    this.light = null;
    
    this.initScene();
    this.setupEventListeners();
  }

  initScene() {
    this.camera.position.z = 20;
    this.scene.add(this.camera);

    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;

    this.light = new THREE.PointLight("#98FFE7", 0, 100, 1.7);
    this.light.position.set(0, 10, 3);
    this.light.castShadow = true;
    this.scene.add(this.light);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
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

  update() {
    this.controls.update();
  }
}