import * as THREE from 'three';

export class DustParticles {
  constructor() {
    this.particleSystem = null;
    this.particleCount = 200;
    this.particles = null;
    this.particleGeometry = null;
    this.particleMaterial = null;
    this.velocities = new Float32Array(this.particleCount * 3);
    this.time = 0;
  }

  init(scene) {
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const opacities = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      positions[i3] = (Math.random() - 0.5) * 60;
      positions[i3 + 1] = Math.random() * 40 - 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 60;
      
      this.velocities[i3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i3 + 1] = Math.random() * 0.01 + 0.005;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
      
      opacities[i] = Math.random() * 0.9 + 0.5;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        pointTexture: { value: this.createDustTexture() }
      },
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
          vOpacity = opacity;
          vPosition = position;
          
          vec3 pos = position;
          pos.x += sin(time * 0.5 + position.y * 0.01) * 0.5;
          pos.z += cos(time * 0.3 + position.x * 0.01) * 0.3;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (300.0 / -mvPosition.z) * (0.8 + sin(time + position.x) * 0.3);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying float vOpacity;
        varying vec3 vPosition;
        
        void main() {
          vec4 textureColor = texture2D(pointTexture, gl_PointCoord);
          
          float fadeDistance = 50.0;
          float distanceFromCenter = length(vPosition.xz);
          float fadeFactor = 1.0 - smoothstep(30.0, fadeDistance, distanceFromCenter);
          
          float heightFade = 1.0 - smoothstep(15.0, 25.0, abs(vPosition.y));
          
          gl_FragColor = vec4(0.9, 0.85, 0.8, textureColor.a * vOpacity * fadeFactor * heightFade * 0.6);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    scene.add(this.particleSystem);
  }

  createDustTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  update(deltaTime) {
    if (!this.particleSystem) return;
    
    this.time += deltaTime * 0.001;
    this.particleMaterial.uniforms.time.value = this.time;
    
    const positions = this.particleGeometry.attributes.position.array;
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      positions[i3] += this.velocities[i3];
      positions[i3 + 1] += this.velocities[i3 + 1];
      positions[i3 + 2] += this.velocities[i3 + 2];
      
      if (positions[i3 + 1] > 25) {
        positions[i3] = (Math.random() - 0.5) * 60;
        positions[i3 + 1] = -15;
        positions[i3 + 2] = (Math.random() - 0.5) * 60;
      }
      
      if (Math.abs(positions[i3]) > 35) {
        positions[i3] = (Math.random() - 0.5) * 60;
      }
      if (Math.abs(positions[i3 + 2]) > 35) {
        positions[i3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    
    this.particleGeometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (this.particleSystem) {
      this.particleGeometry.dispose();
      this.particleMaterial.dispose();
      this.particleSystem = null;
    }
  }
}