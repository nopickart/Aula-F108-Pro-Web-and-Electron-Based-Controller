import {
  LightingConfig,
  KeyRemapRule,
  HidPacketLog,
} from '../types/aula';
import { Language } from './i18n';
import {
  VENDOR_ID,
  PRODUCT_ID,
  KEY_BY_CODE,
  CONSUMER_ACTIONS,
  MOUSE_ACTIONS,
  MODIFIER_BITS,
} from './aula-constants';

const REPORT_SIZE = 64;
const REMAP_BUF_SIZE = 576; // 144 slots * 4 bytes
const PER_KEY_RGB_SIZE = 576; // 144 slots * 4 bytes
export const LCD_PAGE_SIZE = 4096;
export const LCD_WIDTH = 240;
export const LCD_HEIGHT = 135;
export const MAX_LCD_SAFE_FRAMES = 141; // Documented limit to avoid corrupting keyboard flash/menus

export interface AulaPacket {
  name: string;
  packet: Uint8Array;
  readback?: boolean;
}

export function bytesToHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

export function createPacket(payload: number[] | Uint8Array): Uint8Array {
  const p = new Uint8Array(REPORT_SIZE);
  p.set(payload.slice(0, REPORT_SIZE));
  return p;
}

// 04 18: Begin transaction
export function cmdBegin(): Uint8Array {
  return createPacket([0x04, 0x18]);
}

// 04 02: Apply transaction
export function cmdApply(): Uint8Array {
  return createPacket([0x04, 0x02]);
}

// 04 F0: Finalize transaction
export function cmdFinalize(): Uint8Array {
  return createPacket([0x04, 0xf0]);
}

// 04 13: Lighting init
export function cmdLightingInit(): Uint8Array {
  const p = new Uint8Array(REPORT_SIZE);
  p[0] = 0x04;
  p[1] = 0x13;
  p[8] = 0x01;
  return p;
}

export function buildLightingPackets(cfg: LightingConfig): { packets: AulaPacket[]; cliCommand: string } {
  const packets: AulaPacket[] = [];

  // Step 1: Begin (readback = true)
  packets.push({ name: 'Begin Transaction (04 18)', packet: cmdBegin(), readback: true });

  // Step 2: Lighting Init (readback = true)
  packets.push({ name: 'Lighting Init (04 13)', packet: cmdLightingInit(), readback: true });

  // Step 3: Lighting Data (readback = false)
  const data = new Uint8Array(REPORT_SIZE);
  data[0] = cfg.mode;
  if (cfg.mode !== 0) {
    data[1] = cfg.r;
    data[2] = cfg.g;
    data[3] = cfg.b;
    data[8] = cfg.colorful ? 1 : 0;
    data[9] = Math.min(5, Math.max(0, cfg.brightness));
    data[10] = Math.min(5, Math.max(0, cfg.speed));
    data[11] = cfg.direction ? 1 : 0;
  }
  // Trailer 0x55AA (little-endian on wire: AA 55)
  data[14] = 0xaa;
  data[15] = 0x55;
  packets.push({ name: `Lighting Data (Mode ${cfg.mode})`, packet: data, readback: false });

  // Step 4: Apply (readback = true)
  packets.push({ name: 'Apply Transaction (04 02)', packet: cmdApply(), readback: true });

  // Step 5: Finalize (readback = false)
  packets.push({ name: 'Finalize Transaction (04 F0)', packet: cmdFinalize(), readback: false });

  const colorArg = cfg.colorful ? 'colorful' : `${cfg.r} ${cfg.g} ${cfg.b}`;
  const dirArg = cfg.direction ? ' -d 1' : '';
  const cliCommand = cfg.mode === 0
    ? `f108-pro off`
    : `f108-pro light ${cfg.mode} ${cfg.brightness} ${cfg.speed} ${colorArg}${dirArg}`;

  return { packets, cliCommand };
}

