import { SceneManager } from './components/SceneManager.js';
import { ModelLoader } from './components/ModelLoader.js';
import { TerminalInterface} from './components/TerminalInterface.js';
import { AvatarInterface } from './components/AvatarInterface.js';
import { createAvatarMesh, createInterfaceMesh } from './components/ModelCreator.js';
import { PostProcessing } from './components/PostProcessing.js';
import { Animations } from './components/Animations.js';
import { loadCustomFont } from './utils/FontLoader.js';

let terminal;
let monitor_right;
let monitor_left
let sceneManager;
let terminalInterface;
let avatarInterface;
let postProcessing;
let modelLoader;
let desk;


async function init() {
  try {
    await loadCustomFont();
    
    const canvas = document.querySelector('.webgl');
    sceneManager = new SceneManager(canvas);
    
    modelLoader = new ModelLoader();

    desk = await modelLoader.loadDesk(sceneManager.getScene());

    terminal = await modelLoader.loadTerminal(sceneManager.getScene());
    monitor_right = await modelLoader.loadMonitor(sceneManager.getScene());
    monitor_left = await modelLoader.loadMonitor(sceneManager.getScene());
    monitor_left.position.set(-10.2, -5, 5);
    monitor_left.rotateY(1.3);
    
    terminalInterface = new TerminalInterface();
    const interfacePlane = await terminalInterface.createInterface(sceneManager.getScene());
    
    
    const monitor_rightInterface = createInterfaceMesh(sceneManager.getScene());
    monitor_rightInterface.position.set(10, 1, 5);
    monitor_rightInterface.rotateY(-0.65);

    avatarInterface = new AvatarInterface();
    await avatarInterface.createInterface(sceneManager.getScene());
    


    postProcessing = new PostProcessing(
      sceneManager.getRenderer(),
      sceneManager.getScene(),
      sceneManager.getCamera(),
      sceneManager.getSizes()
    );
    
    sceneManager.setResizeCallback((sizes) => {
      postProcessing.updateSize(sizes);
    });
    
    terminalInterface.setupKeyboardListeners();
    terminalInterface.updateInterfaceWithText('');
    
    const light = sceneManager.getLight();
    const flickerTimeline = Animations.createLightFlicker(light, 100);
    const zoomIn = Animations.createStartupZoomAnimation(sceneManager.getCamera());
    
    // Start loading animation after flicker completes
    flickerTimeline.eventCallback("onComplete", () => {
      avatarInterface.startLoadingAnimation(2000).then(() => {
      terminalInterface.isTyping = true;
      terminalInterface.updateInterfaceWithText("");
      });
    });

    const loop = () => {
      //sceneManager.update();
      avatarInterface.update();
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