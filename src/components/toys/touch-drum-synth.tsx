import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const PADS = [
  { 
    name: 'Kick', 
    color: 'bg-red-500', 
    textColor: 'text-red-100', 
    key: 'q', 
    synth: 'kick',
    xLabel: 'Pitch',
    yLabel: 'Decay'
  },
  { 
    name: 'Snare', 
    color: 'bg-blue-500', 
    textColor: 'text-blue-100', 
    key: 'w', 
    synth: 'snare',
    xLabel: 'Tone',
    yLabel: 'Noise'
  },
  { 
    name: 'HiHat', 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-100', 
    key: 'e', 
    synth: 'hihat',
    xLabel: 'Freq',
    yLabel: 'Decay'
  },
  { 
    name: 'Clap', 
    color: 'bg-green-500', 
    textColor: 'text-green-100', 
    key: 'r', 
    synth: 'clap',
    xLabel: 'Spread',
    yLabel: 'Tone'
  },
  { 
    name: 'Crash', 
    color: 'bg-purple-500', 
    textColor: 'text-purple-100', 
    key: 'a', 
    synth: 'crash',
    xLabel: 'Tone',
    yLabel: 'Decay'
  },
  { 
    name: 'Tom 1', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-100', 
    key: 's', 
    synth: 'tom1',
    xLabel: 'Pitch',
    yLabel: 'Tone'
  },
  { 
    name: 'Tom 2', 
    color: 'bg-pink-500', 
    textColor: 'text-pink-100', 
    key: 'd', 
    synth: 'tom2',
    xLabel: 'Pitch',
    yLabel: 'Tone'
  },
  { 
    name: 'Rim', 
    color: 'bg-teal-500', 
    textColor: 'text-teal-100', 
    key: 'f', 
    synth: 'rim',
    xLabel: 'Pitch',
    yLabel: 'Ring'
  },
  { 
    name: 'Cowbell', 
    color: 'bg-indigo-500', 
    textColor: 'text-indigo-100', 
    key: 'z', 
    synth: 'cowbell',
    xLabel: 'Tone',
    yLabel: 'Ring'
  },
  { 
    name: 'Shaker', 
    color: 'bg-lime-500', 
    textColor: 'text-lime-100', 
    key: 'x', 
    synth: 'shaker',
    xLabel: 'Rate',
    yLabel: 'Tone'
  },
  { 
    name: 'Tom 3', 
    color: 'bg-rose-500', 
    textColor: 'text-rose-100', 
    key: 'c', 
    synth: 'tom3',
    xLabel: 'Pitch',
    yLabel: 'Tone'
  },
  { 
    name: 'Perc', 
    color: 'bg-cyan-500', 
    textColor: 'text-cyan-100', 
    key: 'v', 
    synth: 'perc',
    xLabel: 'Pitch',
    yLabel: 'Decay'
  }
];

