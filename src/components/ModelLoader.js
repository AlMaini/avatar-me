import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
  }

  async loadTerminal(scene) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        './fixed_terminal_2/fixed_terminal.gltf',
        (gltf) => {
          const terminal = gltf.scene;
          terminal.scale.set(0.4, 0.4, 0.4);
          terminal.position.set(0, -5, 0);
          terminal.rotateY(-1.6);
          scene.add(terminal);
          resolve(terminal);
        },
        undefined,
        reject
      );
    });
  }
}