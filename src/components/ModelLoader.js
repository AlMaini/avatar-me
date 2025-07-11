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

  async loadMonitor(scene) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        './monitor_2/monitor.gltf',
        (gltf) => {
          const monitor = gltf.scene;
          monitor.scale.set(1.3, 1.3, 1.3);
          monitor.position.set(10.2, -5, 5);
          monitor.rotateY(-2.2);
          scene.add(monitor);
          resolve(monitor);
        },
        undefined,
        reject
      );
    });
  }

  async loadDesk(scene) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        './desk/scene.gltf',
        (gltf) => {
          const desk = gltf.scene;
          desk.scale.set(12, 11, 12);
          desk.position.set(6, -18, 17);
          desk.rotateY(-2.2);
          scene.add(desk);
          resolve(desk);
        },
        undefined,
        reject
      );
    });
  }
}