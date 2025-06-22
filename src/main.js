import { SceneManager } from './components/SceneManager.js';
import { ModelLoader } from './components/ModelLoader.js';
import { TerminalInterface} from './components/TerminalInterface.js';
import { AvatarInterface } from './components/AvatarInterface.js';
import { createAvatarMesh, createInterfaceMesh } from './components/ModelCreator.js';
import { PostProcessing } from './components/PostProcessing.js';
import { Animations } from './components/Animations.js';
import { loadCustomFont } from './utils/FontLoader.js';
import { OutputInterface } from './components/OutputInterface.js';
import { CommandProcessor } from './components/CommandProcessor.js';


let terminal;
let monitor_right;
let monitor_left;
let sceneManager;
let terminalInterface;
let avatarInterface;
let outputInterface;
let postProcessing;
let modelLoader;
let desk;
let commandProcessor;

const tutorialText = `Welcome to the Maini Terminal!
This terminal allows you to interact with an AI clone of myself.
You can type to me  and receive responses.
For example, try typing 'hello' or 'resume' to see what happens.
You can move the camera around using the left and right arrow keys.
`;


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
    
    avatarInterface = new AvatarInterface();
    await avatarInterface.createInterface(sceneManager.getScene());

    outputInterface = new OutputInterface();
    await outputInterface.createInterface(sceneManager.getScene());
    
    // Initialize command processor
    commandProcessor = new CommandProcessor();
    commandProcessor.setOutputInterface(outputInterface);
    
    // Connect terminal to command processor
    terminalInterface.onCommandSubmitted = (command) => {
      // Handle special commands
      if (command.toLowerCase() === 'clear') {
        commandProcessor.clearHistory();
        outputInterface.clearText();
        outputInterface.streamText('Conversation history cleared.');
        return;
      }
      if (command.toLowerCase() === 'resume') {
        // Resume print animation
        console.log('Resuming print animation...');
      }
      
      commandProcessor.processCommand(command);
    };

    


    postProcessing = new PostProcessing(
      sceneManager.getRenderer(),
      sceneManager.getScene(),
      sceneManager.getCamera(),
      sceneManager.getSizes()
    );
    
    sceneManager.setResizeCallback((sizes) => {
      postProcessing.updateSize(sizes);
    });
    
    // Connect mouse movement to avatar eye tracking
    sceneManager.setMouseMoveCallback((mouseX, mouseY) => {
      avatarInterface.updateMouse(mouseX, mouseY);
    });
    
    terminalInterface.updateInterfaceWithText("");

    const light = sceneManager.light;
    const light2 = sceneManager.light2;
    const flickerTimeline = Animations.createLightFlicker(light, light2, 300);
    const zoomIn = Animations.createStartupZoomAnimation(sceneManager.getCamera());
    
    // Start loading animation after flicker completes
    flickerTimeline.eventCallback("onComplete", () => {
      avatarInterface.startLoadingAnimation(2000).then(() => {
      terminalInterface.isTyping = true;
      terminalInterface.updateInterfaceWithText("");
      terminalInterface.setupKeyboardListeners();

      // Change camera to right position slowly after startup animation completes
      sceneManager.currentCameraIndex = 2; // Right camera
      sceneManager.updateCameraToCurrentState();

      outputInterface.streamText(tutorialText);
      });
    });

    let lastTime = performance.now();
    const targetFPS = 60;
    const targetFrameTime = 1000 / targetFPS;
    
    const loop = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      
      // Only update if enough time has passed (frame rate limiting)
      if (deltaTime >= targetFrameTime) {
        sceneManager.update(deltaTime);
        avatarInterface.update(deltaTime);
        postProcessing.render();
        lastTime = currentTime - (deltaTime % targetFrameTime);
      }
      
      requestAnimationFrame(loop);
    };
    loop(performance.now());
  } catch (error) {
    console.error('Error loading resources:', error);
  }
}

// Start the application
init();