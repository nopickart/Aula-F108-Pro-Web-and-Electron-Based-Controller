import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Clock,
  Image as ImageIcon,
  AlertTriangle,
  Download,
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Maximize2,
  ZoomIn,
  Move,
  Palette,
  XCircle,
  Cpu,
  Film,
  Gauge,
  Sparkles,
} from 'lucide-react';
import {
  LCD_WIDTH,
  LCD_HEIGHT,
  LCD_PAGE_SIZE,
  MAX_LCD_SAFE_FRAMES,
  buildLcdImageBuffer,
} from '../lib/protocol';
import { decodeGif, DecodedGif, DecodedGifFrame } from '../lib/gifDecoder';
import { Language, getTranslation } from '../lib/i18n';

interface LcdTabProps {
  onSyncClock: (date: Date) => void;
  onUploadLcdBinary: (buf: Uint8Array, pageCount: number) => void;
  onCancelUpload?: () => void;
  isConfigConnected?: boolean;
  isLcdInterfaceConnected?: boolean;
  setLcdPreviewUrl: (url: string | null) => void;
  isBusy?: boolean;
  lang: Language;
  uploadProgress?: { active: boolean; sent: number; total: number; percent: number } | null;
}

export type FitMode = 'cover' | 'contain' | 'stretch';

/**
 * Helper to render an image source (canvas or image) onto a target canvas context
 * with scaling, letterbox background, pan, zoom, and brightness/contrast filters.
 */
function drawSourceToCanvas(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  fitMode: FitMode,
  zoom: number,
  panX: number,
  panY: number,
  letterboxBg: string,
  brightness: number,
  contrast: number
) {
  // Clear canvas with chosen letterbox background
  ctx.fillStyle = letterboxBg;
  ctx.fillRect(0, 0, LCD_WIDTH, LCD_HEIGHT);

  ctx.save();
  // Apply brightness/contrast filter
  const bPercent = 100 + brightness;
  const cPercent = 100 + contrast;
  ctx.filter = `brightness(${bPercent}%) contrast(${cPercent}%)`;

  let drawW = LCD_WIDTH;
  let drawH = LCD_HEIGHT;
  let drawX = 0;
  let drawY = 0;

  if (fitMode === 'cover') {
    const scale = Math.max(LCD_WIDTH / sourceWidth, LCD_HEIGHT / sourceHeight) * zoom;
    drawW = sourceWidth * scale;
    drawH = sourceHeight * scale;
    drawX = (LCD_WIDTH - drawW) / 2 + panX;
    drawY = (LCD_HEIGHT - drawH) / 2 + panY;
  } else if (fitMode === 'contain') {
    const scale = Math.min(LCD_WIDTH / sourceWidth, LCD_HEIGHT / sourceHeight) * zoom;
    drawW = sourceWidth * scale;
    drawH = sourceHeight * scale;
    drawX = (LCD_WIDTH - drawW) / 2 + panX;
    drawY = (LCD_HEIGHT - drawH) / 2 + panY;
  } else if (fitMode === 'stretch') {
    drawW = LCD_WIDTH * zoom;
    drawH = LCD_HEIGHT * zoom;
    drawX = (LCD_WIDTH - drawW) / 2 + panX;
    drawY = (LCD_HEIGHT - drawH) / 2 + panY;
  }

  ctx.drawImage(source, drawX, drawY, drawW, drawH);
  ctx.restore();
}

