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

export function createAvatarMesh(scene) {
  const planeGeometry = new THREE.BoxGeometry(7, 6.5, 1.5);
  const planeMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000,
    side: THREE.DoubleSide
  });
  const interfacePlane = new THREE.Mesh(planeGeometry, planeMaterial);
  interfacePlane.position.set(0, 2, 1.3);
  scene.add(interfacePlane);
  return interfacePlane;
}