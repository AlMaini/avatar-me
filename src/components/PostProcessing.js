import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { PixelShader } from '../shaders/PixelShader.js';

export class PostProcessing {
  constructor(renderer, scene, camera, sizes) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sizes = sizes;
    this.composer = null;
    this.pixelPass = null;
    
    this.setup();
  }

  setup() {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    this.pixelPass = new ShaderPass(PixelShader);
    this.pixelPass.uniforms.resolution.value.set(this.sizes.width, this.sizes.height);
    this.pixelPass.enabled = true;
    this.composer.addPass(this.pixelPass);

  }

  updateSize(sizes) {
    this.sizes = sizes;
    this.composer.setSize(sizes.width, sizes.height);
    this.pixelPass.uniforms.resolution.value.set(sizes.width, sizes.height);
  }

  render() {
    this.composer.render();
  }

  getPixelPass() {
    return this.pixelPass;
  }
}