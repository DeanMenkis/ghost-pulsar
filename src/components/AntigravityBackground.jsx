import React, { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';

const AntigravityBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let width, height;
    let time = 0;
    
    // Initialize 3D noise
    const noise3D = createNoise3D();

    // Mouse state
    const mouse = { x: -1000, y: -1000, active: false };
    // Shockwaves array for click interactions
    let shockwaves = [];

    // Configuration
    const particleCount = 1000; // Increased count for larger world
    const baseScale = 0.0005; 
    const timeSpeed = 0.0001; 
    const speed = 0.3; 
    
    // Interaction settings
    const hoverRadius = 150; 
    const hoverForce = 0.5;  
    // Click settings
    const shockwaveSpeed = 5; // Slower ripple (was 8)
    const shockwaveMaxRadius = 800; // Larger radius (was 500)
    const shockwaveForce = 15.0; // Slightly more force to compensate for size

    // Color palettes (Blue, Green, Yellow, Red/Pink) - slightly desaturated/dimmer
    const colorGroups = [
      { h: 210, s: 70, l: 50 }, // Blue
      { h: 150, s: 60, l: 50 }, // Green
      { h: 45, s: 80, l: 50 },  // Yellow
      { h: 340, s: 70, l: 50 }  // Red/Pink
    ];

    let worldHeight = 0; // Total height of the scrollable area

    class Particle {
      constructor(isInitial = false) {
        this.reset(isInitial);
      }

      reset(isInitial = false) {
        if (isInitial) {
          // Initial particles (if any)
          this.x = Math.random() * width;
          this.y = Math.random() * worldHeight;
        } else {
          // Spawn from edges
          const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
          const buffer = 50;
          switch(edge) {
            case 0: // Top of world
              this.x = Math.random() * width;
              this.y = -buffer;
              break;
            case 1: // Right
              this.x = width + buffer;
              this.y = Math.random() * worldHeight;
              break;
            case 2: // Bottom of world
              this.x = Math.random() * width;
              this.y = worldHeight + buffer;
              break;
            case 3: // Left
              this.x = -buffer;
              this.y = Math.random() * worldHeight;
              break;
          }
        }
        
        this.vx = 0;
        this.vy = 0;
        this.group = Math.floor(Math.random() * colorGroups.length);
        
        // Slight variation in speed/size per particle
        this.speedMod = 0.8 + Math.random() * 0.4;
        this.size = 1.0 + Math.random() * 1.5;
        
        this.life = 0; // Track life for color shift
      }

      update() {
        this.life++; // Increment life
        
        // Calculate flow field angle using 3D noise (x, y, time)
        const groupOffset = this.group * 100; 
        
        const noiseValue = noise3D(
          this.x * baseScale, 
          this.y * baseScale, 
          time * timeSpeed + groupOffset
        );
        
        const angle = noiseValue * Math.PI * 2; 

        // Apply flow force
        this.vx += Math.cos(angle) * 0.05;
        this.vy += Math.sin(angle) * 0.05;

        // Limit speed
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = speed * this.speedMod;
        if (currentSpeed > maxSpeed) {
          this.vx = (this.vx / currentSpeed) * maxSpeed;
          this.vy = (this.vy / currentSpeed) * maxSpeed;
        }

        // Mouse interaction (Hover only)
        // Adjust mouse coordinates to world coordinates
        const scrollY = window.scrollY;
        const worldMouseY = mouse.y + scrollY;

        const dx = this.x - mouse.x;
        const dy = this.y - worldMouseY; // Use world Y
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < hoverRadius) {
          const force = (hoverRadius - dist) / hoverRadius;
          const angleToMouse = Math.atan2(dy, dx);
          
          // Push away gently
          this.vx += Math.cos(angleToMouse) * force * hoverForce;
          this.vy += Math.sin(angleToMouse) * force * hoverForce;
        }

        // Shockwave interaction
        shockwaves.forEach(wave => {
          const waveWorldY = wave.y + wave.scrollYAtClick; // Adjust wave to world position
          const dx = this.x - wave.x;
          const dy = this.y - waveWorldY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Apply force if particle is near the shockwave ring
          // The ring has a width of ~50px
          const distFromWave = Math.abs(dist - wave.radius);
          if (distFromWave < 50) {
            const force = (1 - distFromWave / 50) * wave.strength;
            const angleToWave = Math.atan2(dy, dx);
            
            this.vx += Math.cos(angleToWave) * force;
            this.vy += Math.sin(angleToWave) * force;
          }
        });

        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around world height
        const buffer = 50;
        if (this.x < -buffer) this.x = width + buffer;
        if (this.x > width + buffer) this.x = -buffer;
        if (this.y < -buffer) this.y = worldHeight + buffer;
        if (this.y > worldHeight + buffer) this.y = -buffer;
      }

      draw() {
        // Calculate screen position
        const scrollY = window.scrollY;
        const screenY = this.y - scrollY;

        // Only draw if visible
        if (screenY < -50 || screenY > height + 50) return;

        const { h, s, l } = colorGroups[this.group];
        // Shift hue based on life. 
        const hueShift = (this.life * 0.1) % 360; 
        const currentHue = (h + hueShift) % 360;
        
        // Lower opacity for less distraction
        ctx.fillStyle = `hsla(${currentHue}, ${s}%, ${l}%, 0.6)`;
        ctx.beginPath();
        ctx.arc(this.x, screenY, this.size, 0, Math.PI * 2); // Draw at screenY
        ctx.fill();
      }
    }

    const init = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      worldHeight = document.documentElement.scrollHeight; // Set world height
      
      particles = [];
      // Start with 0 particles
    };

    const animate = () => {
      // Clear screen
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
      ctx.fillRect(0, 0, width, height);

      // Update shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const wave = shockwaves[i];
        wave.radius += shockwaveSpeed;
        wave.strength *= 0.92; // Faster decay (was 0.95)
        
        // Draw shockwave (optional, for debugging or visual effect)
        // ctx.strokeStyle = `rgba(255, 255, 255, ${wave.strength * 0.05})`;
        // ctx.beginPath();
        // ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        // ctx.stroke();

        if (wave.radius > shockwaveMaxRadius || wave.strength < 0.1) {
          shockwaves.splice(i, 1);
        }
      }

      // Spawn new particles
      if (particles.length < particleCount) {
        for (let i = 0; i < 5; i++) { // Spawn faster to fill world
          if (particles.length < particleCount) {
            particles.push(new Particle(false));
          }
        }
      }

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      time++;
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseDown = (e) => {
      // Create a new shockwave on click
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        scrollYAtClick: window.scrollY, // Store scroll position at click
        radius: 0,
        strength: shockwaveForce
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    init();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full"
    />
  );
};

export default AntigravityBackground;
