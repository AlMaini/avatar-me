import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Post-processing imports
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Pixelation shader
const PixelShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2() },
    pixelSize: { value: 4.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelSize;
    varying vec2 vUv;
    
    void main() {
      vec2 dxy = pixelSize / resolution;
      vec2 coord = dxy * floor(vUv / dxy);
      gl_FragColor = texture2D(tDiffuse, coord);
    }
  `
};

const scene = new THREE.Scene();
let terminal; // Declare terminal in wider scope
let interfacePlane; // Declare interface plane in wider scope
let composer; // Post-processing composer
let bloomPass, pixelPass; // Effect passes

// Create a promise-based loader function
const loadTerminalModel = () => {
  return new Promise((resolve, reject) => {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      './fixed_terminal_2/fixed_terminal.gltf',
      (gltf) => {
        terminal = gltf.scene;
        terminal.scale.set(0.4, 0.4, 0.4); // Scale the terminal model
        terminal.position.set(0, -5, 0);
        terminal.rotateY(-1.6);
        scene.add(terminal);
        resolve(terminal);
      },
      undefined,
      reject
    );
  });
};

// Text functionality
let currentText = '';

function updateInterfaceWithText(text) {
  // Create text using canvas texture approach
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 384;

  // Draw black background
  context.fillStyle = '#000000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  context.fillStyle = '#00ff88'; // Terminal green color
  context.font = 'bold 32px CustomTerminal, monospace'; // Use your custom font with fallback
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Add terminal-style prompt
  const displayText = `> ${text}`;
  context.fillText(displayText, canvas.width/2, canvas.height/2);
  
  // Add cursor blinking effect
  context.fillRect(canvas.width/2 + context.measureText(displayText).width/2 + 5, 
                  canvas.height/2 - 16, 3, 32);

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // Update interface plane material with the text texture
  interfacePlane.material = new THREE.MeshBasicMaterial({ 
    map: texture,
    side: THREE.DoubleSide
  });
}

// Create text input element
function createTextInput() {
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.placeholder = 'Type your command...';
  textInput.maxLength = 30;
  textInput.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 20px;
    padding: 10px;
    font-size: 16px;
    font-family: monospace;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #00ff88;
    color: #00ff88;
    border-radius: 5px;
    width: 300px;
    z-index: 100;
    outline: none;
  `;
  
  textInput.addEventListener('input', (event) => {
    currentText = event.target.value;
    updateInterfaceWithText(currentText);
  });
  
  document.body.appendChild(textInput);
  return textInput;
}

// Create effect control buttons
function createEffectControls() {
  const controlPanel = document.createElement('div');
  controlPanel.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #00ff88;
    border-radius: 5px;
    padding: 15px;
    z-index: 100;
    font-family: monospace;
    color: #00ff88;
  `;
  
  controlPanel.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: bold;">Post-Processing Controls</div>
    <label style="display: block; margin-bottom: 8px;">
      <input type="checkbox" id="bloomToggle" checked style="margin-right: 8px;">
      Bloom Effect
    </label>
    <label style="display: block; margin-bottom: 8px;">
      <input type="range" id="bloomStrength" min="0" max="3" step="0.1" value="1.5" style="width: 100px; margin-right: 8px;">
      Bloom Strength
    </label>
    <label style="display: block; margin-bottom: 8px;">
      <input type="checkbox" id="pixelToggle" style="margin-right: 8px;">
      Pixel Effect
    </label>
    <label style="display: block; margin-bottom: 8px;">
      <input type="range" id="pixelSize" min="1" max="20" step="1" value="4" style="width: 100px; margin-right: 8px;">
      Pixel Size
    </label>
  `;
  
  // Add event listeners
  document.body.appendChild(controlPanel);
  
  document.getElementById('bloomToggle').addEventListener('change', (e) => {
    bloomPass.enabled = e.target.checked;
  });
  
  document.getElementById('bloomStrength').addEventListener('input', (e) => {
    bloomPass.strength = parseFloat(e.target.value);
  });
  
  document.getElementById('pixelToggle').addEventListener('change', (e) => {
    pixelPass.enabled = e.target.checked;
  });
  
  document.getElementById('pixelSize').addEventListener('input', (e) => {
    pixelPass.uniforms.pixelSize.value = parseFloat(e.target.value);
  });
}

// Sizes
const sizes = {
  width: window.innerWidth || 800,
  height: window.innerHeight || 600
};

// Light
const light = new THREE.PointLight("#98FFE7", 0, 100, 1.7); // Cyan light with intensity 1.5 and distance 100
light.position.set(0, 10, 3); // Position the light
light.castShadow = true; // Enable shadows
scene.add(light);

