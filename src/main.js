import { SceneManager } from './components/SceneManager.js';
import { ModelLoader } from './components/ModelLoader.js';
import { TerminalInterface} from './components/TerminalInterface.js';
import { createInterfaceMesh } from './components/ModelCreator.js';
import { PostProcessing } from './components/PostProcessing.js';
import { Animations } from './components/Animations.js';
import { loadCustomFont } from './utils/FontLoader.js';

let terminal;
let monitor_right;
let monitor_left
let sceneManager;
let terminalInterface;
let postProcessing;
let modelLoader;



async function init() {
  try {
    await loadCustomFont();
    
    const canvas = document.querySelector('.webgl');
    sceneManager = new SceneManager(canvas);
    
    modelLoader = new ModelLoader();
    terminal = await modelLoader.loadTerminal(sceneManager.getScene());
    monitor_right = await modelLoader.loadMonitor(sceneManager.getScene());
    monitor_left = await modelLoader.loadMonitor(sceneManager.getScene());
    monitor_left.position.set(-10, -5, 5);
    monitor_left.rotateY(1.3);
    
    terminalInterface = new TerminalInterface();
    const interfacePlane = terminalInterface.createInterface(sceneManager.getScene());
    const monitor_rightInterface = createInterfaceMesh(sceneManager.getScene());
    monitor_rightInterface.position.set(10, 1, 5);
    monitor_rightInterface.rotateY(-0.65);

    const monitor_leftInterface = createInterfaceMesh(sceneManager.getScene());
    monitor_leftInterface.position.set(-10, 1, 5);
    monitor_leftInterface.rotateY(0.65);


    postProcessing = new PostProcessing(
      sceneManager.getRenderer(),
      sceneManager.getScene(),
      sceneManager.getCamera(),
      sceneManager.getSizes()
    );
    
    sceneManager.setResizeCallback((sizes) => {
      postProcessing.updateSize(sizes);
    });
    
    const textInput = terminalInterface.createTextInput();
    terminalInterface.updateInterfaceWithText('');
    
    setTimeout(() => textInput.focus(), 100);
    
    const light = sceneManager.getLight();
    const flickerTimeline = Animations.createLightFlicker(light, 150);
    
    // flickerTimeline.then(() => {
    //   Animations.createZoomAnimation(sceneManager.getCamera());
    // });
    
    const loop = () => {
      sceneManager.update();
      postProcessing.render();
      requestAnimationFrame(loop);
    };
    loop();
    
  } catch (error) {
    console.error('Error loading resources:', error);
  }
}

// Start the application
init();