export function buildPerKeyRGBPackets(
  keyColors: { [keyName: string]: [number, number, number] },
  brightness: number
): { packets: AulaPacket[]; cliCommand: string } {
  const packets: AulaPacket[] = [];

  // Step 1: LED strip preamble (Begin -> Lighting Init -> Brightness -> Apply -> Finalize)
  packets.push({ name: 'LED Strip Preamble: Begin', packet: cmdBegin(), readback: true });
  packets.push({ name: 'LED Strip Preamble: Lighting Init', packet: cmdLightingInit(), readback: true });
  const stripData = new Uint8Array(REPORT_SIZE);
  stripData[0] = 0x80;
  stripData[9] = Math.min(5, Math.max(0, brightness));
  stripData[14] = 0xaa;
  stripData[15] = 0x55;
  packets.push({ name: `LED Strip Preamble: Brightness ${brightness}`, packet: stripData, readback: false });
  packets.push({ name: 'LED Strip Preamble: Apply', packet: cmdApply(), readback: true });
  packets.push({ name: 'LED Strip Preamble: Finalize', packet: cmdFinalize(), readback: false });

  // Step 2: Per-key transaction
  packets.push({ name: 'Per-Key Begin', packet: cmdBegin(), readback: true });
  const initCmd = new Uint8Array(REPORT_SIZE);
  initCmd[0] = 0x04;
  initCmd[1] = 0x23;
  initCmd[8] = 0x09;
  packets.push({ name: 'Per-Key Init (04 23)', packet: initCmd, readback: true });

  // 576-byte buffer (144 slots * 4 bytes)
  const buf = new Uint8Array(PER_KEY_RGB_SIZE);
  for (const [keyName, [r, g, b]] of Object.entries(keyColors)) {
    const k = KEY_BY_CODE.get(keyName);
    if (!k) continue;
    const idx = k.lightIndex;
    if (idx <= 0 || idx * 4 + 3 >= PER_KEY_RGB_SIZE - 2) continue;
    const off = idx * 4;
    buf[off] = idx;
    buf[off + 1] = r;
    buf[off + 2] = g;
    buf[off + 3] = b;
  }
  // Trailer 0x55AA (little-endian on wire: AA 55)
  buf[PER_KEY_RGB_SIZE - 2] = 0xaa;
  buf[PER_KEY_RGB_SIZE - 1] = 0x55;

  // Split into 9 packets of 64 bytes
  const nPackets = Math.ceil(PER_KEY_RGB_SIZE / REPORT_SIZE);
  for (let i = 0; i < nPackets; i++) {
    const pkt = new Uint8Array(REPORT_SIZE);
    pkt.set(buf.subarray(i * REPORT_SIZE, (i + 1) * REPORT_SIZE));
    packets.push({
      name: `Per-Key Data Packet ${i + 1}/${nPackets}`,
      packet: pkt,
      readback: i === nPackets - 1, // Readback after last packet
    });
  }

  packets.push({ name: 'Per-Key Apply (04 02)', packet: cmdApply(), readback: true });
  packets.push({ name: 'Per-Key Finalize (04 F0)', packet: cmdFinalize(), readback: true });

  const activeKeys = Object.entries(keyColors).filter(([, [r, g, b]]) => r > 0 || g > 0 || b > 0);
  let cliCommand = `f108-pro perkey`;
  if (activeKeys.length > 0) {
    const preview = activeKeys.slice(0, 4).map(([k, [r, g, b]]) => `${k} ${r} ${g} ${b}`).join(' ');
    cliCommand += ` ${preview}${activeKeys.length > 4 ? ' ...' : ''}`;
  } else {
    cliCommand += ` --all 0,0,0`;
  }

  return { packets, cliCommand };
}

export function buildRemapPackets(
  remaps: KeyRemapRule[],
  isFnLayer: boolean
): { packets: AulaPacket[]; cliCommand: string } {
  const packets: AulaPacket[] = [];

  packets.push({ name: 'Remap Begin (04 18)', packet: cmdBegin(), readback: true });

  const initCmd = new Uint8Array(REPORT_SIZE);
  initCmd[0] = 0x04;
  initCmd[1] = isFnLayer ? 0x27 : 0x11;
  initCmd[8] = 0x09;
  packets.push({
    name: `Remap Init (${isFnLayer ? '04 27 FN' : '04 11 Normal'})`,
    packet: initCmd,
    readback: true,
  });

  const buf = new Uint8Array(REMAP_BUF_SIZE);

  for (const r of remaps) {
    const k = KEY_BY_CODE.get(r.sourceKey);
    if (!k) continue;
    const idx = k.lightIndex;
    if (idx <= 0 || idx * 4 + 3 >= REMAP_BUF_SIZE - 2) continue;
    const off = idx * 4;

    if (r.action === 'key' && r.targetKey) {
      const targetDef = KEY_BY_CODE.get(r.targetKey);
      if (targetDef) {
        buf[off] = 0x02; // RemapKey
        let modBit = 0;
        if (r.modifiers) {
          for (const [mod, active] of Object.entries(r.modifiers)) {
            if (active && MODIFIER_BITS[mod]) {
              modBit |= MODIFIER_BITS[mod];
            }
          }
        }
        buf[off + 1] = modBit;
        buf[off + 2] = targetDef.hidCode;
        buf[off + 3] = 0;
      }
    } else if (r.action === 'consumer' && r.consumerAction && CONSUMER_ACTIONS[r.consumerAction]) {
      buf[off] = 0x03; // RemapConsumer
      buf[off + 1] = CONSUMER_ACTIONS[r.consumerAction].code;
      buf[off + 2] = 0;
      buf[off + 3] = 0;
    } else if (r.action === 'mouse' && r.mouseAction && MOUSE_ACTIONS[r.mouseAction]) {
      buf[off] = 0x07; // RemapMouse
      const [p1, p2, p3] = MOUSE_ACTIONS[r.mouseAction].params;
      buf[off + 1] = p1;
      buf[off + 2] = p2;
      buf[off + 3] = p3;
    }
  }

  // Trailer 0x55AA (little-endian: AA 55 on wire)
  buf[REMAP_BUF_SIZE - 2] = 0xaa;
  buf[REMAP_BUF_SIZE - 1] = 0x55;

  const nPackets = Math.ceil(REMAP_BUF_SIZE / REPORT_SIZE);
  for (let i = 0; i < nPackets; i++) {
    const pkt = new Uint8Array(REPORT_SIZE);
    pkt.set(buf.subarray(i * REPORT_SIZE, (i + 1) * REPORT_SIZE));
    packets.push({
      name: `Remap Data Packet ${i + 1}/${nPackets}`,
      packet: pkt,
      readback: false,
    });
  }

  packets.push({ name: 'Remap Apply (04 02)', packet: cmdApply(), readback: true });
  packets.push({ name: 'Remap Finalize (04 F0)', packet: cmdFinalize(), readback: true });

  const fnFlag = isFnLayer ? ' --fn' : '';
  const cliCommand = remaps.length === 0
    ? `f108-pro remap${fnFlag} --reset`
    : `f108-pro remap${fnFlag} ${remaps.map((r) => `${r.sourceKey} ${r.targetKey || r.consumerAction || r.mouseAction}`).join(' ')}`;

  return { packets, cliCommand };
}

