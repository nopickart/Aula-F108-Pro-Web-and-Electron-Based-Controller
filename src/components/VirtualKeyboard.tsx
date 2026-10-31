import React, { useMemo, useState } from 'react';
import { ALL_KEYS, KEY_BY_CODE, LIGHTING_MODES, getLightingModeDetails } from '../lib/aula-constants';
import { KeyDef, LightingConfig } from '../types/aula';
import { Language, getTranslation } from '../lib/i18n';

interface VirtualKeyboardProps {
  selectedKeys: Set<string>;
  onToggleKey: (code: string, isShift: boolean) => void;
  perKeyColors: { [code: string]: [number, number, number] };
  lightingConfig: LightingConfig;
  mode: 'perkey' | 'backlight' | 'remap';
  remaps?: { [key: string]: string };
  currentTime: Date;
  lcdPreviewUrl?: string | null;
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
  lang = 'tr',
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);
  
  const activeModeInfo = LIGHTING_MODES.find((m) => m.id === lightingConfig.mode) || LIGHTING_MODES[1];
  const activeModeDetails = getLightingModeDetails(activeModeInfo, lang);

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

  // Determine key color based on active mode
  const getKeyColor = (key: KeyDef): string => {
    if (mode === 'perkey') {
      const rgb = perKeyColors[key.code];
      if (rgb) {
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      }
      return 'rgb(15, 23, 42)'; // dark/off
    }

    if (mode === 'backlight') {
      if (lightingConfig.mode === 0) return 'rgb(15, 23, 42)'; // off
      if (lightingConfig.colorful) {
        // Pseudo rainbow based on column and key position
        const hue = ((key.col * 15 + key.row * 25) % 360);
        return `hsl(${hue}, 90%, 55%)`;
      }
      return `rgb(${lightingConfig.r}, ${lightingConfig.g}, ${lightingConfig.b})`;
    }

    if (mode === 'remap') {
      if (remaps[key.code]) {
        return 'rgb(168, 85, 247)'; // purple for remapped
      }
      return 'rgb(30, 41, 59)';
    }

    return 'rgb(30, 41, 59)';
  };

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
          <span className="hidden sm:inline-block text-slate-400">
            {mode === 'perkey' ? t('tabPerKey') : mode === 'backlight' ? `${t('tabBacklight')}: ${activeModeDetails.name}` : t('tabRemap')}
          </span>
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
                    {lcdPreviewUrl ? (
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
                const isSelected = selectedKeys.has(key.code);
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
                    onClick={(e) => onToggleKey(key.code, e.shiftKey)}
                    style={{
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                      height: `${heightPx}px`,
                    }}
                    className={`absolute top-0 rounded-md flex flex-col items-center justify-center transition-all cursor-pointer text-slate-200 border ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30 border-cyan-300 shadow-lg shadow-cyan-500/30'
                        : 'border-slate-700/60 hover:border-slate-500 z-10'
                    } ${remapTarget ? 'ring-1 ring-purple-500 border-purple-400' : ''}`}
                  >
                    {/* Key LED Backlight Glow */}
                    <div
                      className="absolute inset-0 rounded-md opacity-35 blur-[3px] transition-colors pointer-events-none"
                      style={{ backgroundColor: color }}
                    />

                    {/* Under-key glow bottom line */}
                    <div
                      className="absolute bottom-1 inset-x-1.5 h-0.5 rounded-full transition-colors opacity-90"
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
      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
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
