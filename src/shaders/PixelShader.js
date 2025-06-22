import * as THREE from 'three';

export const PixelShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        pixelSize: { value: 2.5 },
        colorDepth: { value: 32.0 },
        posterizeLevels: { value: 8.0 },
        luminanceThreshold: { value: 0.5 },
        thresholdIntensity: { value: 0.7 }
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
        uniform float colorDepth;
        uniform float posterizeLevels;
        uniform float luminanceThreshold;
        uniform float thresholdIntensity;
        
        varying vec2 vUv;
        
        // Calculate brightness using standard coefficients
        float getBrightness(vec3 color) {
            return dot(color, vec3(0.299, 0.587, 0.114));
        }
        
        // Posterization function
        vec3 posterizeColor(vec3 color, float levels) {
            return floor(color * levels) / levels;
        }
        
        void main() {
            // Pixelation
            vec2 dxy = pixelSize / resolution;
            vec2 coord = dxy * floor(vUv / dxy);
            vec4 color = texture2D(tDiffuse, coord);
            
            // Apply posterization
            color.rgb = posterizeColor(color.rgb, posterizeLevels);
            
            // Calculate brightness
            float brightness = getBrightness(color.rgb);
            
            // Apply luminance threshold effect
            if (brightness < luminanceThreshold) {
                // Darken pixels below threshold
                color.rgb *= mix(1.0, 0.3, thresholdIntensity);
            } else {
                // Enhance pixels above threshold
                float enhancement = (brightness - luminanceThreshold) * thresholdIntensity;
                color.rgb = mix(color.rgb, vec3(1.0), enhancement * 0.3);
            }
            
            // Final color quantization for retro look
            color.rgb = floor(color.rgb * colorDepth) / colorDepth;
            
            gl_FragColor = vec4(color.rgb, color.a);
        }
    `
};