import React from 'react';
import { Usb, Cpu, ExternalLink, Globe } from 'lucide-react';
import { DeviceConnectionState } from '../types/aula';
import { Language, getTranslation } from '../lib/i18n';

interface HeaderProps {
  deviceState: DeviceConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
  onToggleLang: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({
  deviceState,
  onConnect,
  onDisconnect,
  activeTab,
  setActiveTab,
  lang,
  onToggleLang,
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);

  const tabs = [
    { id: 'backlight', label: t('tabBacklight') },
    { id: 'perkey', label: t('tabPerKey') },
    { id: 'remap', label: t('tabRemap') },
    { id: 'lcd', label: t('tabLcd') },
    { id: 'packets', label: t('tabPackets') },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                  {t('appTitle')}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                  VID 0x0C45:800A
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Connection status and controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Language Switcher Button (TR / EN) */}
            <div className="flex items-center rounded-lg bg-slate-800 border border-slate-700/80 p-0.5">
              <button
                type="button"
                onClick={() => onToggleLang('tr')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  lang === 'tr'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Türkçe diline geç"
              >
                <span>🇹🇷</span> TR
              </button>
              <button
                type="button"
                onClick={() => onToggleLang('en')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  lang === 'en'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to English"
              >
                <span>🇬🇧</span> EN
              </button>
            </div>

            <div className="hidden lg:flex items-center px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full mr-2 ${
                  deviceState.isConnected
                    ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300 font-medium">
                {deviceState.isConnected
                  ? t('physicalConnected')
                  : t('simulatorActive')}
              </span>
            </div>


            {deviceState.isConnected ? (
              <button
                onClick={onDisconnect}
                className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/80 hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                {t('disconnect')}
              </button>
            ) : (
              <button
                onClick={onConnect}
                className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <Usb className="w-3.5 h-3.5 mr-1.5" />
                {t('connectWebHid')}
              </button>
            )}
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
