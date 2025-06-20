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

  static createZoomAnimation(terminal, interfacePlane) {
    return new Promise((resolve) => {
      const t1 = gsap.timeline({ 
        defaults: { duration: 6 },
        onComplete: resolve
      });
      
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
      }, "<")
      .to(interfacePlane.position, {
        y: 0,
      }, "<");
    });
  }
}