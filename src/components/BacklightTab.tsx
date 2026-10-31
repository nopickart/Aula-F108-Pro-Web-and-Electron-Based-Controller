import React from 'react';
import { LIGHTING_MODES, getLightingModeDetails } from '../lib/aula-constants';
import { LightingConfig, LightingModeId } from '../types/aula';
import { Play, Copy, Check, Sparkles, Sliders, Sun, Gauge, MoveHorizontal, Info } from 'lucide-react';

import { Language, getTranslation } from '../lib/i18n';

interface BacklightTabProps {
  config: LightingConfig;
  onChange: (cfg: LightingConfig) => void;
  onApply: () => void;
  cliCommand: string;
  isBusy?: boolean;
  lang?: Language;
}

const PRESET_COLORS = [
  { key: 'colorRed', hex: '#EF4444', r: 255, g: 0, b: 0 },
  { key: 'colorCyan', hex: '#06B6D4', r: 0, g: 255, b: 255 },
  { key: 'colorGreen', hex: '#10B981', r: 0, g: 255, b: 0 },
  { key: 'colorBlue', hex: '#3B82F6', r: 0, g: 0, b: 255 },
  { key: 'colorPurple', hex: '#A855F7', r: 168, g: 85, b: 247 },
  { key: 'colorOrange', hex: '#F97316', r: 249, g: 115, b: 22 },
  { key: 'colorYellow', hex: '#EAB308', r: 234, g: 179, b: 8 },
  { key: 'colorWhite', hex: '#FFFFFF', r: 255, g: 255, b: 255 },
];

export const BacklightTab: React.FC<BacklightTabProps> = ({
  config,
  onChange,
  onApply,
  cliCommand,
  isBusy = false,
  lang = 'tr',
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);
  const [copied, setCopied] = React.useState(false);

  const activeModeInfo = LIGHTING_MODES.find((m) => m.id === config.mode) || LIGHTING_MODES[1];
  const activeModeDetails = getLightingModeDetails(activeModeInfo, lang);

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setMode = (id: LightingModeId) => {
    const modeInfo = LIGHTING_MODES.find((m) => m.id === id);
    onChange({
      ...config,
      mode: id,
      colorful: modeInfo?.isRainbow || config.colorful,
    });
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        onChange({ ...config, r, g, b, colorful: false });
      }
    }
  };

  const currentHex = `#${((1 << 24) + (config.r << 16) + (config.g << 8) + config.b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;

  return (
    <div className="space-y-6">
      {/* 20 Modes Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-base text-slate-100">
              {t('lightingEffects')}
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {t('selectedMode')}: <strong className="text-cyan-300">{activeModeDetails.name}</strong> (Mode {config.mode})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {LIGHTING_MODES.map((mode) => {
            const isSelected = config.mode === mode.id;
            const details = getLightingModeDetails(mode, lang);
            return (
              <button
                key={mode.id}
                onClick={() => setMode(mode.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {details.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">#{mode.id}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                  {details.description}
                </p>
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lighting Parameters & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colors & Rainbow */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> {t('colorSettings')}
            </h3>
            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.colorful}
                onChange={(e) => onChange({ ...config, colorful: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400/40 bg-slate-800 cursor-pointer"
              />
              <span className="font-medium">{t('colorfulRainbow')}</span>
            </label>
          </div>

          {config.colorful ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200">
              {t('rainbowActiveDesc')}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preset swatches */}
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((color) => {
                  const isColorSelected =
                    config.r === color.r && config.g === color.g && config.b === color.b;
                  return (
                    <button
                      key={color.key}
                      onClick={() =>
                        onChange({
                          ...config,
                          r: color.r,
                          g: color.g,
                          b: color.b,
                          colorful: false,
                        })
                      }
                      className={`flex items-center space-x-2 px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isColorSelected
                          ? 'border-cyan-400 bg-slate-800 ring-2 ring-cyan-400/30 font-semibold'
                          : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
                      }`}
                    >
                      <svg
                        className="w-4 h-4 rounded-full shrink-0 shadow-sm overflow-visible"
                        viewBox="0 0 16 16"
                      >
                        <circle
                          cx="8"
                          cy="8"
                          r="7"
                          fill={color.hex}
                          stroke={color.r > 200 && color.g > 200 && color.b > 200 ? '#cbd5e1' : '#334155'}
                          strokeWidth="1.5"
                        />
                      </svg>
                      <span className="text-slate-300 text-[11px] truncate">{t(color.key as any)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Picker */}
              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="color"
                  value={currentHex}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    onChange({ ...config, r, g, b, colorful: false });
                  }}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-slate-800 border border-slate-700 p-0.5"
                />
                <div className="flex-1">
                  <label className="text-[11px] text-slate-400 block mb-1">HEX Code</label>
                  <input
                    type="text"
                    value={currentHex}
                    onChange={handleHexChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sliders: Brightness, Speed, Direction */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sun className="w-4 h-4 text-cyan-400" /> {t('dynamicsAndLevels')}
          </h3>

          {/* Brightness */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> {t('brightness')} (0-5)
              </span>
              <span className="font-mono text-cyan-300 font-bold">{config.brightness} / 5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={config.brightness}
              onChange={(e) => onChange({ ...config, brightness: Number(e.target.value) })}
              className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-400" /> {t('speed')} (0-5)
              </span>
              <span className="font-mono text-cyan-300 font-bold">{config.speed} / 5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={config.speed}
              onChange={(e) => onChange({ ...config, speed: Number(e.target.value) })}
              className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Direction */}
          <div className="pt-1">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <MoveHorizontal className="w-3.5 h-3.5 text-purple-400" /> {t('waveDirection')}
              </span>
              <span className="text-slate-400 text-[11px]">
                {config.direction === 0 ? t('directionNormal') : t('directionReverse')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...config, direction: 0 })}
                className={`py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  config.direction === 0
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('directionNormal')}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...config, direction: 1 })}
                className={`py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  config.direction === 1
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('directionReverse')}
              </button>
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-full">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">{t('applyToKeyboard')}</h3>
            <p className="text-xs text-slate-400 mb-5 max-w-sm mx-auto">
              {t('lightingStepDesc')}
            </p>

            <button
              onClick={onApply}
              disabled={isBusy}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Play className={`w-4 h-4 fill-current ${isBusy ? 'animate-spin' : ''}`} />
              <span>{isBusy ? t('sendingToKeyboard') : t('applyLightingBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hardware Note about Sidelights & Light bar */}
      <div className="rounded-xl p-4 bg-slate-900/60 border border-slate-800/80 flex items-start space-x-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-slate-300">
            {t('hardwareLightZones')}
          </p>
          <p>
            {t('hardwareLightZonesDesc')}
          </p>
        </div>
      </div>
    </div>
  );
};
