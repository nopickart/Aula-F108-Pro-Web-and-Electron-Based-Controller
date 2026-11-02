import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { ALL_KEYS, LIGHTING_MODES, getLightingModeDetails } from '../lib/aula-constants';
import { KeyDef, LightingConfig, LcdVisualState } from '../types/aula';
import { Language, getTranslation } from '../lib/i18n';
import { Sparkles } from 'lucide-react';

interface VirtualKeyboardProps {
  selectedKeys: Set<string>;
  onToggleKey: (code: string, isShift: boolean) => void;
  perKeyColors: { [code: string]: [number, number, number] };
  lightingConfig: LightingConfig;
  mode: 'perkey' | 'backlight' | 'remap';
  remaps?: { [key: string]: string };
  currentTime: Date;
  lcdPreviewUrl?: string | null;
  lcdVisualState?: LcdVisualState | null;
  lang?: Language;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  selectedKeys,
  onToggleKey,
  perKeyColors,
  lightingConfig,
  mode,
  remaps = {},
  currentTime,
  lcdPreviewUrl,
  lcdVisualState = null,
  lang = 'tr',
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);

  const activeModeInfo = LIGHTING_MODES.find((m) => m.id === lightingConfig.mode) || LIGHTING_MODES[1];
  const activeModeDetails = getLightingModeDetails(activeModeInfo, lang);

  // Check if current mode is an animated backlight mode (mode >= 2)
  const isAnimatedBacklight = mode === 'backlight' && lightingConfig.mode >= 2;

  // Interactive Rotary Knob Rotation
  const [knobRotation, setKnobRotation] = useState<number>(45);

  const handleKnobClick = () => {
    setKnobRotation((prev) => (prev + 30) % 360);
  };

  const handleKnobWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 15 : -15;
    setKnobRotation((prev) => (prev + delta + 360) % 360);
  };

  // Format digital clock for mini LCD
  const timeString = useMemo(() => {
    return currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }, [currentTime]);

  const dateString = useMemo(() => {
    return currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
  }, [currentTime]);

  // Real-time animation clock for animated backlight modes
  const [animTime, setAnimTime] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Individual key mouse & keyboard interaction tracker (for SingleOn, SingleOff, etc.)
  const keyInteractionsRef = useRef<Map<string, number>>(new Map());
  const hoveredKeyRef = useRef<string | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  // Trigger interaction timestamp for a specific key
  const triggerKeyInteraction = useCallback((keyCode: string) => {
    const nowSec = (performance.now() - startTimeRef.current) / 1000;
    keyInteractionsRef.current.set(keyCode, nowSec);
  }, []);

  // Center/origin for wave propagation in reactive modes
  const [interactiveWave, setInteractiveWave] = useState<{
    col: number;
    row: number;
    time: number;
  } | null>(null);

  useEffect(() => {
    if (!isAnimatedBacklight) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let lastTick = performance.now();
    const renderLoop = (now: number) => {
      // Throttle to ~35-40 fps for optimal performance and silky smooth visual output
      if (now - lastTick >= 25) {
        lastTick = now;
        setAnimTime((now - startTimeRef.current) / 1000);
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isAnimatedBacklight, lightingConfig.mode]);

  // Listen to window mouseup so mouse dragging across keys works smoothly
  useEffect(() => {
    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Listen to physical keyboard events so typing also illuminates/dims keys in real time
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const codeMap: { [c: string]: string } = {
        KeyA: 'a', KeyB: 'b', KeyC: 'c', KeyD: 'd', KeyE: 'e', KeyF: 'f',
        KeyG: 'g', KeyH: 'h', KeyI: 'i', KeyJ: 'j', KeyK: 'k', KeyL: 'l',
        KeyM: 'm', KeyN: 'n', KeyO: 'o', KeyP: 'p', KeyQ: 'q', KeyR: 'r',
        KeyS: 's', KeyT: 't', KeyU: 'u', KeyV: 'v', KeyW: 'w', KeyX: 'x',
        KeyY: 'y', KeyZ: 'z',
        Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
        Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',
        Escape: 'esc', Space: 'space', Enter: 'enter', Backspace: 'backspace',
        Tab: 'tab', CapsLock: 'capslock', ShiftLeft: 'lshift', ShiftRight: 'rshift',
        ControlLeft: 'lctrl', ControlRight: 'rctrl', AltLeft: 'lalt', AltRight: 'ralt',
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      };
      const mapped = codeMap[e.code];
      if (mapped) {
        triggerKeyInteraction(mapped);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerKeyInteraction]);

  // Handle key click with reactive animation trigger
  const handleKeyClick = (key: KeyDef, isShift: boolean) => {
    triggerKeyInteraction(key.code);
    if (mode === 'backlight') {
      const nowSec = (performance.now() - startTimeRef.current) / 1000;
      setInteractiveWave({
        col: key.col,
        row: key.row,
        time: nowSec,
      });
    } else {
      onToggleKey(key.code, isShift);
    }
  };

  // Compute key color dynamically based on active mode & animation frame
  const getKeyColor = useCallback(
    (key: KeyDef): string => {
      if (mode === 'perkey') {
        const rgb = perKeyColors[key.code];
        if (rgb) {
          return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        }
        return 'rgb(15, 23, 42)'; // dark/off
      }

      if (mode === 'remap') {
        if (remaps[key.code]) {
          return 'rgb(168, 85, 247)'; // purple for remapped
        }
        return 'rgb(30, 41, 59)';
      }

      // Backlight Mode (0-19)
      const lightMode = lightingConfig.mode;
      const bLevel = lightingConfig.brightness ?? 5;
      if (lightMode === 0 || bLevel === 0) {
        return 'rgb(15, 23, 42)'; // Completely off
      }

      const brightnessFactor = bLevel / 5;
      const speedVal = lightingConfig.speed ?? 3;
      const speedMult = 0.5 + speedVal * 0.45; // Range: 0.5x to 2.75x

      const baseR = lightingConfig.r;
      const baseG = lightingConfig.g;
      const baseB = lightingConfig.b;
      const isColorful = lightingConfig.colorful;
      const direction = lightingConfig.direction ?? 0;

      // Helper to blend intensity with brightness and color
      const blendColor = (intensity: number, overrideHue?: number): string => {
        const clamped = Math.max(0, Math.min(1, intensity));
        const minAmbient = 0.08 * brightnessFactor;
        const finalFactor = Math.max(minAmbient, clamped * brightnessFactor);

        if (overrideHue !== undefined || isColorful) {
          const hue = overrideHue !== undefined ? overrideHue : (key.col * 16 + key.row * 24) % 360;
          const lightness = Math.max(6, Math.round(62 * finalFactor));
          return `hsl(${Math.round((hue % 360 + 360) % 360)}, 100%, ${lightness}%)`;
        }

        const red = Math.round(baseR * finalFactor);
        const green = Math.round(baseG * finalFactor);
        const blue = Math.round(baseB * finalFactor);
        return `rgb(${red}, ${green}, ${blue})`;
      };

      // 1. Static Mode
      if (lightMode === 1) {
        if (isColorful) {
          const hue = (key.col * 15 + key.row * 25) % 360;
          return blendColor(1, hue);
        }
        return blendColor(1);
      }

      // Center coords for radial modes
      const CENTER_COL = 11;
      const CENTER_ROW = 2.5;
      const t = animTime;

      // 2. SingleOn (Tekli Yanma - Key lights up on mouse interaction then fades out)
      if (lightMode === 2) {
        let intensity = 0.04; // Baseline ambient when off

        // If mouse is currently hovering or pressed on this key
        if (hoveredKeyRef.current === key.code) {
          intensity = 1.0;
        }

        // Fade calculation from mouse click / touch
        const lastTouch = keyInteractionsRef.current.get(key.code);
        if (lastTouch !== undefined) {
          const dt = t - lastTouch;
          const fadeDuration = Math.max(0.4, 1.25 / speedMult);
          if (dt >= 0 && dt < fadeDuration) {
            const fade = Math.pow(1 - dt / fadeDuration, 1.4);
            intensity = Math.max(intensity, fade);
          }
        }

        // Ambient ripple if click occurred nearby
        if (interactiveWave) {
          const dtWave = t - interactiveWave.time;
          if (dtWave >= 0 && dtWave < 0.6) {
            const dist = Math.hypot(key.col - interactiveWave.col, (key.row - interactiveWave.row) * 1.5);
            if (dist < 1.0) {
              intensity = Math.max(intensity, (1 - dtWave / 0.6) * (1 - dist / 1.0));
            }
          }
        }

        return blendColor(intensity);
      }

      // 3. SingleOff (Tekli Sönme - Keys are normally on, turn off on mouse interaction then recover)
      if (lightMode === 3) {
        let intensity = 1.0; // Baseline: fully ON

        // If mouse is currently hovering or pressed on this key, turn off completely
        if (hoveredKeyRef.current === key.code) {
          intensity = 0.0;
        }

        // Recovery calculation from mouse touch
        const lastTouch = keyInteractionsRef.current.get(key.code);
        if (lastTouch !== undefined) {
          const dt = t - lastTouch;
          const recoverDuration = Math.max(0.4, 1.1 / speedMult);
          if (dt >= 0 && dt < recoverDuration) {
            const recovery = Math.pow(dt / recoverDuration, 1.4);
            intensity = Math.min(intensity, recovery);
          }
        }

        return blendColor(intensity);
      }

      // 4. Glittering (Yıldız Kayması)
      // Tek renk ise: Rastgele tuşların LED'i hiçbir yön (sağ-sol) takip etmeden tamamen rastgele sönüp açılır.
      // Rainbow (Renkli) ise: Rastgele tuşların rengi sürekli değişir.
      if (lightMode === 4) {
        // Scramble spatial index using pseudo-random hash to eliminate directional wave propagation
        const hash1 = Math.abs(Math.sin(key.lightIndex * 12.9898 + 78.233) * 43758.5453) % 100;
        const hash2 = Math.abs(Math.cos(key.lightIndex * 93.9898 + 31.233) * 23421.6312) % 100;

        // 1. TEK RENK SEÇİLİYSE: Yönsüz, tamamen rastgele zamanlı tuş sönüp-açılmaları
        if (!isColorful) {
          const keySpeed = speedMult * 0.145 * (1.5 + (hash2 % 1.5));
          const phase = t * keySpeed + hash1 * 6.283;
          const rawSin = Math.sin(phase);

          // Dip factor: peak when sin > 0.1
          let intensity = 1.0;
          if (rawSin > 0.1) {
            const dip = Math.pow((rawSin - 0.1) / 0.9, 1.8);
            intensity = 1.0 - 0.93 * dip; // Dips from 1.0 down to 0.07 (OFF) and recovers
          }
          return blendColor(intensity);
        }

        // 2. RAINBOW / RENKLİ SEÇİLİYSE: Yönsüz, rastgele tuşların sürekli renk değişimi
        const keySpeed = speedMult * 0.145 * (1.2 + (hash2 % 1.8));
        const keyHue = (t * keySpeed * 35 + hash1 * 36.0) % 360;
        const pulse = (Math.sin(t * keySpeed * 2.0 + hash2 * 3.14) + 1) / 2;
        const lightness = Math.round((28 + 36 * pulse) * brightnessFactor);

        return `hsl(${Math.round((keyHue % 360 + 360) % 360)}, 100%, ${lightness}%)`;
      }

      // 5. Falling (Matrix Yağmuru - LEDs cascade down row by row sequentially from top to bottom)
      if (lightMode === 5) {
        const colIdx = Math.round(key.col);
        // Stagger column drop start times across columns 0 to 22
        const colDelay = (colIdx * 1.618) % 6.0;
        const speed = speedMult * 3.6;
        const cycleLength = 8.5; // distance from top (-1.5) down to bottom (7.0)
        const dropY = ((t * speed + colDelay) % cycleLength) - 1.5;

        // Vertical distance from drop head to key row (0 to 5)
        const dy = dropY - key.row;

        let intensity = 0.04;
        let isHead = false;

        if (dy >= 0 && dy < 2.8) {
          if (dy < 0.55) {
            intensity = 1.0;
            isHead = true;
          } else {
            // Fading trail gliding down behind the head
            intensity = Math.pow(1 - (dy - 0.55) / 2.25, 1.3);
          }
        }

        // Rainbow / Colorful Mode
        if (isColorful) {
          const hue = (colIdx * 20) % 360;
          if (isHead) {
            return `hsl(${hue}, 100%, ${Math.round(75 * brightnessFactor)}%)`;
          }
          return `hsl(${hue}, 100%, ${Math.round((10 + 50 * intensity) * brightnessFactor)}%)`;
        }

        // Standard Matrix mode: Bright leading head & phosphor trailing LEDs sliding down row by row
        if (isHead) {
          const rHead = Math.min(255, Math.round((baseR * 0.4 + 180) * brightnessFactor));
          const gHead = Math.min(255, Math.round((baseG * 0.4 + 200) * brightnessFactor));
          const bHead = Math.min(255, Math.round((baseB * 0.4 + 180) * brightnessFactor));
          return `rgb(${rHead}, ${gHead}, ${bHead})`;
        }

        return blendColor(intensity);
      }

      // 6. Colourful (Renkli Ahenk - Dynamic Spectrum Wave)
      if (lightMode === 6) {
        const hue = (t * speedMult * 55 + key.col * 16 + key.row * 24) % 360;
        return blendColor(1, hue);
      }

      // 7. Breath (Nefes Alma - Smooth Sinusoidal Breathing, cycles to a new color each breath in colorful mode)
      if (lightMode === 7) {
        const breathFreq = speedMult * 1.8;
        const phase = t * breathFreq;
        const breatheSin = Math.sin(phase);
        const intensity = 0.04 + 0.96 * Math.pow((breatheSin + 1) / 2, 2.0);

        let hue: number | undefined = undefined;
        if (isColorful) {
          // Advance color at the trough (minimum darkness) of each breath cycle
          const cycle = Math.floor((phase + Math.PI / 2) / (2 * Math.PI));
          hue = (cycle * 55) % 360;
        }

        return blendColor(intensity, hue);
      }

      // 8. Spectrum (Spektrum Döngüsü - Synchronized Color Cycle)
      if (lightMode === 8) {
        const hue = (t * speedMult * 45) % 360;
        return blendColor(1, hue);
      }

      // 9. Outward (Dışa Yayılma - Radial Expansion from Center)
      if (lightMode === 9) {
        const dx = key.col - CENTER_COL;
        const dy = (key.row - CENTER_ROW) * 1.8;
        const dist = Math.hypot(dx, dy);
        const wave = Math.sin(dist * 0.85 - t * speedMult * 4.5);
        const intensity = Math.pow((wave + 1) / 2, 2.5);
        const hue = isColorful ? (dist * 25 + t * 35) % 360 : undefined;
        return blendColor(0.1 + 0.9 * intensity, hue);
      }

      // 10. Scrolling (Süzülen Dalga - Vertical Wave: Top to Bottom)
      if (lightMode === 10) {
        const rowPos = direction === 1 ? 5 - key.row : key.row;
        if (isColorful) {
          const hue = (rowPos * 50 - t * speedMult * 70) % 360;
          return blendColor(1, hue);
        }
        const wave = Math.sin(rowPos * 0.9 - t * speedMult * 4.2);
        const intensity = 0.12 + 0.88 * Math.pow((wave + 1) / 2, 2);
        return blendColor(intensity);
      }

      // 11. Rolling (Yatay Akış - Horizontal Wave: Left to Right)
      if (lightMode === 11) {
        const colPos = direction === 1 ? 23 - key.col : key.col;
        if (isColorful) {
          const hue = (colPos * 18 - t * speedMult * 70) % 360;
          return blendColor(1, hue);
        }
        const wave = Math.sin(colPos * 0.5 - t * speedMult * 4.2);
        const intensity = 0.12 + 0.88 * Math.pow((wave + 1) / 2, 2);
        return blendColor(intensity);
      }

      // 12. Rotating (Girdap - Circular Vortex)
      if (lightMode === 12) {
        const dx = key.col - CENTER_COL;
        const dy = (key.row - CENTER_ROW) * 2.0;
        const angle = Math.atan2(dy, dx);
        const dirSign = direction === 1 ? -1 : 1;
        const dist = Math.hypot(dx, dy);
        const vortex = Math.sin(angle * 2 + dist * 0.35 - dirSign * t * speedMult * 4.0);
        if (isColorful) {
          const hue = ((angle / Math.PI) * 180 + t * speedMult * 60 + dist * 12) % 360;
          return blendColor(0.2 + 0.8 * Math.pow((vortex + 1) / 2, 1.5), hue);
        }
        const intensity = 0.1 + 0.9 * Math.pow((vortex + 1) / 2, 2);
        return blendColor(intensity);
      }

      // 13. Explode (Patlama - Shockwave Bursts)
      if (lightMode === 13) {
        let originCol = CENTER_COL;
        let originRow = CENTER_ROW;
        let tOffset = t;
        if (interactiveWave) {
          const dt = t - interactiveWave.time;
          if (dt >= 0 && dt < 2.0) {
            originCol = interactiveWave.col;
            originRow = interactiveWave.row;
            tOffset = dt;
          }
        }
        const dx = key.col - originCol;
        const dy = (key.row - originRow) * 2.0;
        const dist = Math.hypot(dx, dy);
        const period = 2.4 / speedMult;
        const phase = tOffset % period;
        const radius = phase * (20 / period);
        const diff = Math.abs(dist - radius);
        const intensity = diff < 2.5 ? Math.max(0, 1 - diff / 2.5) * Math.max(0, 1 - phase / period) : 0.08;
        return blendColor(Math.max(0.08, intensity));
      }

      // 14. Launch (Fırlatma - Rocket Trails Upward)
      if (lightMode === 14) {
        const trailCol = (key.col * 3.3) % 4;
        const yPos = (t * speedMult * 5.0 + trailCol * 1.5) % 9;
        const distY = 5 - key.row - yPos;
        const intensity = distY <= 0 && distY > -3 ? Math.max(0, 1 + distY / 3) : 0.08;
        return blendColor(intensity);
      }

      // 15. Ripples (Su Halka Dalgaları - Harmonic Water Waves)
      if (lightMode === 15) {
        let originCol = CENTER_COL;
        let originRow = CENTER_ROW;
        let tElapsed = t;
        if (interactiveWave) {
          const dt = t - interactiveWave.time;
          if (dt >= 0 && dt < 2.5) {
            originCol = interactiveWave.col;
            originRow = interactiveWave.row;
            tElapsed = dt;
          }
        }
        const dx = key.col - originCol;
        const dy = (key.row - originRow) * 1.8;
        const dist = Math.hypot(dx, dy);
        const wave = Math.sin(dist * 1.2 - tElapsed * speedMult * 5.0);
        const intensity = 0.1 + 0.9 * Math.pow((wave + 1) / 2, 3);
        return blendColor(intensity);
      }

      // 16. Flowing (Akıcı Nehir - Serpentine River Flow)
      if (lightMode === 16) {
        const dir = direction === 1 ? -1 : 1;
        const rowEven = key.row % 2 === 0;
        const colIndex = rowEven ? key.col : 23 - key.col;
        const linearIdx = key.row * 24 + colIndex;
        if (isColorful) {
          const hue = (linearIdx * 8 - dir * t * speedMult * 70) % 360;
          return blendColor(1, hue);
        }
        const wave = Math.sin(linearIdx * 0.25 - dir * t * speedMult * 4.0);
        const intensity = 0.12 + 0.88 * Math.pow((wave + 1) / 2, 2);
        return blendColor(intensity);
      }

      // 17. Pulsating (Nabız - Heartbeat Pulse)
      if (lightMode === 17) {
        const cycle = (t * speedMult * 1.3) % 2.0;
        const beat1 = cycle < 0.3 ? Math.sin((cycle / 0.3) * Math.PI) : 0;
        const beat2 = cycle > 0.35 && cycle < 0.65 ? Math.sin(((cycle - 0.35) / 0.3) * Math.PI) * 0.7 : 0;
        const pulse = Math.max(beat1, beat2);
        const intensity = 0.1 + 0.9 * pulse;
        return blendColor(intensity);
      }

      // 18. Tilt (Çapraz Dalga - Diagonal Wave)
      if (lightMode === 18) {
        const diag = direction === 1 ? key.col - key.row * 2 : key.col + key.row * 2;
        if (isColorful) {
          const hue = (diag * 18 - t * speedMult * 60) % 360;
          return blendColor(1, hue);
        }
        const wave = Math.sin(diag * 0.45 - t * speedMult * 4.0);
        const intensity = 0.12 + 0.88 * Math.pow((wave + 1) / 2, 2);
        return blendColor(intensity);
      }

      // 19. Shuttle (Mekik - Cylon / Knight Rider Beam)
      if (lightMode === 19) {
        const beamCol = (Math.sin(t * speedMult * 2.2) * 0.5 + 0.5) * 22;
        const colDist = Math.abs(key.col - beamCol);
        const intensity = colDist < 3 ? Math.pow(Math.max(0, 1 - colDist / 3), 2) : 0.08;
        return blendColor(Math.max(0.08, intensity));
      }

      return blendColor(1);
    },
    [
      mode,
      perKeyColors,
      remaps,
      lightingConfig,
      animTime,
      interactiveWave,
    ]
  );

  // Group keys by row
  const rows = useMemo(() => {
    const r: KeyDef[][] = [[], [], [], [], [], []];
    ALL_KEYS.forEach((k) => {
      r[k.row].push(k);
    });
    r.forEach((rowList) => rowList.sort((a, b) => a.col - b.col));
    return r;
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
      {/* Keyboard Case Header */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-200 tracking-wider">{t('keyboardModel')}</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[11px] border border-slate-700">
            {t('keyboardSpecs')}
          </span>
          <span className="hidden sm:inline-block text-slate-500">•</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">
              {mode === 'perkey'
                ? t('tabPerKey')
                : mode === 'backlight'
                ? `${t('tabBacklight')}: ${activeModeDetails.name}`
                : t('tabRemap')}
            </span>

            {/* Live Animation Indicator Badge */}
            {isAnimatedBacklight && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 text-[10px] font-mono border border-cyan-700/60 flex items-center gap-1.5 shadow-sm shadow-cyan-500/20">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span>{t('liveAnimationBadge')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Mini LCD Status Info */}
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-mono text-xs border border-slate-700/80 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">{t('keyboardLcdLabel')}</span>
            <span className="text-cyan-300 font-bold">1.14" TFT (240×135) + Knob</span>
          </span>
        </div>
      </div>

      {/* Keyboard Matrix Container */}
      <div className="overflow-x-auto w-full flex justify-center pb-2 pt-4">
        <div className="w-[964px] select-none p-3 rounded-xl bg-slate-950/80 border border-slate-800 shadow-2xl flex flex-col space-y-1.5 shrink-0 relative">
          {rows.map((rowKeys, rowIndex) => (
            <div
              key={rowIndex}
              className="relative flex items-center h-10"
              style={{ minWidth: '940px', zIndex: 20 - rowIndex }}
            >
              {/* Row 0: 240x135 TFT LCD Screen (cols 19-21) and Rotary Knob (col 22) */}
              {rowIndex === 0 && (
                <>
                  {/* 240x135 TFT LCD Screen */}
                  <div
                    style={{
                      left: '779px',
                      width: '120px',
                      height: '68px',
                      top: '-28px',
                    }}
                    className="absolute rounded-lg bg-black border-2 border-slate-700/90 shadow-xl shadow-cyan-500/10 overflow-hidden flex flex-col items-center justify-center p-0.5 font-mono z-30 group ring-1 ring-slate-800"
                    title={`${t('keyboardLcdLabel')} (240×135 TFT)`}
                  >
                    {lcdVisualState && lcdVisualState.type === 'gif' && lcdVisualState.animationUrl ? (
                      <div
                        style={{
                          backgroundColor: lcdVisualState.letterboxBg || '#000000',
                          overflow: 'hidden',
                        }}
                        className="w-full h-full relative flex items-center justify-center rounded"
                      >
                        <img
                          src={lcdVisualState.animationUrl}
                          alt="LCD Animated GIF"
                          style={{
                            objectFit:
                              lcdVisualState.fitMode === 'stretch'
                                ? 'fill'
                                : lcdVisualState.fitMode === 'contain'
                                ? 'contain'
                                : 'cover',
                            filter: `brightness(${100 + (lcdVisualState.brightness || 0)}%) contrast(${100 + (lcdVisualState.contrast || 0)}%)`,
                            transform: `scale(${lcdVisualState.zoom || 1}) translate(${lcdVisualState.panX || 0}px, ${lcdVisualState.panY || 0}px)`,
                          }}
                          className="w-full h-full select-none pointer-events-none"
                        />
                      </div>
                    ) : lcdVisualState && lcdVisualState.type === 'image' && lcdVisualState.previewUrl ? (
                      <div
                        style={{
                          backgroundColor: lcdVisualState.letterboxBg || '#000000',
                          overflow: 'hidden',
                        }}
                        className="w-full h-full relative flex items-center justify-center rounded"
                      >
                        <img
                          src={lcdVisualState.previewUrl}
                          alt="LCD Image"
                          style={{
                            objectFit:
                              lcdVisualState.fitMode === 'stretch'
                                ? 'fill'
                                : lcdVisualState.fitMode === 'contain'
                                ? 'contain'
                                : 'cover',
                            filter: `brightness(${100 + (lcdVisualState.brightness || 0)}%) contrast(${100 + (lcdVisualState.contrast || 0)}%)`,
                            transform: `scale(${lcdVisualState.zoom || 1}) translate(${lcdVisualState.panX || 0}px, ${lcdVisualState.panY || 0}px)`,
                          }}
                          className="w-full h-full select-none pointer-events-none"
                        />
                      </div>
                    ) : lcdVisualState && lcdVisualState.type === 'color' && lcdVisualState.solidColor ? (
                      <div
                        style={{ backgroundColor: lcdVisualState.solidColor }}
                        className="w-full h-full rounded"
                      />
                    ) : lcdPreviewUrl ? (
                      <img src={lcdPreviewUrl} alt="LCD Preview" className="w-full h-full object-cover rounded" />
                    ) : (
                      <div className="text-center flex flex-col items-center justify-center h-full w-full bg-slate-950">
                        <div className="text-cyan-400 font-bold text-xs tracking-wider animate-pulse leading-none mb-1">
                          {timeString}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium leading-none">
                          {dateString}
                        </div>
                      </div>
                    )}
                    <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
                    <div className="absolute bottom-0.5 right-1 text-[7px] text-slate-500 font-sans opacity-60 font-semibold">
                      240×135
                    </div>
                  </div>

                  {/* Rotary Adjustment Knob */}
                  <div
                    style={{
                      left: '900px',
                      top: '-18px',
                    }}
                    onClick={handleKnobClick}
                    onWheel={handleKnobWheel}
                    className="absolute z-30 flex flex-col items-center justify-center cursor-pointer group"
                    title={lang === 'tr' ? 'Döndürmeli Ses / Mod Ayar Düğmesi (Tıklayın veya kaydırın)' : 'Rotary Volume / Mode Knob (Click or scroll)'}
                  >
                    {/* Metallic Outer Ring with Glow */}
                    <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-slate-600 via-slate-800 to-slate-950 p-1 border-2 border-slate-600 group-hover:border-cyan-400 shadow-lg shadow-black transition-all flex items-center justify-center">
                      {/* Rotatable Knob Body */}
                      <div
                        style={{ transform: `rotate(${knobRotation}deg)` }}
                        className="w-full h-full rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 border border-slate-600/80 shadow-inner flex items-center justify-center relative transition-transform duration-150 ease-out"
                      >
                        {/* Indicator Notch */}
                        <div className="absolute top-1 w-1 h-3 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400" />
                        {/* Center Metallic Dot */}
                        <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
                        </div>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono text-slate-400 mt-0.5 font-bold tracking-tighter opacity-80 group-hover:text-cyan-300">
                      KNOB
                    </span>
                  </div>
                </>
              )}
              {rowKeys.map((key) => {
                const isSelected = mode === 'perkey' && selectedKeys.has(key.code);
                const color = getKeyColor(key);
                const remapTarget = remaps[key.code];
                const widthMultiplier = key.width || 1;
                const baseWidth = 38; // px for 1u key
                const widthPx = Math.round(widthMultiplier * baseWidth);
                const leftPx = Math.round(key.col * (baseWidth + 3));
                const heightPx = (key.height || 1) === 2 ? 86 : 40;

                return (
                  <button
                    key={key.code}
                    type="button"
                    onMouseDown={() => {
                      isMouseDownRef.current = true;
                      triggerKeyInteraction(key.code);
                    }}
                    onMouseEnter={() => {
                      hoveredKeyRef.current = key.code;
                      triggerKeyInteraction(key.code);
                    }}
                    onMouseLeave={() => {
                      if (hoveredKeyRef.current === key.code) {
                        hoveredKeyRef.current = null;
                        triggerKeyInteraction(key.code);
                      }
                    }}
                    onClick={(e) => handleKeyClick(key, e.shiftKey)}
                    style={{
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                      height: `${heightPx}px`,
                    }}
                    className={`absolute top-0 rounded-md flex flex-col items-center justify-center cursor-pointer text-slate-200 border ${
                      isAnimatedBacklight ? 'transition-none' : 'transition-all'
                    } ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30 border-cyan-300 shadow-lg shadow-cyan-500/30'
                        : 'border-slate-700/60 hover:border-slate-500 z-10'
                    } ${remapTarget ? 'ring-1 ring-purple-500 border-purple-400' : ''}`}
                  >
                    {/* Key LED Backlight Glow */}
                    <div
                      className={`absolute inset-0 rounded-md opacity-45 blur-[3px] pointer-events-none ${
                        isAnimatedBacklight ? 'transition-none' : 'transition-colors'
                      }`}
                      style={{ backgroundColor: color }}
                    />

                    {/* Under-key glow bottom line */}
                    <div
                      className={`absolute bottom-1 inset-x-1.5 h-0.5 rounded-full opacity-90 ${
                        isAnimatedBacklight ? 'transition-none' : 'transition-colors'
                      }`}
                      style={{ backgroundColor: color }}
                    />

                    {/* Keycap Body */}
                    <div className="relative z-10 flex flex-col items-center justify-center leading-tight pointer-events-none px-1 h-full">
                      {key.subLabel && (
                        <span className="text-[9px] text-slate-400 font-semibold leading-none">
                          {key.subLabel}
                        </span>
                      )}
                      <span
                        className={`font-semibold tracking-tight ${
                          key.label.length > 3 ? 'text-[9px]' : 'text-xs'
                        }`}
                      >
                        {key.label}
                      </span>
                      {remapTarget && (
                        <span className="text-[8px] text-purple-300 font-mono font-bold truncate max-w-[34px]">
                          →{remapTarget}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Guide */}
      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 w-full max-w-[964px]">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-cyan-400 shadow-sm shadow-cyan-400"></span>
            <span>{t('legendSelected')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-500 shadow-sm shadow-purple-500"></span>
            <span>{t('legendRemapped')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-700"></span>
            <span>{t('legendTip')}</span>
          </div>
        </div>

        <div className="text-slate-500 font-mono text-[11px]">
          {selectedKeys.size > 0 ? `${selectedKeys.size} ${t('selectedKeyCount')}` : t('noKeySelected')}
        </div>
      </div>
    </div>
  );
};
