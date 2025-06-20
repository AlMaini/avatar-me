import { SceneManager } from './components/SceneManager.js';
import { ModelLoader } from './components/ModelLoader.js';
import { TerminalInterface } from './components/TerminalInterface.js';
import { EffectControls } from './components/EffectControls.js';
import { PostProcessing } from './components/PostProcessing.js';
import { Animations } from './components/Animations.js';
import { loadCustomFont } from './utils/FontLoader.js';

let terminal;
let sceneManager;
let terminalInterface;
let effectControls;
let postProcessing;
let modelLoader;



async function init() {
  try {
    await loadCustomFont();
    
    const canvas = document.querySelector('.webgl');
    sceneManager = new SceneManager(canvas);
    
    modelLoader = new ModelLoader();
    terminal = await modelLoader.loadTerminal(sceneManager.getScene());
    
    terminalInterface = new TerminalInterface();
    const interfacePlane = terminalInterface.createInterface(sceneManager.getScene());
    
    postProcessing = new PostProcessing(
      sceneManager.getRenderer(),
      sceneManager.getScene(),
      sceneManager.getCamera(),
      sceneManager.getSizes()
    );
    
    sceneManager.setResizeCallback((sizes) => {
      postProcessing.updateSize(sizes);
    });
    
    effectControls = new EffectControls();
    effectControls.setEffectPasses(
      postProcessing.getBloomPass(),
      postProcessing.getPixelPass()
    );
    
    const textInput = terminalInterface.createTextInput();
    effectControls.createEffectControls();
    terminalInterface.updateInterfaceWithText('');
    
    setTimeout(() => textInput.focus(), 100);
    
    const light = sceneManager.getLight();
    const flickerTimeline = Animations.createLightFlicker(light, 150);
    
    flickerTimeline.then(() => {
      Animations.createZoomAnimation(terminal, interfacePlane);
    });
    
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