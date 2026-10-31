import React, { useState } from 'react';
import yaml from 'js-yaml';
import { PRESET_GROUPS, ALL_KEYS } from '../lib/aula-constants';
import { Play, Copy, Check, Upload, Download, Trash2, Palette, Sun, Layers } from 'lucide-react';
import { Language, getTranslation } from '../lib/i18n';

interface PerKeyRgbTabProps {
  selectedKeys: Set<string>;
  onSelectKeys: (keys: Set<string>) => void;
  keyColors: { [code: string]: [number, number, number] };
  onUpdateColors: (colors: { [code: string]: [number, number, number] }) => void;
  brightness: number;
  onBrightnessChange: (b: number) => void;
  onApply: () => void;
  cliCommand: string;
  isBusy?: boolean;
  lang?: Language;
}

const PALETTE = [
  { name: 'Red', nameTr: 'Kırmızı', hex: '#EF4444', rgb: [255, 0, 0] as [number, number, number] },
  { name: 'Green', nameTr: 'Yeşil', hex: '#10B981', rgb: [0, 255, 0] as [number, number, number] },
  { name: 'Blue', nameTr: 'Mavi', hex: '#3B82F6', rgb: [0, 100, 255] as [number, number, number] },
  { name: 'Cyan', nameTr: 'Camgöbeği', hex: '#06B6D4', rgb: [0, 255, 255] as [number, number, number] },
  { name: 'Magenta', nameTr: 'Macenta', hex: '#D946EF', rgb: [255, 0, 255] as [number, number, number] },
  { name: 'Yellow', nameTr: 'Sarı', hex: '#FACC15', rgb: [255, 255, 0] as [number, number, number] },
  { name: 'Orange', nameTr: 'Turuncu', hex: '#FB923C', rgb: [255, 120, 0] as [number, number, number] },
  { name: 'White', nameTr: 'Beyaz', hex: '#FFFFFF', rgb: [255, 255, 255] as [number, number, number] },
  { name: 'Dim Blue', nameTr: 'Koyu Mavi', hex: '#1E3A8A', rgb: [0, 0, 50] as [number, number, number] },
  { name: 'Off (Black)', nameTr: 'Kapalı (Siyah)', hex: '#0F172A', rgb: [0, 0, 0] as [number, number, number] },
];

