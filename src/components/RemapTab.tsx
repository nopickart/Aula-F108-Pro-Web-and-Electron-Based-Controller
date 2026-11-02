import React, { useState } from 'react';
import yaml from 'js-yaml';
import { ALL_KEYS, CONSUMER_ACTIONS, MOUSE_ACTIONS, KEY_BY_CODE } from '../lib/aula-constants';
import { KeyRemapRule, RemapActionType } from '../types/aula';
import { Play, Copy, Check, Upload, Download, Trash2, RotateCcw, Shuffle, Music, Mouse, Plus } from 'lucide-react';
import { Language, getTranslation } from '../lib/i18n';

interface RemapTabProps {
  remaps: KeyRemapRule[];
  onUpdateRemaps: (remaps: KeyRemapRule[]) => void;
  isFnLayer: boolean;
  onToggleLayer: (fn: boolean) => void;
  onApply: () => void;
  cliCommand: string;
  selectedKey?: string;
  onSelectKey: (k: string) => void;
  isBusy?: boolean;
  lang?: Language;
  onError?: (msg: string) => void;
}

export const RemapTab: React.FC<RemapTabProps> = ({
  remaps,
  onUpdateRemaps,
  isFnLayer,
  onToggleLayer,
  onApply,
  cliCommand,
  selectedKey = 'capslock',
  onSelectKey,
  isBusy = false,
  lang = 'tr',
  onError,
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);
  const [actionType, setActionType] = useState<RemapActionType>('key');
  const [targetKey, setTargetKey] = useState<string>('lctrl');
  const [consumerAction, setConsumerAction] = useState<string>('volup');
  const [mouseAction, setMouseAction] = useState<string>('lclick');
  const [modifiers, setModifiers] = useState({
    ctrl: false,
    shift: false,
    alt: false,
    win: false,
  });
  const [copied, setCopied] = useState(false);

  const handleAddOrUpdateRule = () => {
    const existingIdx = remaps.findIndex((r) => r.sourceKey === selectedKey);
    const newRule: KeyRemapRule = {
      sourceKey: selectedKey,
      action: actionType,
      targetKey: actionType === 'key' ? targetKey : undefined,
      modifiers: actionType === 'key' ? modifiers : undefined,
      consumerAction: actionType === 'consumer' ? consumerAction : undefined,
      mouseAction: actionType === 'mouse' ? mouseAction : undefined,
    };

    if (existingIdx >= 0) {
      const next = [...remaps];
      next[existingIdx] = newRule;
      onUpdateRemaps(next);
    } else {
      onUpdateRemaps([...remaps, newRule]);
    }
  };

  const handleRemoveRule = (sourceKey: string) => {
    onUpdateRemaps(remaps.filter((r) => r.sourceKey !== sourceKey));
  };

  const handleResetLayer = () => {
    onUpdateRemaps([]);
  };

  // Quick Preset: Swap CapsLock and Left Ctrl
  const applyCapsCtrlSwap = () => {
    const newRules: KeyRemapRule[] = [
      { sourceKey: 'capslock', action: 'key', targetKey: 'lctrl' },
    ];
    onUpdateRemaps(newRules);
  };

  // Export YAML (matches format in examples/capslock-ctrl.yaml)
  const handleExportYaml = () => {
    const keysObj: any = {};
    remaps.forEach((r) => {
      if (r.action === 'key' && r.targetKey) {
        const activeMods = Object.entries(r.modifiers || {})
          .filter(([, v]) => v)
          .map(([k]) => k);
        if (activeMods.length > 0) {
          keysObj[r.sourceKey] = `combo:${activeMods.join('+')}+${r.targetKey}`;
        } else {
          keysObj[r.sourceKey] = r.targetKey;
        }
      } else if (r.action === 'consumer' && r.consumerAction) {
        keysObj[r.sourceKey] = `media:${r.consumerAction}`;
      } else if (r.action === 'mouse' && r.mouseAction) {
        keysObj[r.sourceKey] = `mouse:${r.mouseAction}`;
      }
    });

    const exportData = {
      layer: isFnLayer ? 'fn' : 'normal',
      keys: keysObj,
    };

    const dump = yaml.dump(exportData);
    const blob = new Blob([dump], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `f108-pro-remap-${isFnLayer ? 'fn' : 'normal'}.yaml`;
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
        const newRemaps: KeyRemapRule[] = [];

        if (parsed.layer === 'fn') {
          onToggleLayer(true);
        } else if (parsed.layer === 'normal') {
          onToggleLayer(false);
        }

        if (parsed.keys && typeof parsed.keys === 'object') {
          Object.entries(parsed.keys).forEach(([source, val]: [string, any]) => {
            const src = source.toLowerCase();
            const strVal = String(val).toLowerCase();

            if (strVal.startsWith('media:')) {
              newRemaps.push({
                sourceKey: src,
                action: 'consumer',
                consumerAction: strVal.replace('media:', ''),
              });
            } else if (strVal.startsWith('mouse:')) {
              newRemaps.push({
                sourceKey: src,
                action: 'mouse',
                mouseAction: strVal.replace('mouse:', ''),
              });
            } else if (strVal.startsWith('combo:')) {
              const comboStr = strVal.replace('combo:', '');
              const parts = comboStr.split('+');
              const target = parts[parts.length - 1];
              const modParts = parts.slice(0, parts.length - 1);
              newRemaps.push({
                sourceKey: src,
                action: 'key',
                targetKey: target,
                modifiers: {
                  ctrl: modParts.includes('ctrl'),
                  shift: modParts.includes('shift'),
                  alt: modParts.includes('alt'),
                  win: modParts.includes('win'),
                },
              });
            } else {
              // Direct swap
              newRemaps.push({
                sourceKey: src,
                action: 'key',
                targetKey: strVal,
              });
            }
          });
        }
        onUpdateRemaps(newRemaps);
      } catch (err: any) {
        const errorMsg = `${t('errYamlInvalid')} ${err.message || err}`;
        if (onError) onError(errorMsg);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Layer Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {t('keyboardLayer')}
          </span>
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => onToggleLayer(false)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                !isFnLayer
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('normalLayer')}
            </button>
            <button
              onClick={() => onToggleLayer(true)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                isFnLayer
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('fnLayer')}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={applyCapsCtrlSwap}
            className="px-3 py-1.5 rounded-lg border border-purple-800/60 bg-purple-950/40 text-purple-300 hover:bg-purple-900/40 text-xs font-medium cursor-pointer"
          >
            {t('presetCapsCtrl')}
          </button>
          <button
            onClick={handleResetLayer}
            className="px-3 py-1.5 rounded-lg border border-rose-800/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {t('resetLayer')}
          </button>
        </div>
      </div>

      {/* Remap Editor & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Key & Action Picker */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-cyan-400" /> {t('remapRule')}
          </h3>

          {/* Source Key */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              {t('physicalKeyToRemap')}
            </label>
            <select
              value={selectedKey}
              onChange={(e) => onSelectKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {ALL_KEYS.map((k) => (
                <option key={k.code} value={k.code}>
                  {k.label} ({k.code}) - Index #{k.lightIndex}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              {t('remapTip')}
            </p>
          </div>

          {/* Action Tabs */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">{t('targetActionType')}</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setActionType('key')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  actionType === 'key'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                {t('actionKeySwap')}
              </button>
              <button
                type="button"
                onClick={() => setActionType('consumer')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  actionType === 'consumer'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                {t('actionMultimedia')}
              </button>
              <button
                type="button"
                onClick={() => setActionType('mouse')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  actionType === 'mouse'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                {t('actionMouse')}
              </button>
            </div>
          </div>

          {/* Target Action Details */}
          {actionType === 'key' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">{t('targetKey')}</label>
                <select
                  value={targetKey}
                  onChange={(e) => setTargetKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {ALL_KEYS.map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.label} ({k.code}) - HID 0x{k.hidCode.toString(16).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Combo Modifiers */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">{t('heldModifiers')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['ctrl', 'shift', 'alt', 'win'] as const).map((mod) => (
                    <label
                      key={mod}
                      className={`flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer select-none font-medium uppercase ${
                        modifiers[mod]
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={modifiers[mod]}
                        onChange={(e) => setModifiers({ ...modifiers, [mod]: e.target.checked })}
                        className="hidden"
                      />
                      {mod}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {actionType === 'consumer' && (
            <div className="space-y-2 pt-2">
              <label className="text-[11px] text-slate-400 block">{t('multimediaFunction')}</label>
              <select
                value={consumerAction}
                onChange={(e) => setConsumerAction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {Object.entries(CONSUMER_ACTIONS).map(([code, action]) => (
                  <option key={code} value={code}>
                    {action.label} (Code: 0x{action.code.toString(16).toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionType === 'mouse' && (
            <div className="space-y-2 pt-2">
              <label className="text-[11px] text-slate-400 block">{t('mouseAction')}</label>
              <select
                value={mouseAction}
                onChange={(e) => setMouseAction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {Object.entries(MOUSE_ACTIONS).map(([code, action]) => (
                  <option key={code} value={code}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleAddOrUpdateRule}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('saveRemapFor')} {KEY_BY_CODE.get(selectedKey)?.label || selectedKey}</span>
          </button>
        </div>

        {/* Active Rules List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              {t('activeRemapRules')} ({remaps.length})
            </h3>
            <span className="text-xs text-purple-300 font-mono">
              Layer: {isFnLayer ? 'FN' : 'Normal'}
            </span>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {remaps.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                {t('noRemapRules')}
              </div>
            ) : (
              remaps.map((rule) => {
                const srcDef = KEY_BY_CODE.get(rule.sourceKey);
                let targetLabel = '';
                if (rule.action === 'key' && rule.targetKey) {
                  const targetDef = KEY_BY_CODE.get(rule.targetKey);
                  const activeMods = Object.entries(rule.modifiers || {})
                    .filter(([, v]) => v)
                    .map(([k]) => k.toUpperCase());
                  targetLabel = activeMods.length > 0
                    ? `${activeMods.join('+')}+${targetDef?.label || rule.targetKey}`
                    : (targetDef?.label || rule.targetKey);
                } else if (rule.action === 'consumer' && rule.consumerAction) {
                  targetLabel = CONSUMER_ACTIONS[rule.consumerAction]?.label || rule.consumerAction;
                } else if (rule.action === 'mouse' && rule.mouseAction) {
                  targetLabel = MOUSE_ACTIONS[rule.mouseAction]?.label || rule.mouseAction;
                }

                return (
                  <div
                    key={rule.sourceKey}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-cyan-300 font-mono">
                        {srcDef?.label || rule.sourceKey}
                      </span>
                      <span className="text-slate-500">→</span>
                      <span className="text-purple-300 font-medium">
                        {targetLabel}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveRule(rule.sourceKey)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Apply Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-center space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">YAML Config & Apply</h3>
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
              Sends the 576-byte remap table (4-byte slot per key: Action, Param1, Param2, Param3 with trailer 0xAA 0x55).
            </p>

            <button
              onClick={onApply}
              disabled={isBusy}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
            >
              <Play className={`w-4 h-4 fill-current ${isBusy ? 'animate-spin' : ''}`} />
              <span>{isBusy ? t('sendingToKeyboard') : `${t('applyRemapBtn')} (${isFnLayer ? 'FN' : 'Normal'})`}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
