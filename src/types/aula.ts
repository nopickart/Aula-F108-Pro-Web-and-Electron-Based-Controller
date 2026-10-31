export type LightingModeId =
  | 0  // Off
  | 1  // Static
  | 2  // SingleOn
  | 3  // SingleOff
  | 4  // Glittering
  | 5  // Falling
  | 6  // Colourful
  | 7  // Breath
  | 8  // Spectrum
  | 9  // Outward
  | 10 // Scrolling
  | 11 // Rolling
  | 12 // Rotating
  | 13 // Explode
  | 14 // Launch
  | 15 // Ripples
  | 16 // Flowing
  | 17 // Pulsating
  | 18 // Tilt
  | 19 // Shuttle

export interface LightingModeInfo {
  id: LightingModeId;
  name: string;
  nameTr?: string;
  description: string;
  descriptionTr?: string;
  hasColor: boolean;
  hasSpeed: boolean;
  hasDirection: boolean;
  isRainbow: boolean;
}

export interface LightingConfig {
  mode: LightingModeId;
  r: number;
  g: number;
  b: number;
  brightness: number; // 0-5
  speed: number;      // 0-5
  direction: number;  // 0 or 1
  colorful: boolean;
}

export interface KeyDef {
  code: string;       // human name e.g. "w", "capslock"
  label: string;      // UI display label
  subLabel?: string;
  lightIndex: number; // 1-143 light index on F108 Pro
  hidCode: number;    // USB HID Usage ID (page 0x07)
  width?: number;     // keycap width unit (1 = standard 1u, 1.25, 1.5, 1.75, 2, 2.25, 2.75, 6.25)
  height?: number;
  row: number;        // row in visual layout (0-5)
  col: number;        // col in visual layout
  group: 'function' | 'nav' | 'numpad' | 'alpha' | 'modifier' | 'media';
}

export type RemapActionType =
  | 'none'      // 0x00
  | 'key'       // 0x02: Key swap or combo
  | 'consumer'  // 0x03: Media keys
  | 'mouse'     // 0x07: Mouse clicks/scroll
  | 'special';  // 0x01: Special

export interface KeyRemapRule {
  sourceKey: string;   // key name e.g. "capslock"
  action: RemapActionType;
  targetKey?: string;  // target HID key for swap
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    win?: boolean;
    rctrl?: boolean;
    rshift?: boolean;
    ralt?: boolean;
    rwin?: boolean;
  };
  consumerAction?: string; // "play", "volup", "voldown", etc.
  mouseAction?: string;    // "lclick", "rclick", "scrollup", etc.
}

export interface HidPacketLog {
  id: string;
  timestamp: string;
  type: 'TX' | 'RX';
  description: string;
  bytes: number[];
  hexString: string;
}

export interface DeviceConnectionState {
  isConnected: boolean;
  isWebHidSupported: boolean;
  isSimulated: boolean;
  deviceName?: string;
  vendorId?: number;
  productId?: number;
}