export const LcdTab: React.FC<LcdTabProps> = ({
  onSyncClock,
  onUploadLcdBinary,
  onCancelUpload,
  isConfigConnected = false,
  isLcdInterfaceConnected = false,
  setLcdPreviewUrl,
  isBusy = false,
  lang,
  uploadProgress = null,
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [solidColor, setSolidColor] = useState('#06B6D4');
  const [imageMode, setImageMode] = useState<'solid' | 'custom'>('solid');

  // Static Image & Animated GIF state
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [gifData, setGifData] = useState<DecodedGif | null>(null);
  const [rawGifBuffer, setRawGifBuffer] = useState<ArrayBuffer | null>(null);
  const [frameStrategy, setFrameStrategy] = useState<'sample' | 'truncate'>('sample');

  // Animation player controls
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Image Adjustment Controls
  const [fitMode, setFitMode] = useState<FitMode>('cover');
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [letterboxBg, setLetterboxBg] = useState<string>('#000000');
  const [brightness, setBrightness] = useState<number>(0); // -50 to +50
  const [contrast, setContrast] = useState<number>(0); // -50 to +50

  // Generated Binary Output state
  const [generatedBuffer, setGeneratedBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [frameCount, setFrameCount] = useState<number>(1);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [copiedClock, setCopiedClock] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset adjustments
  const handleResetAdjustments = () => {
    setFitMode('cover');
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    setLetterboxBg('#000000');
    setBrightness(0);
    setContrast(0);
  };

  // Switch GIF frame strategy (sample vs truncate) if GIF has > 141 frames
  const handleFrameStrategyChange = (newStrategy: 'sample' | 'truncate') => {
    setFrameStrategy(newStrategy);
    if (rawGifBuffer) {
      try {
        const decoded = decodeGif(rawGifBuffer, newStrategy);
        setGifData(decoded);
        setCurrentFrameIndex(0);
      } catch (err: any) {
        setWarningMessage(err.message);
      }
    }
  };

  // Preview Animation Playback Loop
  useEffect(() => {
    if (imageMode !== 'custom' || !gifData || gifData.frames.length <= 1 || !isPlaying) {
      return;
    }

    const currentFrame = gifData.frames[currentFrameIndex];
    const frameDelayMs = currentFrame?.delayMs || 100;
    const effectiveDelay = Math.max(20, frameDelayMs / playbackSpeed);

    const timer = setTimeout(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % gifData.frames.length);
    }, effectiveDelay);

    return () => clearTimeout(timer);
  }, [imageMode, gifData, currentFrameIndex, isPlaying, playbackSpeed]);

  // Render the current visual state to the LCD Preview Canvas
  const updatePreviewCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (imageMode === 'solid') {
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
    } else if (gifData && gifData.frames.length > 0) {
      const frame = gifData.frames[currentFrameIndex] || gifData.frames[0];
      drawSourceToCanvas(
        ctx,
        frame.canvas,
        gifData.width,
        gifData.height,
        fitMode,
        zoom,
        panX,
        panY,
        letterboxBg,
        brightness,
        contrast
      );
    } else if (uploadedImage) {
      drawSourceToCanvas(
        ctx,
        uploadedImage,
        uploadedImage.naturalWidth || uploadedImage.width,
        uploadedImage.naturalHeight || uploadedImage.height,
        fitMode,
        zoom,
        panX,
        panY,
        letterboxBg,
        brightness,
        contrast
      );
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
    }

    const dataUrl = canvas.toDataURL();
    setLcdPreviewUrl(dataUrl);
  }, [
    imageMode,
    solidColor,
    gifData,
    currentFrameIndex,
    uploadedImage,
    fitMode,
    zoom,
    panX,
    panY,
    letterboxBg,
    brightness,
    contrast,
    setLcdPreviewUrl,
  ]);

  useEffect(() => {
    updatePreviewCanvas();
  }, [updatePreviewCanvas]);

  // Generate the full RGB565 binary buffer for single images or multi-frame animated GIFs
  const generateBinaryBuffer = useCallback(() => {
    if (imageMode === 'solid') {
      const offscreen = document.createElement('canvas');
      offscreen.width = LCD_WIDTH;
      offscreen.height = LCD_HEIGHT;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      offCtx.fillStyle = solidColor;
      offCtx.fillRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
      const imgData = offCtx.getImageData(0, 0, LCD_WIDTH, LCD_HEIGHT);

      const { buffer, pageCount: pages, error } = buildLcdImageBuffer([imgData.data], [10]);
      if (error) {
        setWarningMessage(error);
        setGeneratedBuffer(null);
      } else {
        setWarningMessage(null);
        setGeneratedBuffer(buffer);
        setPageCount(pages);
        setFrameCount(1);
      }
    } else if (gifData && gifData.frames.length > 0) {
      // Animated GIF mode: convert ALL frames with current user adjustments
      const offscreen = document.createElement('canvas');
      offscreen.width = LCD_WIDTH;
      offscreen.height = LCD_HEIGHT;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      const framesRgb: Uint8ClampedArray[] = [];
      const delaysCentisec: number[] = [];

      for (const frame of gifData.frames) {
        drawSourceToCanvas(
          offCtx,
          frame.canvas,
          gifData.width,
          gifData.height,
          fitMode,
          zoom,
          panX,
          panY,
          letterboxBg,
          brightness,
          contrast
        );
        const imgData = offCtx.getImageData(0, 0, LCD_WIDTH, LCD_HEIGHT);
        // Create an independent copy of clamped array
        framesRgb.push(new Uint8ClampedArray(imgData.data));
        delaysCentisec.push(frame.delayCentisec);
      }

      const { buffer, pageCount: pages, frameCount: count, error } = buildLcdImageBuffer(
        framesRgb,
        delaysCentisec
      );

      if (error) {
        setWarningMessage(error);
        setGeneratedBuffer(null);
      } else {
        setWarningMessage(null);
        setGeneratedBuffer(buffer);
        setPageCount(pages);
        setFrameCount(count);
      }
    } else if (uploadedImage) {
      // Single static image mode
      const offscreen = document.createElement('canvas');
      offscreen.width = LCD_WIDTH;
      offscreen.height = LCD_HEIGHT;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      drawSourceToCanvas(
        offCtx,
        uploadedImage,
        uploadedImage.naturalWidth || uploadedImage.width,
        uploadedImage.naturalHeight || uploadedImage.height,
        fitMode,
        zoom,
        panX,
        panY,
        letterboxBg,
        brightness,
        contrast
      );
      const imgData = offCtx.getImageData(0, 0, LCD_WIDTH, LCD_HEIGHT);

      const { buffer, pageCount: pages, error } = buildLcdImageBuffer([imgData.data], [10]);
      if (error) {
        setWarningMessage(error);
        setGeneratedBuffer(null);
      } else {
        setWarningMessage(null);
        setGeneratedBuffer(buffer);
        setPageCount(pages);
        setFrameCount(1);
      }
    }
  }, [imageMode, solidColor, gifData, uploadedImage, fitMode, zoom, panX, panY, letterboxBg, brightness, contrast]);

  // Debounce buffer generation when adjustments change to keep sliders 60fps responsive
  useEffect(() => {
    const timer = setTimeout(() => {
      generateBinaryBuffer();
    }, 120);
    return () => clearTimeout(timer);
  }, [generateBinaryBuffer]);

  // Handle file selection (GIF or standard image)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');

    if (isGif) {
      try {
        const buffer = await file.arrayBuffer();
        setRawGifBuffer(buffer);
        const decoded = decodeGif(buffer, frameStrategy);
        setGifData(decoded);
        setUploadedImage(null);
        setImageMode('custom');
        setCurrentFrameIndex(0);
        setIsPlaying(true);
        handleResetAdjustments();
      } catch (err: any) {
        setWarningMessage(`GIF çözümleme hatası: ${err.message || err}`);
      }
    } else {
      // Standard static image (PNG, JPEG, WebP, SVG)
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        setUploadedImage(img);
        setGifData(null);
        setRawGifBuffer(null);
        setImageMode('custom');
        setCurrentFrameIndex(0);
        setIsPlaying(false);
        handleResetAdjustments();
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
    e.target.value = '';
  };

  const handleDownloadBinary = () => {
    if (!generatedBuffer) return;
    const blob = new Blob([generatedBuffer.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `f108-pro-lcd-${frameCount}f.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadToKeyboard = () => {
    if (!generatedBuffer || pageCount === 0) return;
    onUploadLcdBinary(generatedBuffer, pageCount);
  };

  return (
    <div className="space-y-6">
      {/* Dual Hardware Safety & USB Interface Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hardware Brick Safety Reassurance Card */}
        <div className="md:col-span-2 p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/60 flex items-start space-x-3.5 shadow-lg">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-200">
                {t('brickProtectionTitle')}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold">
                100% Brick-Safe (MCU Protected)
              </span>
            </div>
            <p className="text-cyan-200/80 leading-relaxed text-[11px]">
              {t('brickProtectionDesc')}
            </p>
          </div>
        </div>

        {/* USB Interface Status Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" /> USB Arayüz Durumu
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              0x0C45:800A
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {/* Interface 3 */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Arayüz 3 (Kontrol & Saat):</span>
              <span className={`inline-flex items-center gap-1 font-medium ${isConfigConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${isConfigConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                {isConfigConnected ? t('interfaceConnected') : t('interfaceMissing')}
              </span>
            </div>

            {/* Interface 2 */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Arayüz 2 (LCD Veri Hattı):</span>
              <span className={`inline-flex items-center gap-1 font-medium ${isLcdInterfaceConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isLcdInterfaceConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isLcdInterfaceConnected ? t('interfaceConnected') : t('interfaceMissing')}
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-cyan-400/90 bg-cyan-950/60 px-2 py-1 rounded border border-cyan-900/60 text-center">
            {t('antiFreezeWatchdog')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LCD Clock Sync Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> {t('clockSyncTitle')}
            </h3>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              04 28 Protocol
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {t('clockSyncDesc')}
          </p>

          {/* Clock Display Card */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col items-center justify-center text-center">
            <div className="text-3xl font-mono font-bold text-cyan-400 tracking-widest drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              {currentTime.toLocaleTimeString([], { hour12: false })}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">
              {currentTime.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          <button
            onClick={() => onSyncClock(new Date())}
            disabled={isBusy}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Clock className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
            <span>{isBusy ? t('clockSyncing') : t('syncClockBtn')}</span>
          </button>

          {/* Linux CLI Box */}
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-400">
              <span className="font-mono">{t('linuxCliCommand')}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('f108-pro clock');
                  setCopiedClock(true);
                  setTimeout(() => setCopiedClock(false), 2000);
                }}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                {copiedClock ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedClock ? t('copySuccess') : t('copy')}
              </button>
            </div>
            <code className="text-xs font-mono text-cyan-300">f108-pro clock</code>
          </div>
        </div>

        {/* LCD Image & Animated GIF Studio (240x135) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" /> {t('lcdStudioTitle')}
            </h3>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              240×135 RGB565
            </span>
          </div>

          {/* Live LCD Canvas Preview */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="relative border-4 border-slate-700 rounded-lg p-1 bg-black shadow-inner">
              <canvas
                ref={canvasRef}
                width={LCD_WIDTH}
                height={LCD_HEIGHT}
                className="w-[240px] h-[135px] rounded bg-black object-contain image-rendering-pixelated shadow-md"
              />
              <div className="absolute top-2 right-2 text-[9px] font-mono bg-black/70 px-1.5 py-0.5 rounded text-cyan-300">
                1.14" TFT (240×135)
              </div>
            </div>

            {/* Animation Stats & Badges */}
            <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-3">
              <span>
                {t('pagesSent')}: <strong className="text-slate-200">{pageCount}</strong>
              </span>
              <span>
                Total: <strong className="text-slate-200">{generatedBuffer ? (generatedBuffer.length / 1024).toFixed(0) : 0} KB</strong>
              </span>
              <span className="flex items-center gap-1">
                {gifData && gifData.isAnimated ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800">
                    <Film className="w-3 h-3 text-cyan-400" />
                    {frameCount} {t('gifFramesBadge')}
                  </span>
                ) : (
                  <span>
                    Frames: <strong className="text-slate-200">{frameCount}</strong> / {MAX_LCD_SAFE_FRAMES}
                  </span>
                )}
              </span>
              {gifData && gifData.isAnimated && (
                <span className="text-slate-400 font-mono text-[10px]">
                  ~{(gifData.durationMs / 1000).toFixed(1)}s {t('gifLoopDuration')}
                </span>
              )}
            </div>

            {/* Animated GIF Player Bar (Play, Pause, Step, Scrub, Speed) */}
            {gifData && gifData.isAnimated && (
              <div className="w-full mt-3 pt-3 border-t border-slate-800/80 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    {/* Play/Pause Button */}
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-600/50 cursor-pointer transition-colors"
                      title={isPlaying ? t('pause') : t('play')}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>

                    {/* Step Backward */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentFrameIndex((prev) => (prev - 1 + gifData.frames.length) % gifData.frames.length);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors"
                      title={t('prevFrame')}
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>

                    {/* Step Forward */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentFrameIndex((prev) => (prev + 1) % gifData.frames.length);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors"
                      title={t('nextFrame')}
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[11px] font-mono text-cyan-300 pl-2">
                      {t('frame')} {currentFrameIndex + 1} / {gifData.frames.length}
                    </span>
                  </div>

                  {/* Playback Speed Multipliers */}
                  <div className="flex items-center space-x-1 text-[10px] font-mono">
                    <span className="text-slate-400 mr-0.5">{t('playbackSpeed')}:</span>
                    {[0.5, 1.0, 1.5, 2.0].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPlaybackSpeed(s)}
                        className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                          playbackSpeed === s
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frame Scrubber */}
                <input
                  type="range"
                  min="0"
                  max={gifData.frames.length - 1}
                  value={currentFrameIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentFrameIndex(Number(e.target.value));
                  }}
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Safe limit indicator banner for GIFs */}
          {gifData && gifData.isAnimated && (
            <div className="space-y-1.5">
              {gifData.wasSampled && (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800 text-[11px] text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>{t('gifSampledNotice')}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-amber-300/80">{t('samplingMode')}</span>
                      <button
                        type="button"
                        onClick={() => handleFrameStrategyChange('sample')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border ${
                          frameStrategy === 'sample'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {t('smartSample')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFrameStrategyChange('truncate')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border ${
                          frameStrategy === 'truncate'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {t('truncateFrames')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!gifData.wasSampled && !gifData.wasTruncated && (
                <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-800 text-[11px] text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {t('gifSafeNotice')} ({frameCount} / {MAX_LCD_SAFE_FRAMES})
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/80">SPI Flash Korumalı</span>
                </div>
              )}
            </div>
          )}

          {/* Real-time Upload Progress Bar */}
          {uploadProgress && uploadProgress.active && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/70 space-y-2.5 animate-in fade-in shadow-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  {t('uploadProgress')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-300 font-bold">
                    {uploadProgress.sent} / {uploadProgress.total} {t('pagesSent')} ({uploadProgress.percent}%)
                  </span>
                  {onCancelUpload && (
                    <button
                      type="button"
                      onClick={onCancelUpload}
                      className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title={t('cancelUploadBtn')}
                    >
                      <XCircle className="w-3 h-3 text-rose-400" />
                      {t('cancelUpload')}
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 h-full transition-all duration-150 rounded-full"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Watchdog 800ms Aktif
                </span>
                <span>Sayfa Başına 4096 Bayt (Arayüz 2)</span>
              </div>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex space-x-2">
            <button
              onClick={() => setImageMode('solid')}
              className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                imageMode === 'solid'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('solidColorMode')}
            </button>
            <label
              className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors text-center flex items-center justify-center gap-1.5 ${
                imageMode === 'custom'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> {t('uploadCustomImage')}
              <input
                type="file"
                accept="image/*,.gif"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Solid Color Mode Controls */}
          {imageMode === 'solid' && (
            <div className="flex items-center space-x-3 pt-1">
              <input
                type="color"
                value={solidColor}
                onChange={(e) => setSolidColor(e.target.value)}
                className="w-10 h-9 rounded-lg cursor-pointer bg-slate-800 border border-slate-700 p-0.5"
              />
              <input
                type="text"
                value={solidColor}
                onChange={(e) => setSolidColor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
              />
            </div>
          )}

          {/* Custom Image Adjustments (Fit, Zoom, Pan, Brightness, Background) */}
          {imageMode === 'custom' && (
            <div className="space-y-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
              {/* Fit Mode Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" /> {t('fitModeLabel')}
                  </span>
                  <button
                    onClick={handleResetAdjustments}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> {t('resetAdjustments')}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFitMode('cover')}
                    className={`py-1 px-2 rounded border text-[11px] font-medium cursor-pointer transition-colors ${
                      fitMode === 'cover'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Cover (Doldur)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFitMode('contain')}
                    className={`py-1 px-2 rounded border text-[11px] font-medium cursor-pointer transition-colors ${
                      fitMode === 'contain'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Contain (Sığdır)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFitMode('stretch')}
                    className={`py-1 px-2 rounded border text-[11px] font-medium cursor-pointer transition-colors ${
                      fitMode === 'stretch'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Stretch (Esnet)
                  </button>
                </div>
              </div>

              {/* Zoom & Pan Sliders */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {/* Zoom */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom</span>
                    <span className="font-mono text-cyan-300">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                {/* Pan X */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1"><Move className="w-3 h-3" /> X</span>
                    <span className="font-mono text-cyan-300">{panX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-120"
                    max="120"
                    step="1"
                    value={panX}
                    onChange={(e) => setPanX(Number(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                {/* Pan Y */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1"><Move className="w-3 h-3" /> Y</span>
                    <span className="font-mono text-cyan-300">{panY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-68"
                    max="68"
                    step="1"
                    value={panY}
                    onChange={(e) => setPanY(Number(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Background Color for Contain Mode */}
              {fitMode === 'contain' && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" /> {t('bgColor')}:
                  </span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={letterboxBg}
                      onChange={(e) => setLetterboxBg(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-slate-800 border border-slate-700 p-0.5"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{letterboxBg}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warning Message if any */}
          {warningMessage && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{warningMessage}</span>
            </div>
          )}

          {/* Notice if Interface 2 is not yet authorized */}
          {!isLcdInterfaceConnected && (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Arayüz 2 (LCD Veri) için yetki bekleniyor.
              </span>
              <span className="text-[10px] text-amber-400/80">
                (Yukarıdaki 'Klavyeyi Bağla' ile izin yenileyin)
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-2 pt-2">
            <button
              onClick={handleDownloadBinary}
              disabled={!generatedBuffer || isBusy}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-50 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t('downloadBinBtn')}</span>
            </button>

            {isBusy ? (
              <div className="flex-1 flex space-x-2">
                <button
                  type="button"
                  disabled
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-cyan-700 text-cyan-200 text-xs font-bold cursor-wait shadow-md"
                >
                  <Play className="w-4 h-4 fill-current animate-spin" />
                  <span>{t('sendingToKeyboard')}</span>
                </button>
                {onCancelUpload && (
                  <button
                    type="button"
                    onClick={onCancelUpload}
                    className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-md"
                    title={t('cancelUploadBtn')}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{t('cancelUpload')}</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleUploadToKeyboard}
                disabled={!generatedBuffer || !!warningMessage}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-bold cursor-pointer shadow-md shadow-cyan-500/20 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {t('uploadToKeyboardBtn')}
                  {frameCount > 1 ? ` (${frameCount}f)` : ''}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
