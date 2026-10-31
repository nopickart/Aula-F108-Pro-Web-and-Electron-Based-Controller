import { parseGIF, decompressFrames, ParsedFrame } from 'gifuct-js';
import { MAX_LCD_SAFE_FRAMES } from './protocol';

export interface DecodedGifFrame {
  canvas: HTMLCanvasElement;
  delayMs: number;
  delayCentisec: number;
}

export interface DecodedGif {
  frames: DecodedGifFrame[];
  originalFrameCount: number;
  width: number;
  height: number;
  durationMs: number;
  isAnimated: boolean;
  wasSampled: boolean;
  wasTruncated: boolean;
}

/**
 * Decodes an animated or static GIF from an ArrayBuffer, properly compositing all frames
 * respecting GIF disposal rules, transparency, and per-frame delay timings.
 *
 * Enforces the Aula F108 Pro hardware safety limit (max 141 frames) to prevent
 * overwriting the keyboard's SPI flash menu graphics.
 */
export function decodeGif(
  buffer: ArrayBuffer,
  frameStrategy: 'sample' | 'truncate' = 'sample'
): DecodedGif {
  const parsed = parseGIF(buffer);
  const decompressed = decompressFrames(parsed, true) as ParsedFrame[];

  if (!decompressed || decompressed.length === 0) {
    throw new Error('GIF dosyasından kare çözümlenemedi (boş veya geçersiz format).');
  }

  const gifWidth = parsed.lsd.width;
  const gifHeight = parsed.lsd.height;
  const originalCount = decompressed.length;

  let selectedIndices: number[] = [];
  let step = 1;
  let wasSampled = false;
  let wasTruncated = false;

  if (originalCount <= MAX_LCD_SAFE_FRAMES) {
    selectedIndices = Array.from({ length: originalCount }, (_, i) => i);
  } else if (frameStrategy === 'sample') {
    // Smart sampling: sample frames evenly to fit within 141 frames, preserving the full animation
    step = Math.ceil(originalCount / MAX_LCD_SAFE_FRAMES);
    for (let i = 0; i < originalCount; i += step) {
      if (selectedIndices.length < MAX_LCD_SAFE_FRAMES) {
        selectedIndices.push(i);
      }
    }
    wasSampled = true;
  } else {
    // Truncate: take first 141 frames
    selectedIndices = Array.from({ length: MAX_LCD_SAFE_FRAMES }, (_, i) => i);
    wasTruncated = true;
  }

  // Offscreen compositing canvas for accumulated GIF frames
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = gifWidth;
  compositeCanvas.height = gifHeight;
  const compositeCtx = compositeCanvas.getContext('2d', { willReadFrequently: true });
  if (!compositeCtx) {
    throw new Error('Canvas 2D render bağlamı oluşturulamadı.');
  }

  // Canvas for drawing the current frame's patch
  const patchCanvas = document.createElement('canvas');
  const patchCtx = patchCanvas.getContext('2d');
  if (!patchCtx) {
    throw new Error('Patch canvas render bağlamı oluşturulamadı.');
  }

  const fullFrames: DecodedGifFrame[] = [];
  const selectedSet = new Set(selectedIndices);

  let previousBackup: ImageData | null = null;
  let totalDurationMs = 0;

  for (let i = 0; i < originalCount; i++) {
    const frame = decompressed[i];
    const { dims, patch, delay: rawDelay, disposalType } = frame;

    // Normalised delay: GIF standard defaults 0 or <20ms to 100ms
    const baseDelayMs = !rawDelay || rawDelay < 20 ? 100 : rawDelay;

    // Save previous state if disposalType is 3 (restore to previous)
    if (disposalType === 3) {
      previousBackup = compositeCtx.getImageData(0, 0, gifWidth, gifHeight);
    }

    // Render patch onto patchCanvas
    if (dims.width > 0 && dims.height > 0) {
      patchCanvas.width = dims.width;
      patchCanvas.height = dims.height;
      const patchClamped = new Uint8ClampedArray(patch);
      const imgData = new ImageData(patchClamped, dims.width, dims.height);
      patchCtx.putImageData(imgData, 0, 0);

      // Composite patch onto accumulated frame
      compositeCtx.drawImage(patchCanvas, dims.left, dims.top);
    }

    // If this frame index was selected, save a clone to fullFrames
    if (selectedSet.has(i)) {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = gifWidth;
      frameCanvas.height = gifHeight;
      const fCtx = frameCanvas.getContext('2d');
      if (fCtx) {
        fCtx.drawImage(compositeCanvas, 0, 0);
      }

      // If sampled, scale delay to preserve playback speed
      const effectiveDelayMs = wasSampled ? baseDelayMs * step : baseDelayMs;
      const delayCentisec = Math.max(2, Math.round(effectiveDelayMs / 10));

      fullFrames.push({
        canvas: frameCanvas,
        delayMs: effectiveDelayMs,
        delayCentisec,
      });

      totalDurationMs += effectiveDelayMs;
    }

    // Handle post-frame disposal
    if (disposalType === 2) {
      // Clear frame rect to transparent
      compositeCtx.clearRect(dims.left, dims.top, dims.width, dims.height);
    } else if (disposalType === 3 && previousBackup) {
      // Restore previous canvas state
      compositeCtx.putImageData(previousBackup, 0, 0);
    }
  }

  return {
    frames: fullFrames,
    originalFrameCount: originalCount,
    width: gifWidth,
    height: gifHeight,
    durationMs: totalDurationMs,
    isAnimated: fullFrames.length > 1,
    wasSampled,
    wasTruncated,
  };
}