export const PerKeyRgbTab: React.FC<PerKeyRgbTabProps> = ({
  selectedKeys,
  onSelectKeys,
  keyColors,
  onUpdateColors,
  brightness,
  onBrightnessChange,
  onApply,
  cliCommand,
  isBusy = false,
  lang = 'tr',
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);
  const [paintColor, setPaintColor] = useState<[number, number, number]>([0, 255, 255]);
  const [copied, setCopied] = useState(false);
  const [yamlText, setYamlText] = useState('');
  const [showYamlModal, setShowYamlModal] = useState(false);

  const handleApplyColorToSelection = (rgb: [number, number, number]) => {
    if (selectedKeys.size === 0) return;
    const next = { ...keyColors };
    selectedKeys.forEach((k) => {
      next[k] = rgb;
    });
    onUpdateColors(next);
  };

  const handleSelectGroup = (groupKeys: string[]) => {
    onSelectKeys(new Set(groupKeys));
  };

  const handleSelectAll = () => {
    onSelectKeys(new Set(ALL_KEYS.map((k) => k.code)));
  };

  const handleClearSelection = () => {
    onSelectKeys(new Set());
  };

  const handleClearAllColors = () => {
    onUpdateColors({});
  };

  // Preset Theme: WASD Green (from examples/wasd-green.yaml)
  const applyWasdGreenTheme = () => {
    const next: { [code: string]: [number, number, number] } = {};
    // Base dim blue for all keys
    ALL_KEYS.forEach((k) => {
      next[k.code] = [0, 0, 50];
    });
    // Green WASD
    ['w', 'a', 's', 'd'].forEach((k) => {
      next[k] = [0, 255, 0];
    });
    next['esc'] = [255, 0, 0]; // Esc red
    onUpdateColors(next);
    onBrightnessChange(3);
  };

  // Preset Theme: Cyberpunk
  const applyCyberpunkTheme = () => {
    const next: { [code: string]: [number, number, number] } = {};
    ALL_KEYS.forEach((k) => {
      if (['w', 'a', 's', 'd', 'up', 'down', 'left', 'right'].includes(k.code)) {
        next[k.code] = [255, 255, 0]; // Neon Yellow
      } else if (k.group === 'alpha') {
        next[k.code] = [0, 255, 255]; // Cyan
      } else if (k.group === 'modifier') {
        next[k.code] = [255, 0, 255]; // Magenta
      } else {
        next[k.code] = [0, 20, 40];
      }
    });
    onUpdateColors(next);
    onBrightnessChange(4);
  };

  // Export YAML
  const handleExportYaml = () => {
    const exportData: any = {
      brightness,
      keys: {},
    };
    Object.entries(keyColors).forEach(([k, rgb]) => {
      if (rgb[0] > 0 || rgb[1] > 0 || rgb[2] > 0) {
        exportData.keys[k] = rgb;
      }
    });
    const dump = yaml.dump(exportData);
    const blob = new Blob([dump], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'f108-pro-perkey-layout.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import YAML
  const handleImportYaml = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = yaml.load(text) as any;
        const next: { [code: string]: [number, number, number] } = {};

        if (parsed.all && Array.isArray(parsed.all)) {
          ALL_KEYS.forEach((k) => {
            next[k.code] = [parsed.all[0], parsed.all[1], parsed.all[2]];
          });
        }
        if (parsed.keys && typeof parsed.keys === 'object') {
          Object.entries(parsed.keys).forEach(([k, val]: [string, any]) => {
            if (Array.isArray(val) && val.length >= 3) {
              next[k.toLowerCase()] = [val[0], val[1], val[2]];
            }
          });
        }
        if (typeof parsed.brightness === 'number') {
          onBrightnessChange(Math.min(5, Math.max(0, parsed.brightness)));
        }
        onUpdateColors(next);
      } catch (err: any) {
        alert('Invalid YAML file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preset Selection & Groups */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> {t('keyGroupPresets')}
            </h3>
            <span className="text-xs text-cyan-300 font-mono">
              {selectedKeys.size} {lang === 'tr' ? 'Seçili' : 'Selected'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESET_GROUPS.map((grp) => (
              <button
                key={grp.name}
                type="button"
                onClick={() => handleSelectGroup(grp.keys)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer text-left truncate"
              >
                {grp.name}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleSelectAll}
              className="flex-1 py-1.5 rounded-lg border border-cyan-800/80 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40 text-xs font-medium cursor-pointer"
            >
              {t('selectAll108')}
            </button>
            <button
              onClick={handleClearSelection}
              className="flex-1 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium cursor-pointer"
            >
              {t('deselectAll')}
            </button>
          </div>

          {/* Preset Layout Themes */}
          <div className="pt-2">
            <label className="text-[11px] font-medium text-slate-400 block mb-2">{t('presetLayouts')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={applyWasdGreenTheme}
                className="py-1.5 px-2 rounded-lg border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 text-xs font-medium cursor-pointer"
              >
                {t('wasdGreenLayout')}
              </button>
              <button
                onClick={applyCyberpunkTheme}
                className="py-1.5 px-2 rounded-lg border border-fuchsia-800/60 bg-fuchsia-950/40 text-fuchsia-300 hover:bg-fuchsia-900/40 text-xs font-medium cursor-pointer"
              >
                {t('cyberpunkTheme')}
              </button>
            </div>
          </div>
        </div>

        {/* Color Palette & Paint */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" /> {t('colorPalette')}
            </h3>
            <button
              onClick={handleClearAllColors}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('clearAllLights')}
            </button>
          </div>

          {/* Palette buttons */}
          <div className="grid grid-cols-5 gap-2">
            {PALETTE.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setPaintColor(c.rgb);
                  handleApplyColorToSelection(c.rgb);
                }}
                className="flex flex-col items-center p-2 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 cursor-pointer group transition-all"
              >
                <svg
                  className="w-5 h-5 rounded-full mb-1 shadow-sm group-hover:scale-110 transition-transform overflow-visible"
                  viewBox="0 0 20 20"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="8.5"
                    fill={c.hex}
                    stroke={c.rgb[0] > 200 && c.rgb[1] > 200 && c.rgb[2] > 200 ? '#cbd5e1' : '#334155'}
                    strokeWidth="1.5"
                  />
                </svg>
                <span className="text-[10px] text-slate-300 truncate w-full text-center">
                  {lang === 'tr' ? c.nameTr : c.name}
                </span>
              </button>
            ))}
          </div>

          {/* Brightness slider for per-key strip */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> {t('ledStripBrightness')}
              </span>
              <span className="font-mono text-cyan-300 font-bold">{brightness} / 5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={brightness}
              onChange={(e) => onBrightnessChange(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Apply, Import/Export Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-center space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">{t('yamlConfigAndApply')}</h3>
              <div className="flex space-x-1.5">
                <label className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer text-xs flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> {t('yamlImport')}
                  <input type="file" accept=".yaml,.yml" onChange={handleImportYaml} className="hidden" />
                </label>
                <button
                  onClick={handleExportYaml}
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> {t('yamlExport')}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {t('perKeyDesc')}
            </p>

            <button
              onClick={onApply}
              disabled={isBusy}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Play className={`w-4 h-4 fill-current ${isBusy ? 'animate-spin' : ''}`} />
              <span>{isBusy ? t('sendingToKeyboard') : t('applyPerKeyBtn')}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