export function buildClockSyncPackets(d: Date): { packets: AulaPacket[]; cliCommand: string } {
  const packets: AulaPacket[] = [];

  packets.push({ name: 'Clock Sync Begin (04 18)', packet: cmdBegin(), readback: true });

  const init = new Uint8Array(REPORT_SIZE);
  init[0] = 0x04;
  init[1] = 0x28;
  init[8] = 0x01;
  packets.push({ name: 'Clock Sync Init (04 28)', packet: init, readback: true });

  const data = new Uint8Array(REPORT_SIZE);
  data[0] = 0x00;
  data[1] = 0x01; // Profile 1
  data[2] = 0x5a; // Magic marker
  data[3] = d.getFullYear() % 100; // e.g. 26
  data[4] = d.getMonth() + 1; // 1-12
  data[5] = d.getDate(); // 1-31
  data[6] = d.getHours(); // 0-23
  data[7] = d.getMinutes(); // 0-59
  data[8] = d.getSeconds(); // 0-59
  data[10] = d.getDay(); // 0=Sunday
  data[62] = 0xaa; // Trailer AA 55
  data[63] = 0x55;
  packets.push({ name: `Clock Data (${d.toLocaleTimeString()})`, packet: data, readback: true });

  packets.push({ name: 'Clock Sync Apply (04 02)', packet: cmdApply(), readback: true });

  return { packets, cliCommand: 'f108-pro clock' };
}

