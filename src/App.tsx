import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { BacklightTab } from './components/BacklightTab';
import { PerKeyRgbTab } from './components/PerKeyRgbTab';
import { RemapTab } from './components/RemapTab';
import { LcdTab } from './components/LcdTab';
import { PacketInspectorTab } from './components/PacketInspectorTab';
import {
  AulaDeviceController,
  buildLightingPackets,
  buildPerKeyRGBPackets,
  buildRemapPackets,
  buildClockSyncPackets,
} from './lib/protocol';
import {
  LightingConfig,
  KeyRemapRule,
  HidPacketLog,
  DeviceConnectionState,
  LcdVisualState,
} from './types/aula';
import { Language, getTranslation } from './lib/i18n';
import { CheckCircle2, AlertCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aula_f108_lang') as Language;
      if (saved === 'tr' || saved === 'en') return saved;
    }
    return 'tr';
  });

  const handleToggleLang = (newLang: Language) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aula_f108_lang', newLang);
    }
  };

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);

  const [activeTab, setActiveTab] = useState<string>('backlight');
  const [logs, setLogs] = useState<HidPacketLog[]>([]);
  const [deviceState, setDeviceState] = useState<DeviceConnectionState>({
    isConnected: false,
    isWebHidSupported: typeof navigator !== 'undefined' && 'hid' in navigator,
    isSimulated: true,
  });

  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    sent: number;
    total: number;
    percent: number;
  } | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Controller instance
  const controllerRef = useRef<AulaDeviceController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new AulaDeviceController(
      (newLogs) => setLogs([...newLogs]),
      () => {
        if (controllerRef.current) {
          setDeviceState({
            isConnected: controllerRef.current.isConnected,
            isWebHidSupported: controllerRef.current.isWebHidSupported,
            isSimulated: controllerRef.current.isSimulated,
            deviceName: controllerRef.current.deviceName,
          });
        }
      }
    );
  }

  // 1. Backlight State
  const [lightingConfig, setLightingConfig] = useState<LightingConfig>({
    mode: 1, // Static
    r: 6,
    g: 182,
    b: 212, // Cyan
    brightness: 5,
    speed: 3,
    direction: 0,
    colorful: false,
  });

  // 2. Per-Key RGB State
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [perKeyColors, setPerKeyColors] = useState<{ [code: string]: [number, number, number] }>({
    w: [0, 255, 0],
    a: [0, 255, 0],
    s: [0, 255, 0],
    d: [0, 255, 0],
    esc: [255, 0, 0],
  });
  const [perKeyBrightness, setPerKeyBrightness] = useState<number>(4);

  // 3. Key Remapping State
  const [isFnLayer, setIsFnLayer] = useState<boolean>(false);
  const [normalRemaps, setNormalRemaps] = useState<KeyRemapRule[]>([]);
  const [fnRemaps, setFnRemaps] = useState<KeyRemapRule[]>([]);
  const [remapSelectedKey, setRemapSelectedKey] = useState<string>('capslock');

  // 4. LCD & Clock State
  const [lcdPreviewUrl, setLcdPreviewUrl] = useState<string | null>(null);
  const [lcdVisualState, setLcdVisualState] = useState<LcdVisualState | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // CLI command strings calculated from current states
  const lightingPacketsResult = useMemo(() => buildLightingPackets(lightingConfig), [lightingConfig]);
  const perKeyPacketsResult = useMemo(
    () => buildPerKeyRGBPackets(perKeyColors, perKeyBrightness),
    [perKeyColors, perKeyBrightness]
  );
  const currentRemaps = isFnLayer ? fnRemaps : normalRemaps;
  const remapPacketsResult = useMemo(
    () => buildRemapPackets(currentRemaps, isFnLayer),
    [currentRemaps, isFnLayer]
  );

  // Remap preview map for VirtualKeyboard
  const activeRemapsMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    currentRemaps.forEach((r) => {
      if (r.targetKey) map[r.sourceKey] = r.targetKey;
      else if (r.consumerAction) map[r.sourceKey] = r.consumerAction;
      else if (r.mouseAction) map[r.sourceKey] = r.mouseAction;
    });
    return map;
  }, [currentRemaps]);

  const [isBusy, setIsBusy] = useState<boolean>(false);

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setLanguage(lang);
    }
  }, [lang]);

  // Auto-connect on page load if user previously authorized keyboard
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setLanguage(lang);
    }
    controllerRef.current?.tryAutoConnect(lang).then((connected) => {
      if (connected) {
        showToast(t('toastAutoConnected'), 'success');
      }
    });
  }, []);

  // Connect WebHID
  const handleConnect = async () => {
    if (!controllerRef.current) return;
    setIsBusy(true);
    const res = await controllerRef.current.connect(lang);
    setIsBusy(false);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDisconnect = () => {
    if (!controllerRef.current) return;
    controllerRef.current.disconnect();
    showToast(t('toastDisconnected'), 'success');
  };

  // Direct Apply Actions to physical keyboard
  const handleApplyLighting = async () => {
    if (!controllerRef.current) return;
    setIsBusy(true);
    const res = await controllerRef.current.sendPackets(lightingPacketsResult.packets, undefined, lang);
    setIsBusy(false);
    if (res.success) {
      showToast(t('appliedBacklightSuccess'), 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleApplyPerKey = async () => {
    if (!controllerRef.current) return;
    setIsBusy(true);
    const res = await controllerRef.current.sendPackets(perKeyPacketsResult.packets, undefined, lang);
    setIsBusy(false);
    if (res.success) {
      showToast(t('appliedPerKeySuccess'), 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleApplyRemap = async () => {
    if (!controllerRef.current) return;
    setIsBusy(true);
    const res = await controllerRef.current.sendPackets(remapPacketsResult.packets, undefined, lang);
    setIsBusy(false);
    if (res.success) {
      showToast(t('appliedRemapSuccess'), 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleSyncClock = async (date: Date) => {
    if (!controllerRef.current) return;
    setIsBusy(true);
    const { packets } = buildClockSyncPackets(date);
    const res = await controllerRef.current.sendPackets(packets, undefined, lang);
    setIsBusy(false);
    if (res.success) {
      showToast(t('syncedClockSuccess'), 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleUploadLcdBinary = async (buf: Uint8Array, pageCount: number) => {
    if (!controllerRef.current) return;
    setIsBusy(true);
    setUploadProgress({ active: true, sent: 0, total: pageCount, percent: 0 });
    showToast(t('uploadStartedToast'), 'success');

    const res = await controllerRef.current.uploadLcdImage(
      buf,
      1,
      (sent, total, percent) => {
        setUploadProgress({ active: true, sent, total, percent });
      },
      lang
    );

    setIsBusy(false);
    if (res.success) {
      setUploadProgress({ active: false, sent: pageCount, total: pageCount, percent: 100 });
      showToast(t('uploadSuccessToast'), 'success');
      // Clear progress after 4 seconds
      setTimeout(() => {
        setUploadProgress(null);
      }, 4000);
    } else {
      setUploadProgress(null);
      showToast(res.message, 'error');
    }
  };

  const handleCancelLcdUpload = () => {
    if (!controllerRef.current) return;
    controllerRef.current.cancelLcdUpload();
    setIsBusy(false);
    setUploadProgress(null);
    showToast(t('uploadCancelledToast'), 'error');
  };

  // Keyboard key click handler
  const handleToggleKey = (code: string, isShift: boolean) => {
    if (activeTab === 'remap') {
      setRemapSelectedKey(code);
      return;
    }

    const next = new Set(selectedKeys);
    if (isShift) {
      if (next.has(code)) next.delete(code);
      else next.add(code);
    } else {
      if (next.has(code) && next.size === 1) {
        next.clear();
      } else {
        next.clear();
        next.add(code);
      }
    }
    setSelectedKeys(next);
  };

  // Check if embedded in iframe
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner when loaded inside an iframe */}
      {isInIframe && (
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border-b border-cyan-500/40 px-4 py-2.5 text-xs shadow-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-cyan-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>{t('iframeNotice')}</strong> {t('iframeNoticeDesc')}
              </span>
            </div>
            <a
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              {t('openNewTab')} ↗
            </a>
          </div>
        </div>
      )}

      {/* App Header */}
      <Header
        deviceState={deviceState}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Interactive Virtual Keyboard Matrix */}
        <VirtualKeyboard
          selectedKeys={selectedKeys}
          onToggleKey={handleToggleKey}
          perKeyColors={perKeyColors}
          lightingConfig={lightingConfig}
          mode={activeTab === 'perkey' ? 'perkey' : activeTab === 'remap' ? 'remap' : 'backlight'}
          remaps={activeRemapsMap}
          currentTime={currentTime}
          lcdPreviewUrl={lcdPreviewUrl}
          lcdVisualState={lcdVisualState}
          lang={lang}
        />

        {/* Tab Content Panels */}
        {activeTab === 'backlight' && (
          <BacklightTab
            config={lightingConfig}
            onChange={setLightingConfig}
            onApply={handleApplyLighting}
            cliCommand={lightingPacketsResult.cliCommand}
            isBusy={isBusy}
            lang={lang}
          />
        )}

        {activeTab === 'perkey' && (
          <PerKeyRgbTab
            selectedKeys={selectedKeys}
            onSelectKeys={setSelectedKeys}
            keyColors={perKeyColors}
            onUpdateColors={setPerKeyColors}
            brightness={perKeyBrightness}
            onBrightnessChange={setPerKeyBrightness}
            onApply={handleApplyPerKey}
            cliCommand={perKeyPacketsResult.cliCommand}
            isBusy={isBusy}
            lang={lang}
            onError={(msg) => showToast(msg, 'error')}
          />
        )}

        {activeTab === 'remap' && (
          <RemapTab
            remaps={isFnLayer ? fnRemaps : normalRemaps}
            onUpdateRemaps={(newRemaps) => {
              if (isFnLayer) setFnRemaps(newRemaps);
              else setNormalRemaps(newRemaps);
            }}
            isFnLayer={isFnLayer}
            onToggleLayer={setIsFnLayer}
            onApply={handleApplyRemap}
            cliCommand={remapPacketsResult.cliCommand}
            selectedKey={remapSelectedKey}
            onSelectKey={setRemapSelectedKey}
            isBusy={isBusy}
            lang={lang}
            onError={(msg) => showToast(msg, 'error')}
          />
        )}

        <div className={activeTab === 'lcd' ? 'block' : 'hidden'}>
          <LcdTab
            onSyncClock={handleSyncClock}
            onUploadLcdBinary={handleUploadLcdBinary}
            onCancelUpload={handleCancelLcdUpload}
            isConfigConnected={controllerRef.current?.isConfigInterfaceConnected || false}
            isLcdInterfaceConnected={controllerRef.current?.isLcdInterfaceConnected || false}
            setLcdPreviewUrl={setLcdPreviewUrl}
            onLcdVisualStateChange={setLcdVisualState}
            isBusy={isBusy}
            lang={lang}
            uploadProgress={uploadProgress}
          />
        </div>

        {activeTab === 'packets' && (
          <PacketInspectorTab
            logs={logs}
            onClearLogs={() => controllerRef.current?.clearLogs()}
            currentLightingCli={lightingPacketsResult.cliCommand}
            currentPerKeyCli={perKeyPacketsResult.cliCommand}
            currentRemapCli={remapPacketsResult.cliCommand}
            lang={lang}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <p>Aula F108 Pro Linux Controller • USB HID VID 0x0C45:800A • Native Linux, WebHID & CLI Suite</p>
      </footer>
    </div>
  );
};

export default App;
