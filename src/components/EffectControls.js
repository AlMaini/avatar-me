export class EffectControls {
  constructor() {
    this.bloomPass = null;
    this.pixelPass = null;
  }

  setEffectPasses(bloomPass, pixelPass) {
    this.bloomPass = bloomPass;
    this.pixelPass = pixelPass;
  }

  createEffectControls() {
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
    
    document.body.appendChild(controlPanel);
    this.attachEventListeners();
  }

  attachEventListeners() {
    document.getElementById('bloomToggle').addEventListener('change', (e) => {
      if (this.bloomPass) this.bloomPass.enabled = e.target.checked;
    });
    
    document.getElementById('bloomStrength').addEventListener('input', (e) => {
      if (this.bloomPass) this.bloomPass.strength = parseFloat(e.target.value);
    });
    
    document.getElementById('pixelToggle').addEventListener('change', (e) => {
      if (this.pixelPass) this.pixelPass.enabled = e.target.checked;
    });
    
    document.getElementById('pixelSize').addEventListener('input', (e) => {
      if (this.pixelPass) this.pixelPass.uniforms.pixelSize.value = parseFloat(e.target.value);
    });
  }
}