import * as THREE from 'three';

export function createInterfaceMesh(scene) {
    const planeGeometry = new THREE.BoxGeometry(10, 8, 2);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      side: THREE.DoubleSide
    });
    const interfacePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(interfacePlane);
    return interfacePlane;
}