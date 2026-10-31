import React, { useMemo } from 'react';
import { ALL_KEYS, KEY_BY_CODE } from '../lib/aula-constants';
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Keyboard Case Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-200 tracking-wider">{t('keyboardModel')}</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[11px] border border-slate-700">
            {t('keyboardSpecs')}
          </span>
          <span className="hidden sm:inline-block text-slate-500">•</span>
          <span className="hidden sm:inline-block text-slate-400">
            {mode === 'perkey' ? t('tabPerKey') : mode === 'backlight' ? `${t('tabBacklight')}: ${lightingConfig.mode === 0 ? 'Off' : `Mode ${lightingConfig.mode}`}` : t('tabRemap')}
          </span>
        </div>

        {/* Mini LCD Screen on keyboard */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400">{t('keyboardLcdLabel')}</span>
          <div className="relative w-36 h-12 bg-black rounded-lg border-2 border-slate-700 shadow-inner overflow-hidden flex flex-col items-center justify-center p-1 font-mono">
            {lcdPreviewUrl ? (
              <img src={lcdPreviewUrl} alt="LCD Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="text-cyan-400 font-bold text-xs tracking-wider animate-pulse">
                  {timeString}
                </div>
                <div className="text-[9px] text-slate-400 font-medium">
                  {dateString}
                </div>
              </div>
            )}
            <div className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
          </div>
        </div>
      </div>

      {/* Keyboard Matrix Container */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[920px] select-none p-3 rounded-xl bg-slate-950/80 border border-slate-800 shadow-2xl flex flex-col space-y-1.5">
          {rows.map((rowKeys, rowIndex) => (
            <div
              key={rowIndex}
              className="relative flex items-center h-10"
              style={{ minWidth: '900px', zIndex: 20 - rowIndex }}
            >
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