export function rgb888ToRgb565(r: number, g: number, b: number): number {
  return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

export function buildLcdImageBuffer(
  framesRgb: Uint8ClampedArray[],
  delaysCentisec: number[]
): { buffer: Uint8Array; pageCount: number; frameCount: number; error?: string } {
  const frameCount = framesRgb.length;
  if (frameCount > 255) {
    return { buffer: new Uint8Array(0), pageCount: 0, frameCount, error: 'Maximum 255 frames supported' };
  }
  if (frameCount > MAX_LCD_SAFE_FRAMES) {
    return {
      buffer: new Uint8Array(0),
      pageCount: 0,
      frameCount,
      error: `SAFETY GUARD: ${frameCount} frames exceeds the 141 safe frame limit. Exceeding 141 frames permanently corrupts the keyboard menu graphics!`,
    };
  }

  const HEADER_LEN = 256;
  const FRAME_BYTES = LCD_WIDTH * LCD_HEIGHT * 2; // 64800 bytes
  const totalSize = HEADER_LEN + FRAME_BYTES * frameCount;
  const pageCount = Math.ceil(totalSize / LCD_PAGE_SIZE);
  const paddedSize = pageCount * LCD_PAGE_SIZE;

  const buf = new Uint8Array(paddedSize);
  buf.fill(0xff);

  buf[0] = frameCount;
  for (let i = 0; i < frameCount; i++) {
    const delay = delaysCentisec[i] || 10;
    const d = Math.max(1, Math.min(255, Math.floor(delay / 2)));
    buf[1 + i] = d;
  }

  // Write pixel data for each frame
  for (let f = 0; f < frameCount; f++) {
    const rawRgba = framesRgb[f];
    const frameOffset = HEADER_LEN + f * FRAME_BYTES;
    for (let i = 0; i < LCD_WIDTH * LCD_HEIGHT; i++) {
      const r = rawRgba[i * 4];
      const g = rawRgba[i * 4 + 1];
      const b = rawRgba[i * 4 + 2];
      const px = rgb888ToRgb565(r, g, b);
      const pxOffset = frameOffset + i * 2;
      // Little-endian
      buf[pxOffset] = px & 0xff;
      buf[pxOffset + 1] = (px >> 8) & 0xff;
    }
  }

  return { buffer: buf, pageCount, frameCount };
}

// WebHID Controller with Automatic Interface 3 Detection & Standalone Support
export class AulaDeviceController {
  private hidDevice: any = null;
  private lcdDevice: any = null;
  private logs: HidPacketLog[] = [];
  private onLogsChanged?: (logs: HidPacketLog[]) => void;
  private onStatusChanged?: () => void;
  public isSimulated: boolean = true;
  public lang: Language = 'tr';
  private isLcdUploading: boolean = false;
  private lcdAbortController: AbortController | null = null;

  constructor(
    onLogsChanged?: (logs: HidPacketLog[]) => void,
    onStatusChanged?: () => void
  ) {
    this.onLogsChanged = onLogsChanged;
    this.onStatusChanged = onStatusChanged;
  }

  public setLanguage(lang: Language): void {
    this.lang = lang;
  }

  public get isConnected(): boolean {
    return this.hidDevice !== null && this.hidDevice.opened;
  }

  public get isWebHidSupported(): boolean {
    return typeof navigator !== 'undefined' && 'hid' in navigator;
  }

  public get isConfigInterfaceConnected(): boolean {
    return this.hidDevice !== null && this.hidDevice.opened;
  }

  public get isLcdInterfaceConnected(): boolean {
    return this.lcdDevice !== null && this.lcdDevice.opened;
  }

  public get deviceName(): string {
    if (this.hidDevice) {
      return this.hidDevice.productName || 'Aula F108 Pro (USB)';
    }
    return this.isSimulated ? 'Simulated Aula F108 Pro (0x0C45:0x800A)' : 'Disconnected';
  }

  /**
   * Safe wrapper for receiving feature reports with strict timeout to prevent UI freezes.
   */
  private async safeReceiveFeatureReport(
    device: any,
    reportId: number = 0,
    timeoutMs: number = 600
  ): Promise<DataView | null> {
    if (!device || !device.receiveFeatureReport) return null;
    try {
      const readPromise = device.receiveFeatureReport(reportId);
      let timer: any = null;
      const timeoutPromise = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      });
      const result = await Promise.race([readPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Safe wrapper for sending feature reports with timeout.
   */
  private async safeSendFeatureReport(
    device: any,
    reportId: number,
    data: Uint8Array,
    timeoutMs: number = 1000
  ): Promise<boolean> {
    if (!device || !device.sendFeatureReport) return false;
    try {
      let timer: any = null;
      const sendPromise = device.sendFeatureReport(reportId, data);
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Feature Report write timeout')), timeoutMs);
      });
      await Promise.race([sendPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);
      return true;
    } catch (e: any) {
      this.addLog('RX', `Feature report hatası: ${e.message}`, [0xff]);
      return false;
    }
  }

  /**
   * Safe wrapper for sending Output Reports (Interface 2 4096-byte pages) with timeout.
   */
  private async safeSendReport(
    device: any,
    reportId: number,
    data: Uint8Array,
    timeoutMs: number = 1500
  ): Promise<boolean> {
    if (!device || !device.sendReport) return false;
    try {
      let timer: any = null;
      const sendPromise = device.sendReport(reportId, data);
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Output Report write timeout')), timeoutMs);
      });
      await Promise.race([sendPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);
      return true;
    } catch (e: any) {
      this.addLog('RX', `LCD Output report hatası: ${e.message}`, [0xff]);
      return false;
    }
  }

  /**
   * Cancels any ongoing LCD image upload immediately and safely.
   */
  public cancelLcdUpload(): void {
    if (this.lcdAbortController) {
      this.lcdAbortController.abort();
      this.lcdAbortController = null;
    }
    this.isLcdUploading = false;
    this.addLog(
      'RX',
      this.lang === 'tr'
        ? 'LCD aktarımı kullanıcı tarafından güvenle iptal edildi.'
        : 'LCD transfer was safely cancelled by user.',
      [0x00]
    );
    this.onStatusChanged?.();
  }

  /**
   * Finds Interface 3 (Configuration Endpoint, 0xFF13) among candidate HID devices.
   */
  public findConfigurationDevice(devices: any[]): any {
    if (!devices || devices.length === 0) return null;

    const aulaDevices = devices.filter((d: any) =>
      (d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID) || d.vendorId === VENDOR_ID
    );
    const pool = aulaDevices.length > 0 ? aulaDevices : devices;

    // 1. Interface 3 uses vendor Usage Page 0xFF13 (65299)
    let target = pool.find((d: any) =>
      d.collections?.some((c: any) => c.usagePage === 0xff13 || c.usagePage === 65299)
    );
    if (target) return target;

    // 2. Or device with collections that have featureReports with length 64
    target = pool.find((d: any) =>
      d.collections?.some((c: any) => c.featureReports && c.featureReports.length > 0)
    );
    if (target) return target;

    // 3. Fallback: skip interface 0 (standard keyboard has usagePage 0x01, usage 0x06)
    target = pool.find((d: any) =>
      !d.collections?.some((c: any) => c.usagePage === 0x01 && c.usage === 0x06)
    );
    if (target) return target;

    return pool[0];
  }

  /**
   * Finds Interface 2 (LCD Data Endpoint, 0xFF68) for 4096-byte Output Reports.
   */
  public findLcdDevice(devices: any[]): any {
    if (!devices || devices.length === 0) return null;
    const aulaDevices = devices.filter((d: any) =>
      (d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID) || d.vendorId === VENDOR_ID
    );
    const pool = aulaDevices.length > 0 ? aulaDevices : devices;

    let target = pool.find((d: any) =>
      d.collections?.some((c: any) => c.usagePage === 0xff68 || c.usagePage === 65384)
    );
    if (target) return target;

    target = pool.find((d: any) =>
      d.collections?.some((c: any) => c.outputReports && c.outputReports.some((r: any) => r.reportLength >= 4096))
    );
    return target || null;
  }

  /**
   * Tries to automatically connect if device permission was already granted previously.
   */
  public async tryAutoConnect(lang?: Language): Promise<boolean> {
    const l = lang || this.lang;
    if (!this.isWebHidSupported) return false;
    try {
      const devices = await (navigator as any).hid.getDevices();
      const target = this.findConfigurationDevice(devices);
      if (target) {
        this.hidDevice = target;
        if (!this.hidDevice.opened) {
          await this.hidDevice.open();
        }
        // Also find and open LCD device (Interface 2)
        const lcd = this.findLcdDevice(devices);
        if (lcd) {
          this.lcdDevice = lcd;
          if (!this.lcdDevice.opened) {
            try {
              await this.lcdDevice.open();
            } catch (err: any) {
              console.warn('Interface 2 auto-open warning:', err);
            }
          }
        }
        this.isSimulated = false;
        const hasLcd = this.lcdDevice && this.lcdDevice.opened;
        this.addLog(
          'RX',
          l === 'tr'
            ? `Otomatik Bağlantı Kuruldu: ${this.hidDevice.productName || 'Aula F108 Pro'} [Arayüz 3: Hazır, Arayüz 2 LCD: ${hasLcd ? 'Hazır' : 'Ayrılmış'}]`
            : `Auto-Connected: ${this.hidDevice.productName || 'Aula F108 Pro'} [Interface 3: Ready, Interface 2 LCD: ${hasLcd ? 'Ready' : 'Detached'}]`,
          [0x04, 0x18]
        );
        this.onStatusChanged?.();
        return true;
      }
    } catch {
      // Ignored for auto-connect
    }
    return false;
  }

  public async connect(lang?: Language): Promise<{ success: boolean; message: string }> {
    const l = lang || this.lang;
    if (!this.isWebHidSupported) {
      this.isSimulated = true;
      this.addLog(
        'RX',
        l === 'tr' ? 'WebHID API desteklenmiyor; Simülatör aktif.' : 'WebHID API not supported; Simulator mode active.',
        [0]
      );
      this.onStatusChanged?.();
      return {
        success: false,
        message:
          l === 'tr'
            ? 'Tarayıcınız WebHID API desteklemiyor. Lütfen Chrome, Chromium, Brave veya Edge kullanın.'
            : 'Your browser does not support the WebHID API. Please use Chrome, Chromium, Brave, or Edge.',
      };
    }

    try {
      // Request device access from user
      await (navigator as any).hid.requestDevice({
        filters: [
          { vendorId: VENDOR_ID, productId: PRODUCT_ID },
          { vendorId: VENDOR_ID },
        ],
      });

      // Get all permitted devices (includes all 4 USB interfaces of the device)
      const allDevices = await (navigator as any).hid.getDevices();
      const targetDevice = this.findConfigurationDevice(allDevices);
      const lcdCandidate = this.findLcdDevice(allDevices);

      if (!targetDevice) {
        return {
          success: false,
          message:
            l === 'tr'
              ? 'Aula F108 Pro klavyesi bulunamadı veya seçim iptal edildi.'
              : 'Aula F108 Pro keyboard not found or connection cancelled.',
        };
      }

      this.hidDevice = targetDevice;
      if (!this.hidDevice.opened) {
        await this.hidDevice.open();
      }

      if (lcdCandidate) {
        this.lcdDevice = lcdCandidate;
        if (!this.lcdDevice.opened) {
          try {
            await this.lcdDevice.open();
          } catch (e: any) {
            console.warn('Interface 2 (LCD) open warning:', e);
          }
        }
      }

      this.isSimulated = false;
      const hasLcd = this.lcdDevice && this.lcdDevice.opened;
      this.addLog(
        'RX',
        l === 'tr'
          ? `Klavye Doğrudan Bağlandı: ${this.hidDevice.productName || 'Aula F108 Pro'} [Arayüz 3: Aktif, Arayüz 2 (LCD): ${hasLcd ? 'Aktif' : 'Ayrılmış'}]`
          : `Keyboard Connected Directly: ${this.hidDevice.productName || 'Aula F108 Pro'} [Interface 3: Active, Interface 2 (LCD): ${hasLcd ? 'Active' : 'Detached'}]`,
        [0x04, 0x18]
      );
      this.onStatusChanged?.();
      return {
        success: true,
        message:
          l === 'tr'
            ? `Aula F108 Pro bağlandı! (Arayüz 3 Yapılandırma: Hazır${hasLcd ? ', Arayüz 2 LCD: Hazır' : ''})`
            : `Aula F108 Pro connected! (Interface 3 Config: Ready${hasLcd ? ', Interface 2 LCD: Ready' : ''})`,
      };
    } catch (err: any) {
      const isPolicyError =
        err.message &&
        (err.message.includes('permissions policy') ||
          err.message.includes('Permissions policy') ||
          err.message.includes('disallowed by permissions policy'));
      const userMessage = isPolicyError
        ? l === 'tr'
          ? 'İframe içinde WebHID erişimi tarayıcı güvenlik kuralı nedeniyle engellidir. Klavyeye doğrudan bağlanmak için lütfen üstteki "Yeni Sekmede Aç" butonuna tıklayın.'
          : 'WebHID access inside iframe is blocked by browser permissions policy. To connect directly to your keyboard, please click the "Open in New Tab" button above.'
        : err.message || (l === 'tr' ? 'Bağlantı hatası oluştu.' : 'A connection error occurred.');

      this.addLog('RX', l === 'tr' ? `Bağlantı hatası: ${userMessage}` : `Connection error: ${userMessage}`, [0xff]);
      this.isSimulated = true;
      this.onStatusChanged?.();
      return { success: false, message: userMessage };
    }
  }

  public disconnect(): void {
    if (this.lcdAbortController) {
      this.lcdAbortController.abort();
      this.lcdAbortController = null;
    }
    this.isLcdUploading = false;
    if (this.lcdDevice && this.lcdDevice.opened) {
      try {
        this.lcdDevice.close();
      } catch {}
    }
    this.lcdDevice = null;
    if (this.hidDevice && this.hidDevice.opened) {
      try {
        this.hidDevice.close();
      } catch {}
    }
    this.hidDevice = null;
    this.isSimulated = true;
    this.addLog(
      'RX',
      this.lang === 'tr' ? 'Bağlantı kesildi. Simülatör moduna geçildi.' : 'Disconnected. Switched to Simulator mode.',
      [0x00]
    );
    this.onStatusChanged?.();
  }

  public addLog(type: 'TX' | 'RX', description: string, bytes: number[] | Uint8Array): void {
    const arr = Array.from(bytes);
    const newLog: HidPacketLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      description,
      bytes: arr,
      hexString: bytesToHex(arr),
    };
    this.logs = [newLog, ...this.logs.slice(0, 49)];
    this.onLogsChanged?.(this.logs);
  }

  public getLogs(): HidPacketLog[] {
    return this.logs;
  }

  public clearLogs(): void {
    this.logs = [];
    this.onLogsChanged?.([]);
  }

  /**
   * Sends packet sequence directly to the physical keyboard via WebHID with readback ACK handling.
   */
  public async sendPackets(
    packets: AulaPacket[],
    onProgress?: (index: number, total: number) => void,
    lang?: Language
  ): Promise<{ success: boolean; message: string }> {
    const l = lang || this.lang;
    // If not connected, attempt auto-connect or prompt
    if (!this.isConnected) {
      const autoOk = await this.tryAutoConnect(l);
      if (!autoOk) {
        const connRes = await this.connect(l);
        if (!connRes.success) {
          return { success: false, message: connRes.message };
        }
      }
    }

    if (!this.isConnected || !this.hidDevice) {
      return {
        success: false,
        message: l === 'tr' ? 'Klavye bağlı değil. Lütfen önce klavyenizi seçin.' : 'Keyboard is not connected. Please connect your keyboard first.',
      };
    }

    try {
      for (let i = 0; i < packets.length; i++) {
        const { name, packet, readback } = packets[i];
        this.addLog('TX', name, packet);

        // Send 64-byte feature report (Report ID 0)
        await this.hidDevice.sendFeatureReport(0, packet);
        await new Promise((r) => setTimeout(r, 35));

        // Readback ACK if required by protocol
        if (readback) {
          try {
            const readPromise = this.hidDevice.receiveFeatureReport(0);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 200)
            );
            const response = (await Promise.race([readPromise, timeoutPromise])) as DataView;
            if (response && response.buffer) {
              const ackBytes = new Uint8Array(response.buffer);
              this.addLog('RX', `ACK [${name}]`, ackBytes);
            }
          } catch {
            // Non-fatal if readback times out, continue sequence
          }
          await new Promise((r) => setTimeout(r, 35));
        }

        onProgress?.(i + 1, packets.length);
      }

      return {
        success: true,
        message: l === 'tr' ? 'Komutlar klavyeye başarıyla uygulandı!' : 'Commands applied successfully to keyboard!',
      };
    } catch (e: any) {
      this.addLog('RX', l === 'tr' ? `Gönderim hatası: ${e.message}` : `Transmission error: ${e.message}`, [0xff]);
      return { success: false, message: l === 'tr' ? `Hata: ${e.message}` : `Error: ${e.message}` };
    }
  }

  /**
   * Uploads raw LCD image buffer (240x135 RGB565) to keyboard with real-time progress percentage.
   * Enforces Interface 2 Output Reports with 800ms watchdog timeouts and cancel support.
   */
  public async uploadLcdImage(
    buf: Uint8Array,
    imageNumber: number = 1,
    onProgress?: (sent: number, total: number, percent: number) => void,
    lang?: Language
  ): Promise<{ success: boolean; message: string }> {
    const l = lang || this.lang;
    if (!this.isConnected) {
      const autoOk = await this.tryAutoConnect(l);
      if (!autoOk) {
        const connRes = await this.connect(l);
        if (!connRes.success) {
          return { success: false, message: connRes.message };
        }
      }
    }

    if (!this.isConnected || !this.hidDevice) {
      return {
        success: false,
        message: l === 'tr' ? 'Klavye bağlı değil.' : 'Keyboard is not connected.',
      };
    }

    // Try finding and opening Interface 2 (LCD Data interface) if not already opened
    if (!this.lcdDevice || !this.lcdDevice.opened) {
      try {
        const allDevices = await (navigator as any).hid.getDevices();
        const foundLcd = this.findLcdDevice(allDevices);
        if (foundLcd) {
          this.lcdDevice = foundLcd;
          if (!this.lcdDevice.opened) {
            await this.lcdDevice.open();
          }
        }
      } catch (e: any) {
        console.warn('LCD device lookup error:', e);
      }
    }

    // HARD SAFETY GUARD:
    // Sending 4096-byte control packets to Interface 3 crashes the MCU firmware.
    // If Interface 2 is not available, we refuse to execute rather than crashing the keyboard!
    if (!this.lcdDevice || !this.lcdDevice.opened) {
      this.addLog(
        'RX',
        l === 'tr'
          ? 'GÜVENLİK KORUMASI: Arayüz 2 (0xFF68 LCD Veri Hattı) bulunamadı. Klavye firmware kilitlenmesini önlemek için aktarım engellendi.'
          : 'SAFETY GUARD: Interface 2 (0xFF68 LCD Data Stream) not found. Transfer blocked to prevent keyboard firmware hang.',
        [0xff, 0x68]
      );
      return {
        success: false,
        message:
          l === 'tr'
            ? 'Güvenlik Koruması Devrede: Arayüz 2 (LCD Veri Hattı) açık değil. Klavyenizin kilitlenmemesi için 4096 baytlık veri Kontrol hattına gönderilmedi. Lütfen üstteki "Klavyeyi Bağla" butonuna basarak tüm arayüz izinlerini yenileyin veya hazırlanan .bin dosyasını Linux terminaliyle (f108-pro lcd) yükleyin.'
            : 'Safety Guard Active: Interface 2 (LCD Data Stream) is not open. 4096-byte transfer to Control line was blocked to prevent MCU hang. Please click "Connect Keyboard" above to approve all interface permissions or flash the generated .bin via Linux terminal (f108-pro lcd).',
      };
    }

    const pageCount = Math.ceil(buf.length / LCD_PAGE_SIZE);
    if (pageCount === 0) {
      return {
        success: false,
        message: l === 'tr' ? 'Görsel tamponu boş.' : 'Image buffer is empty.',
      };
    }

    if (pageCount > 2231) {
      return {
        success: false,
        message:
          l === 'tr'
            ? 'GÜVENLİK KORUMASI: 141 kareden (2231 sayfa) büyük veri flash menü grafiklerini bozabileceği için engellendi.'
            : 'SAFETY GUARD: Data larger than 141 frames (2231 pages) blocked to avoid corrupting flash menu graphics.',
      };
    }

    this.isLcdUploading = true;
    this.lcdAbortController = new AbortController();
    const signal = this.lcdAbortController.signal;

    try {
      // Step 1: Begin (Feature Report on Interface 3)
      this.addLog('TX', 'LCD Begin (04 18)', cmdBegin());
      const beginSent = await this.safeSendFeatureReport(this.hidDevice, 0, cmdBegin(), 1000);
      if (!beginSent) {
        throw new Error(l === 'tr' ? 'LCD Begin (04 18) komutu gönderilemedi.' : 'Failed to send LCD Begin (04 18) command.');
      }
      await new Promise((r) => setTimeout(r, 40));
      await this.safeReceiveFeatureReport(this.hidDevice, 0, 600);

      if (signal.aborted) throw new Error(l === 'tr' ? 'Aktarım kullanıcı tarafından durduruldu.' : 'Transfer was cancelled by user.');

      // Step 2: Image Header 04 72 (Feature Report on Interface 3)
      const hdr = new Uint8Array(64);
      hdr[0] = 0x04;
      hdr[1] = 0x72;
      hdr[2] = imageNumber; // Slot 1
      hdr[8] = pageCount & 0xff;
      hdr[9] = (pageCount >> 8) & 0xff;
      this.addLog('TX', `LCD Header (04 72, ${pageCount} ${l === 'tr' ? 'sayfa' : 'pages'})`, hdr);
      const hdrSent = await this.safeSendFeatureReport(this.hidDevice, 0, hdr, 1000);
      if (!hdrSent) {
        throw new Error(l === 'tr' ? 'LCD Header (04 72) komutu gönderilemedi.' : 'Failed to send LCD Header (04 72) command.');
      }
      await new Promise((r) => setTimeout(r, 50));
      await this.safeReceiveFeatureReport(this.hidDevice, 0, 600);

      if (signal.aborted) throw new Error(l === 'tr' ? 'Aktarım kullanıcı tarafından durduruldu.' : 'Transfer was cancelled by user.');

      // Step 3: Send 4096-byte pages strictly via Interface 2 Output Reports
      for (let i = 0; i < pageCount; i++) {
        if (signal.aborted) {
          throw new Error(l === 'tr' ? 'Aktarım kullanıcı tarafından durduruldu.' : 'Transfer was cancelled by user.');
        }

        const start = i * LCD_PAGE_SIZE;
        const end = start + LCD_PAGE_SIZE;
        let pageData = buf.subarray(start, end);
        if (pageData.length < LCD_PAGE_SIZE) {
          const padded = new Uint8Array(LCD_PAGE_SIZE);
          padded.fill(0xff);
          padded.set(pageData);
          pageData = padded;
        }

        // Setup Input Report ACK listener on Interface 2 before writing (with 800ms watchdog)
        let ackTimer: any = null;
        let ackHandler: any = null;
        const ackPromise = new Promise<boolean>((resolve) => {
          ackHandler = (_event: any) => {
            if (ackTimer) clearTimeout(ackTimer);
            try { this.lcdDevice?.removeEventListener('inputreport', ackHandler); } catch {}
            resolve(true);
          };
          try {
            this.lcdDevice.addEventListener('inputreport', ackHandler);
          } catch {
            resolve(true);
          }
          ackTimer = setTimeout(() => {
            try { this.lcdDevice?.removeEventListener('inputreport', ackHandler); } catch {}
            resolve(false); // Fail-safe: don't hang, proceed smoothly
          }, 800);
        });

        // Send 4096-byte Output report
        const pageSent = await this.safeSendReport(this.lcdDevice, 0, pageData, 1500);
        if (!pageSent) {
          if (ackTimer) clearTimeout(ackTimer);
          try { this.lcdDevice?.removeEventListener('inputreport', ackHandler); } catch {}
          throw new Error(
            l === 'tr'
              ? `Sayfa ${i + 1}/${pageCount} iletim hatası. Arayüz 2 yazımı başarısız oldu.`
              : `Page ${i + 1}/${pageCount} transmission error. Interface 2 write failed.`
          );
        }

        // Await ACK with 800ms watchdog (non-blocking if keyboard responds fast or silently)
        await ackPromise;

        // Progress calculation: update smoothly
        const percent = Math.min(99, Math.round(((i + 1) / pageCount) * 100));
        onProgress?.(i + 1, pageCount, percent);

        // Inter-page delay (30ms) for SPI flash write cycle
        await new Promise((r) => setTimeout(r, 30));
      }

      if (signal.aborted) throw new Error(l === 'tr' ? 'Aktarım kullanıcı tarafından durduruldu.' : 'Transfer was cancelled by user.');

      // Step 4: Settle delay for SPI flash before final commit
      await new Promise((r) => setTimeout(r, 350));

      // Step 5: Apply (04 02 Feature Report on Interface 3)
      this.addLog('TX', 'LCD Apply (04 02)', cmdApply());
      await this.safeSendFeatureReport(this.hidDevice, 0, cmdApply(), 1000);
      await new Promise((r) => setTimeout(r, 60));
      await this.safeReceiveFeatureReport(this.hidDevice, 0, 800);

      // Step 6: Finalize (04 F0 Feature Report on Interface 3)
      const finPacket = new Uint8Array(64);
      finPacket[0] = 0x04;
      finPacket[1] = 0xf0;
      await this.safeSendFeatureReport(this.hidDevice, 0, finPacket, 800);

      // Reached 100%
      onProgress?.(pageCount, pageCount, 100);

      this.addLog(
        'RX',
        l === 'tr'
          ? `LCD Görsel Aktarımı Başarıyla Tamamlandı (${pageCount} sayfa)`
          : `LCD Image Transfer Completed Successfully (${pageCount} pages)`,
        [0x01, 0x5a, 0x02, 0x00]
      );
      return {
        success: true,
        message:
          l === 'tr'
            ? `LCD ekran görseli (${pageCount} sayfa) klavyeye başarıyla yüklendi!`
            : `LCD screen image (${pageCount} pages) uploaded successfully to keyboard!`,
      };
    } catch (err: any) {
      this.addLog('RX', l === 'tr' ? `LCD Yükleme Durumu: ${err.message}` : `LCD Upload Status: ${err.message}`, [0xff]);
      return {
        success: false,
        message: err.message || (l === 'tr' ? 'LCD yükleme işlemi kesildi.' : 'LCD upload was interrupted.'),
      };
    } finally {
      this.isLcdUploading = false;
      this.lcdAbortController = null;
    }
  }
}
