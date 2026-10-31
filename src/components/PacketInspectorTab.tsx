import React, { useState } from 'react';
import { Terminal, Copy, Check, Trash2, Cpu, FileCode, ShieldCheck, ChevronRight } from 'lucide-react';
import { HidPacketLog } from '../types/aula';
import { Language, getTranslation } from '../lib/i18n';

interface PacketInspectorTabProps {
  logs: HidPacketLog[];
  onClearLogs: () => void;
  currentLightingCli: string;
  currentPerKeyCli: string;
  currentRemapCli: string;
  lang?: Language;
}

export const PacketInspectorTab: React.FC<PacketInspectorTabProps> = ({
  logs,
  onClearLogs,
  currentLightingCli,
  currentPerKeyCli,
  currentRemapCli,
  lang = 'tr',
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);
  const [copiedUdev, setCopiedUdev] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [selectedLog, setSelectedLog] = useState<HidPacketLog | null>(null);

  const udevRuleCommand = `echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="0c45", ATTR{idProduct}=="800a", MODE="0666"' | sudo tee /etc/udev/rules.d/99-aula.rules
sudo udevadm control --reload-rules && sudo udevadm trigger`;

  const fullBashScript = `#!/usr/bin/env bash
# Aula F108 Pro Linux Configuration Script
# Generated automatically by Aula F108 Linux Controller

set -e

echo "[+] Applying Aula F108 Pro configuration..."

# 1. Backlight effect
${currentLightingCli}

# 2. Key Remapping
${currentRemapCli}

# 3. Clock Sync
f108-pro clock

echo "[✓] Aula F108 Pro configuration applied successfully!"
`;

  return (
    <div className="space-y-6">
      {/* Linux Udev & Permission Setup Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              {t('usbPermissionsTitle')}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            /etc/udev/rules.d/99-aula.rules
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {t('usbPermissionsDesc')}
        </p>

        <div className="relative bg-slate-950 rounded-xl p-3 border border-slate-800">
          <button
            onClick={() => {
              navigator.clipboard.writeText(udevRuleCommand);
              setCopiedUdev(true);
              setTimeout(() => setCopiedUdev(false), 2000);
            }}
            className="absolute top-2.5 right-2.5 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded bg-slate-800 border border-slate-700 cursor-pointer"
          >
            {copiedUdev ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedUdev ? t('copySuccess') : t('copyUdev')}
          </button>
          <pre className="text-xs font-mono text-emerald-300 select-all overflow-x-auto whitespace-pre pr-28">
            {udevRuleCommand}
          </pre>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time HID Packet Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" /> {t('liveHidStream')}
            </h3>
            <button
              onClick={onClearLogs}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('clearLogs')}
            </button>
          </div>

          <div className="border border-slate-800 rounded-xl bg-slate-950 max-h-[360px] overflow-y-auto divide-y divide-slate-800/80">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {t('noLogsYet')}
              </div>
            ) : (
              logs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`w-full text-left p-2.5 text-xs font-mono transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 text-cyan-200'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.type === 'TX'
                            ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
                            : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                        }`}
                      >
                        {log.type}
                      </span>
                      <span className="text-[11px] text-slate-500">{log.timestamp}</span>
                      <span className="text-slate-200 font-sans truncate">{log.description}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono ml-2 shrink-0">
                      {log.bytes.length}B
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Hex Packet Inspector View */}
          {selectedLog && (
            <div className="p-3 bg-slate-950 rounded-xl border border-cyan-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-cyan-300">
                  {t('inspecting')} {selectedLog.description}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedLog.bytes.length} {t('bytes')}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-400 break-all select-all leading-relaxed">
                {selectedLog.hexString}
              </div>
            </div>
          )}
        </div>

        {/* Linux Autostart Shell Script */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" /> {t('autostartScriptTitle')}
            </h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(fullBashScript);
                setCopiedScript(true);
                setTimeout(() => setCopiedScript(false), 2000);
              }}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedScript ? t('copySuccess') : t('copyScript')}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            {t('autostartDesc')}
          </p>

          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 select-all overflow-x-auto max-h-[300px]">
            {fullBashScript}
          </pre>

          <button
            onClick={() => {
              const blob = new Blob([fullBashScript], { type: 'application/x-sh' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'apply-aula-f108-profile.sh';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700"
          >
            <span>{t('downloadScript')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