const TouchDrumSynth = () => {
  const [audioContext, setAudioContext] = useState(null);
  const [activePads, setActivePads] = useState(new Map()); // Map of touch IDs to { padIndex, velocity, x, y }
  const touchStartTimeRef = useRef(new Map());
  const velocityDecayRef = useRef(new Map());
  
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(ctx);
    return () => ctx.close();
  }, []);

  const calculateVelocity = (touch, touchStartTime) => {
    if (touch.force && touch.force > 0) {
      return Math.min(touch.force * 1.5, 1);
    }
    const touchDuration = Date.now() - touchStartTime;
    return Math.max(0.2, Math.min(1, 1 - (touchDuration / 500)));
  };

  const createKick = (time, velocity = 1, x = 0.5, y = 0.5) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // X controls pitch (50-200 Hz)
    const baseFreq = 50 + (x * 150);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.1, time + 0.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000 * velocity, time);
    filter.frequency.exponentialRampToValueAtTime(50, time + 0.1);

    // Y controls decay time (0.3-0.8s)
    const decayTime = 0.3 + (y * 0.5);
    
    gain.gain.setValueAtTime(velocity * 0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(time);
    osc.stop(time + decayTime);
  };

  const createSnare = (time, velocity = 1, x = 0.5, y = 0.5) => {
    const noise = audioContext.createBufferSource();
    const noiseFilter = audioContext.createBiquadFilter();
    const noiseEnvelope = audioContext.createGain();
    const osc = audioContext.createOscillator();
    const oscEnvelope = audioContext.createGain();

    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    noiseFilter.type = 'highpass';
    // X controls tone (mix of noise and oscillator)
    const oscMix = x;
    const noiseMix = 1 - x;
    
    // Y controls noise filter frequency (800-2000Hz)
    noiseFilter.frequency.value = 800 + (y * 1200);
    
    noiseEnvelope.gain.setValueAtTime(velocity * noiseMix, time);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, time);
    oscEnvelope.gain.setValueAtTime(velocity * oscMix * 0.7, time);
    oscEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(audioContext.destination);

    osc.connect(oscEnvelope);
    oscEnvelope.connect(audioContext.destination);

    noise.start(time);
    osc.start(time);
    noise.stop(time + 0.2);
    osc.stop(time + 0.2);
  };

  const createHiHat = (time, velocity = 1, x = 0.5, y = 0.5) => {
    const noise = audioContext.createBufferSource();
    const noiseFilter = audioContext.createBiquadFilter();
    const envelope = audioContext.createGain();

    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    noiseFilter.type = 'highpass';
    // X controls frequency (5000-12000Hz)
    noiseFilter.frequency.value = 5000 + (x * 7000);

    // Y controls decay (0.05-0.3s)
    const decayTime = 0.05 + (y * 0.25);
    
    envelope.gain.setValueAtTime(velocity * 0.8, time);
    envelope.gain.exponentialRampToValueAtTime(0.01, time + decayTime);

    noise.connect(noiseFilter);
    noiseFilter.connect(envelope);
    envelope.connect(audioContext.destination);

    noise.start(time);
    noise.stop(time + decayTime);
  };

  const createClap = (time, velocity = 1, x = 0.5, y = 0.5) => {
    // Create multiple noise bursts for a more realistic clap
    const burstCount = 4;
    const spacing = 0.01 * (1 - x); // X controls spread between bursts
    
    for (let i = 0; i < burstCount; i++) {
      const noise = audioContext.createBufferSource();
      const noiseFilter = audioContext.createBiquadFilter();
      const envelope = audioContext.createGain();

      const bufferSize = audioContext.sampleRate * 2;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      noise.buffer = buffer;
      noiseFilter.type = 'bandpass';
      // Y controls filter frequency (1000-3000Hz)
      noiseFilter.frequency.value = 1000 + (y * 2000);
      noiseFilter.Q.value = 2 + (velocity * 2);

      const burstTime = time + (i * spacing);
      envelope.gain.setValueAtTime(0, burstTime);
      envelope.gain.linearRampToValueAtTime(velocity * (i === 0 ? 1 : 0.7), burstTime + 0.005);
      envelope.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.1);

      noise.connect(noiseFilter);
      noiseFilter.connect(envelope);
      envelope.connect(audioContext.destination);

      noise.start(burstTime);
      noise.stop(burstTime + 0.1);
    }
  };

  const createCrash = (time, velocity = 1, x = 0.5, y = 0.5) => {
    const noise = audioContext.createBufferSource();
    const bandpass = audioContext.createBiquadFilter();
    const highpass = audioContext.createBiquadFilter();
    const envelope = audioContext.createGain();

    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    
    // X controls frequency content
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 6000 + (x * 4000);
    bandpass.Q.value = 1;

    highpass.type = 'highpass';
    highpass.frequency.value = 4000 + (x * 2000);

    // Y controls decay time (0.5-2s)
    const decayTime = 0.5 + (y * 1.5);
    
    envelope.gain.setValueAtTime(velocity * 0.8, time);
    envelope.gain.exponentialRampToValueAtTime(0.01, time + decayTime);

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(envelope);
    envelope.connect(audioContext.destination);

    noise.start(time);
    noise.stop(time + decayTime);
  };

  const createTom = (time, basePitch, velocity = 1, x = 0.5, y = 0.5) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // X controls pitch variation (±50%)
    const pitch = basePitch * (0.75 + (x * 0.5));
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, time + 0.2);

    // Y controls filter tone
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500 + (y * 2500), time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

    gain.gain.setValueAtTime(velocity * 0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.2);
  };

  const createRim = (time, velocity = 1, x = 0.5, y = 0.5) => {
    const osc = audioContext.createOscillator();
    const bandpass = audioContext.createBiquadFilter();
    const envelope = audioContext.createGain();

    // X controls pitch (1000-2000Hz)
    const freq = 1000 + (x * 1000);
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    bandpass.type = 'bandpass';
    bandpass.frequency.value = freq;
    
    // Y controls resonance/ring
    bandpass.Q.value = 5 + (y * 15);

    envelope.gain.setValueAtTime(velocity * 0.7, time);
    envelope.gain.exponentialRampToValueAtTime(0.01, time + (0.05 + y * 0.1));

    osc.connect(bandpass);
    bandpass.connect(envelope);
    envelope.connect(audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.2);
  };

  const createCowbell = (time, velocity = 1, x = 0.5, y = 0.5) => {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const bandpass = audioContext.createBiquadFilter();
    const envelope = audioContext.createGain();

    // X controls frequency ratio between oscillators
    const baseFreq = 800;
    osc1.type = 'square';
    osc1.frequency.value = baseFreq;
    osc2.type = 'square';
    osc2.frequency.value = baseFreq * (1 + x * 0.5);

    bandpass.type = 'bandpass';
    bandpass.frequency.value = baseFreq * 1.5;
    // Y controls resonance/ring time
    bandpass.Q.value = 2 + (y * 8);

    envelope.gain.setValueAtTime(velocity * 0.7, time);
    envelope.gain.exponentialRampToValueAtTime(0.01, time + (0.1 + y * 0.3));

    osc1.connect(bandpass);
    osc2.connect(bandpass);
    bandpass.connect(envelope);
    envelope.connect(audioContext.destination);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.5);
    osc2.stop(time + 0.5);
  };

  const createShaker = (time, velocity = 1, x = 0.5, y = 0.5) => {
    // Create multiple short noise bursts
    const burstCount = 2 + Math.floor(x * 4); // X controls number of shakes
    const spacing = 0.03;

    for (let i = 0; i < burstCount; i++) {
      const noise = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const envelope = audioContext.createGain();

      const bufferSize = audioContext.sampleRate * 0.1;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      noise.buffer = buffer;
      filter.type = 'bandpass';
      // Y controls filter frequency (3000-8000Hz)
      filter.frequency.value = 3000 + (y * 5000);
      filter.Q.value = 2;

      const burstTime = time + (i * spacing);
      envelope.gain.setValueAtTime(0, burstTime);
      envelope.gain.linearRampToValueAtTime(velocity * 0.3, burstTime + 0.005);
      envelope.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.05);

      noise.connect(filter);
      filter.connect(envelope);
      envelope.connect(audioContext.destination);

      noise.start(burstTime);
      noise.stop(burstTime + 0.05);
    }
  };

  const createPerc = (time, velocity = 1, x = 0.5, y = 0.5) => {
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const envelope = audioContext.createGain();

    // X controls pitch (200-800Hz)
    const freq = 200 + (x * 600);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.value = freq * 2;
    filter.Q.value = 3;

    // Y controls decay time (0.1-0.5s)
    const decayTime = 0.1 + (y * 0.4);
    
    envelope.gain.setValueAtTime(velocity * 0.7, time);
    envelope.gain.exponentialRampToValueAtTime(0.01, time + decayTime);

    osc.connect(filter);
    filter.connect(envelope);
    envelope.connect(audioContext.destination);

    osc.start(time);
    osc.stop(time + decayTime);
  };

  const playSound = (synth, velocity = 1, x = 0.5, y = 0.5) => {
    if (!audioContext) return;
    const time = audioContext.currentTime;
    
    switch (synth) {
      case 'kick':
        createKick(time, velocity, x, y);
        break;
      case 'snare':
        createSnare(time, velocity, x, y);
        break;
      case 'hihat':
        createHiHat(time, velocity, x, y);
        break;
      case 'clap':
        createClap(time, velocity, x, y);
        break;
      case 'crash':
        createCrash(time, velocity, x, y);
        break;
      case 'tom1':
        createTom(time, 200, velocity, x, y);
        break;
      case 'tom2':
        createTom(time, 150, velocity, x, y);
        break;
      case 'rim':
        createRim(time, velocity, x, y);
        break;
      case 'cowbell':
        createCowbell(time, velocity, x, y);
        break;
      case 'shaker':
        createShaker(time, velocity, x, y);
        break;
      case 'tom3':
        createTom(time, 100, velocity, x, y);
        break;
      case 'perc':
        createPerc(time, velocity, x, y);
        break;
    }
  };

  const startVelocityDecay = (id, initialVelocity) => {
    let velocity = initialVelocity;
    const decay = () => {
      velocity *= 0.9;
      if (velocity > 0.01 && activePads.has(id)) {
        velocityDecayRef.current.set(id, velocity);
        setActivePads(new Map(activePads));
        requestAnimationFrame(decay);
      } else {
        velocityDecayRef.current.delete(id);
      }
    };
    velocityDecayRef.current.set(id, initialVelocity);
    requestAnimationFrame(decay);
  };

  const getPositionInPad = (e, target) => {
    const rect = target.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    };
  };

  const handleTouchStart = (e, padIndex) => {
    e.preventDefault();
    const newActivePads = new Map(activePads);
    
    Array.from(e.touches).forEach(touch => {
      const touchRect = e.target.getBoundingClientRect();
      const position = {
        x: Math.max(0, Math.min(1, (touch.clientX - touchRect.left) / touchRect.width)),
        y: Math.max(0, Math.min(1, (touch.clientY - touchRect.top) / touchRect.height))
      };
      
      if (!activePads.has(touch.identifier)) {
        const timestamp = Date.now();
        touchStartTimeRef.current.set(touch.identifier, timestamp);
        
        const velocity = calculateVelocity(touch, timestamp);
        newActivePads.set(touch.identifier, { 
          padIndex, 
          velocity,
          x: position.x,
          y: position.y
        });
        playSound(PADS[padIndex].synth, velocity, position.x, position.y);
        startVelocityDecay(touch.identifier, velocity);
      }
    });
    
    setActivePads(newActivePads);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const newActivePads = new Map(activePads);
    
    Array.from(e.touches).forEach(touch => {
      if (activePads.has(touch.identifier)) {
        const padData = activePads.get(touch.identifier);
        const touchRect = e.target.getBoundingClientRect();
        const position = {
          x: Math.max(0, Math.min(1, (touch.clientX - touchRect.left) / touchRect.width)),
          y: Math.max(0, Math.min(1, (touch.clientY - touchRect.top) / touchRect.height))
        };
        
        newActivePads.set(touch.identifier, {
          ...padData,
          x: position.x,
          y: position.y
        });
        
        // Retrigger sound with new position but reduced velocity
        const retriggeredVelocity = velocityDecayRef.current.get(touch.identifier) * 0.7;
        if (retriggeredVelocity > 0.1) {
          playSound(PADS[padData.padIndex].synth, retriggeredVelocity, position.x, position.y);
        }
      }
    });
    
    setActivePads(newActivePads);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    const newActivePads = new Map(activePads);
    
    Array.from(e.changedTouches).forEach(touch => {
      newActivePads.delete(touch.identifier);
      touchStartTimeRef.current.delete(touch.identifier);
    });
    
    setActivePads(newActivePads);
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      const padIndex = PADS.findIndex(p => p.key === e.key.toLowerCase());
      if (padIndex >= 0 && !activePads.has(e.key)) {
        const velocity = 0.8;
        const newActivePads = new Map(activePads);
        newActivePads.set(e.key, { 
          padIndex, 
          velocity,
          x: 0.5, // Center position for keyboard input
          y: 0.5
        });
        setActivePads(newActivePads);
        playSound(PADS[padIndex].synth, velocity, 0.5, 0.5);
        startVelocityDecay(e.key, velocity);
      }
    };

    const handleKeyUp = (e) => {
      if (activePads.has(e.key)) {
        const newActivePads = new Map(activePads);
        newActivePads.delete(e.key);
        setActivePads(newActivePads);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activePads]);

  return (
    <Card className="w-full m-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Expressive Drum Pads</CardTitle>
        <div className="text-sm text-gray-500">
          Hit harder or tap faster for louder sounds. Slide your finger on each pad to explore sound variations. Supports multi-touch.
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 touch-none">
          {PADS.map((pad, index) => {
            const activeTouch = Array.from(activePads.entries())
              .find(([_, data]) => data.padIndex === index);
            const isActive = !!activeTouch;
            const touchData = isActive ? activeTouch[1] : null;
            const velocity = isActive ? 
              velocityDecayRef.current.get(activeTouch[0]) || touchData.velocity : 
              0;
            
            return (
              <div
                key={pad.key}
                className={`${pad.color} h-32 sm:h-40 rounded-lg flex flex-col items-center justify-center
                           relative overflow-hidden transition-transform
                           ${isActive ? 'scale-95' : ''}
                           cursor-pointer select-none touch-none`}
                style={{
                  opacity: isActive ? 0.5 + (velocity * 0.5) : 1
                }}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => {
                  if (!activePads.has('mouse')) {
                    const position = getPositionInPad(e, e.target);
                    const velocity = 0.8;
                    const newActivePads = new Map(activePads);
                    newActivePads.set('mouse', { 
                      padIndex: index, 
                      velocity,
                      ...position
                    });
                    setActivePads(newActivePads);
                    playSound(pad.synth, velocity, position.x, position.y);
                    startVelocityDecay('mouse', velocity);
                  }
                }}
                onMouseMove={(e) => {
                  if (activePads.has('mouse')) {
                    const position = getPositionInPad(e, e.target);
                    const padData = activePads.get('mouse');
                    const newActivePads = new Map(activePads);
                    newActivePads.set('mouse', {
                      ...padData,
                      ...position
                    });
                    setActivePads(newActivePads);
                    
                    const retriggeredVelocity = velocityDecayRef.current.get('mouse') * 0.7;
                    if (retriggeredVelocity > 0.1) {
                      playSound(pad.synth, retriggeredVelocity, position.x, position.y);
                    }
                  }
                }}
                onMouseUp={() => {
                  if (activePads.has('mouse')) {
                    const newActivePads = new Map(activePads);
                    newActivePads.delete('mouse');
                    setActivePads(newActivePads);
                  }
                }}
                onMouseLeave={() => {
                  if (activePads.has('mouse')) {
                    const newActivePads = new Map(activePads);
                    newActivePads.delete('mouse');
                    setActivePads(newActivePads);
                  }
                }}
              >
                {isActive && touchData && (
                  <div 
                    className="absolute w-4 h-4 rounded-full bg-white pointer-events-none"
                    style={{ 
                      left: `${touchData.x * 100}%`,
                      top: `${touchData.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      opacity: velocity * 0.5
                    }}
                  />
                )}
                
                <div className="relative z-10">
                  <span className={`${pad.textColor} font-bold text-lg sm:text-xl`}>
                    {pad.name}
                  </span>
                  <span className={`${pad.textColor} text-sm mt-1 opacity-80 block`}>
                    {pad.key}
                  </span>
                </div>

                <div className="absolute inset-2 pointer-events-none">
                  <div className={`${pad.textColor} text-xs opacity-50 absolute left-0 bottom-0`}>
                    {pad.xLabel} →
                  </div>
                  <div 
                    className={`${pad.textColor} text-xs opacity-50 absolute left-0 top-1/2 -rotate-90 origin-left`}
                  >
                    {pad.yLabel} →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TouchDrumSynth;