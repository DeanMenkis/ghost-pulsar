import React, { useEffect } from 'react';
import AntigravityBackground from './components/AntigravityBackground';
import Lenis from 'lenis'

function App() {
  useEffect(() => {
    const lenis = new Lenis()

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)
  }, [])

  return (
    <div className="relative w-full min-h-[300vh] text-white">
      <AntigravityBackground />
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {/* Text removed as requested */}
        </div>
      </div>
    </div>
  );
}

export default App;