// Interface Plane
const planeGeometry = new THREE.BoxGeometry(7, 6, 2); // Width and height of the plane
const planeMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000, // Black color
    side: THREE.DoubleSide // Visible from both sides
});
interfacePlane = new THREE.Mesh(planeGeometry, planeMaterial);
interfacePlane.position.set(0, 2, 1); // Adjust position as needed
scene.add(interfacePlane);

// const boxHelper = new THREE.BoxHelper(interfacePlane, 0xffff00);
// scene.add(boxHelper);

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height);
camera.position.z = 20; // Move the camera back to see the sphere
scene.add(camera);

// Renderer
const canvas = document.querySelector('.webgl');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setSize(sizes.width, sizes.height);
renderer.toneMapping = THREE.ReinhardToneMapping;

// Setup post-processing
function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  
  // Render pass - renders the scene
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  // Bloom pass - adds glow effect
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(sizes.width, sizes.height),
    1.5, // strength
    0.4, // radius  
    0.85 // threshold
  );
  composer.addPass(bloomPass);
  
  // Pixel pass - adds pixelation effect
  pixelPass = new ShaderPass(PixelShader);
  pixelPass.uniforms.resolution.value.set(sizes.width, sizes.height);
  pixelPass.enabled = false; // Start disabled
  composer.addPass(pixelPass);
}

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; // Enable damping (inertia)
controls.dampingFactor = 0.25; // Damping factor
scene.add(controls);

// Resize handler
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth || 800;
  sizes.height = window.innerHeight || 600;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  
  // Update post-processing
  if (composer) {
    composer.setSize(sizes.width, sizes.height);
    bloomPass.setSize(sizes.width, sizes.height);
    pixelPass.uniforms.resolution.value.set(sizes.width, sizes.height);
  }
});

const loadCustomFont = async () => {
  const fontFace = new FontFace('CustomTerminal', 'url(./fonts/Glass_TTY_VT220.ttf)');
  await fontFace.load();
  document.fonts.add(fontFace);
  return fontFace;
};

// Modify your init function:
async function init() {
  try {
    // Load font first
    await loadCustomFont();
    
    await loadTerminalModel();

    // Setup post-processing
    setupPostProcessing();

    // Initialize text input and interface
    const textInput = createTextInput();
    createEffectControls();
    updateInterfaceWithText(''); // Initialize with empty text
    
    // Focus on text input after a short delay
    setTimeout(() => textInput.focus(), 100);

    // Light flicker animation
    const baseIntensity = 150;
    const flickerTimeline = gsap.timeline();
    
    flickerTimeline
      // Initial flicker sequence
      .to(light, {
        duration: 1,
        intensity: 0,
        ease: "back.out",
      })
      .to(light, {
        duration: 0.1,
        intensity: baseIntensity + 300,
        ease: "power3.inOut",
        yoyo: true,
        repeat: 2
      })
      .to(light, {
        duration: 0.15,
        intensity: baseIntensity - 100,
        ease: "power4.in",
        yoyo: true,
        repeat: 1
      })
      .to(light, {
        duration: 0.05,
        intensity: baseIntensity + 200,
        ease: "none",
        yoyo: true
      })
      // Complete blackout
      .to(light, {
        duration: 0.2,
        intensity: 0,
        ease: "power4.in"
      })
      // Hold the blackout
      .to(light, {
        duration: 1,
        intensity: 0,
        ease: "none"
      })
      // Slowly fade back to base intensity
      .to(light, {
        duration: 1,
        intensity: baseIntensity,
        ease: "power2.out"
      });

    // zoom in animation
    flickerTimeline.then(() => {
      const t1 = gsap.timeline({ defaults: { duration: 1.5 } });
      t1.to(terminal.scale, {
        x: 0.8,
        y: 0.8,
        z: 0.8,
      })
      .to(terminal.position, {
        y: -14,
      }, "<")
      .to(interfacePlane.scale, {
        x: 2,
        y: 2,
        z: 2,
      }, "<") // Scale the interface plane
      .to(interfacePlane.position, {
        y: 0,
      }, "<"); // The "<" tells GSAP to start this animation at the same time as the previous one
    });

    // Regular render loop
    const loop = () => {
      controls.update(); // Update controls for damping
      
      // Use composer for post-processing instead of direct renderer
      composer.render();
      
      requestAnimationFrame(loop);
    }
    loop();

  } catch (error) {
    console.error('Error loading resources:', error);
  }
}

// Start the application
init();