import gsap from 'gsap';

export class Animations {
  static createLightFlicker(light, baseIntensity = 150) {
    const flickerTimeline = gsap.timeline();
    
    flickerTimeline
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
      .to(light, {
        duration: 0.2,
        intensity: 0,
        ease: "power4.in"
      })
      .to(light, {
        duration: 1,
        intensity: 0,
        ease: "none"
      })
      .to(light, {
        duration: 1,
        intensity: baseIntensity,
        ease: "power2.out"
      });

    return flickerTimeline;
  }

  static createZoomAnimation(camera) {
    return new Promise((resolve) => {
      const t1 = gsap.timeline({ 
        defaults: { duration: 5 },
        onComplete: resolve
      });
      
      t1.to(camera.position, {
        z: 12,
        y: 2,
        ease: "power2.inOut",
        onUpdate: () => {
          camera.updateProjectionMatrix();
        }
      })
    });
  }
}