import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { PixelShader } from '../shaders/PixelShader.js';
import { MoodyShader } from '../shaders/MoodyShader.js';

export class PostProcessing {
  constructor(renderer, scene, camera, sizes) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sizes = sizes;
    this.composer = null;
    this.pixelPass = null;
    
    // Cache computed values
    this.cachedPixelSize = null;
    this.lastWidth = 0;
    
    this.setup();
  }

  setup() {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    this.pixelPass = new ShaderPass(PixelShader);
    this.pixelPass.uniforms.resolution.value.set(this.sizes.width, this.sizes.height);
    
    // Cache computed pixel size
    // this.cachedPixelSize = Math.max(1, Math.floor(this.sizes.width / 760));
    this.cachedPixelSize = 2;
    this.lastWidth = this.sizes.width;
    this.pixelPass.uniforms.pixelSize.value = this.cachedPixelSize;
    
    this.pixelPass.enabled = true;
    this.composer.addPass(this.pixelPass);

    // this.composer.addPass(new ShaderPass(MoodyShader));

  }

  updateSize(sizes) {
    this.sizes = sizes;
    this.composer.setSize(sizes.width, sizes.height);
    this.pixelPass.uniforms.resolution.value.set(sizes.width, sizes.height);
    
    // Only recalculate pixel size if width changed
    if (sizes.width !== this.lastWidth) {
      this.cachedPixelSize = Math.max(1, Math.floor(sizes.width / 640));
      this.pixelPass.uniforms.pixelSize.value = this.cachedPixelSize;
      this.lastWidth = sizes.width;
    }
  }

  render() {
    this.composer.render();
  }

  getPixelPass() {
    return this.pixelPass;
  }

  dispose() {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    this.pixelPass = null;
  }
}