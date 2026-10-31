import { KeyDef, LightingModeInfo, LightingModeId } from '../types/aula';

export const VENDOR_ID = 0x0C45;
export const PRODUCT_ID = 0x800A;

export const LIGHTING_MODES: LightingModeInfo[] = [
  { id: 0, name: 'Off', description: 'Backlight turned off completely', hasColor: false, hasSpeed: false, hasDirection: false, isRainbow: false },
  { id: 1, name: 'Static', description: 'Constant solid color without animation', hasColor: true, hasSpeed: false, hasDirection: false, isRainbow: false },
  { id: 2, name: 'SingleOn', description: 'Keys light up when pressed then fade out', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 3, name: 'SingleOff', description: 'Backlight stays on, keys dim when pressed', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 4, name: 'Glittering', description: 'Subtle twinkling starlight across keys', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 5, name: 'Falling', description: 'Raindrop cascades descending down the keyboard', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 6, name: 'Colourful', description: 'Dynamic full-spectrum multi-color pattern', hasColor: false, hasSpeed: true, hasDirection: false, isRainbow: true },
  { id: 7, name: 'Breath', description: 'Smooth pulsing breathing light effect', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 8, name: 'Spectrum', description: 'Continuous cycling through the color spectrum', hasColor: false, hasSpeed: true, hasDirection: false, isRainbow: true },
  { id: 9, name: 'Outward', description: 'Radial expansion emitting outward from center', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 10, name: 'Scrolling', description: 'Horizontal color wave scrolling left or right', hasColor: true, hasSpeed: true, hasDirection: true, isRainbow: false },
  { id: 11, name: 'Rolling', description: 'Vertical rolling rainbow or color wave', hasColor: true, hasSpeed: true, hasDirection: true, isRainbow: false },
  { id: 12, name: 'Rotating', description: 'Circular rotating color vortex', hasColor: true, hasSpeed: true, hasDirection: true, isRainbow: false },
  { id: 13, name: 'Explode', description: 'Keys trigger bursting light waves upon strike', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 14, name: 'Launch', description: 'Vertical light trail shooting up from pressed keys', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 15, name: 'Ripples', description: 'Concentric water ripple propagating from pressed key', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 16, name: 'Flowing', description: 'Fluid chromatic streams flowing along the rows', hasColor: true, hasSpeed: true, hasDirection: true, isRainbow: false },
  { id: 17, name: 'Pulsating', description: 'Rhythmic ambient pulse reverberating across keys', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
  { id: 18, name: 'Tilt', description: 'Diagonal wave pattern slanting across key rows', hasColor: true, hasSpeed: true, hasDirection: true, isRainbow: false },
  { id: 19, name: 'Shuttle', description: 'Laser shuttle beam pinging across columns', hasColor: true, hasSpeed: true, hasDirection: false, isRainbow: false },
];

export const CONSUMER_ACTIONS: { [name: string]: { label: string; code: number } } = {
  play: { label: 'Play / Pause', code: 0xCD },
  stop: { label: 'Stop', code: 0xB7 },
  prev: { label: 'Previous Track', code: 0xB6 },
  next: { label: 'Next Track', code: 0xB5 },
  volup: { label: 'Volume Up', code: 0xE9 },
  voldown: { label: 'Volume Down', code: 0xEA },
  mute: { label: 'Mute', code: 0xE2 },
};

export const MOUSE_ACTIONS: { [name: string]: { label: string; params: [number, number, number] } } = {
  lclick: { label: 'Left Click', params: [0x01, 0x00, 0x00] },
  rclick: { label: 'Right Click', params: [0x02, 0x00, 0x00] },
  mclick: { label: 'Middle Click', params: [0x04, 0x00, 0x00] },
  scrollup: { label: 'Scroll Up', params: [0x00, 0x01, 0x00] },
  scrolldn: { label: 'Scroll Down', params: [0x00, 0xFF, 0x00] },
};

// Full 108-Key Aula F108 Pro Key Definitions
export const ALL_KEYS: KeyDef[] = [
  // ROW 0: Esc, F1-F12, PrtSc, ScrLk, Pause, LCD Area / Top 4 Numpad keys
  { code: 'esc', label: 'Esc', lightIndex: 1, hidCode: 0x29, row: 0, col: 0, group: 'function' },
  { code: 'f1', label: 'F1', lightIndex: 2, hidCode: 0x3A, row: 0, col: 2, group: 'function' },
  { code: 'f2', label: 'F2', lightIndex: 3, hidCode: 0x3B, row: 0, col: 3, group: 'function' },
  { code: 'f3', label: 'F3', lightIndex: 4, hidCode: 0x3C, row: 0, col: 4, group: 'function' },
  { code: 'f4', label: 'F4', lightIndex: 5, hidCode: 0x3D, row: 0, col: 5, group: 'function' },
  { code: 'f5', label: 'F5', lightIndex: 6, hidCode: 0x3E, row: 0, col: 6.5, group: 'function' },
  { code: 'f6', label: 'F6', lightIndex: 7, hidCode: 0x3F, row: 0, col: 7.5, group: 'function' },
  { code: 'f7', label: 'F7', lightIndex: 8, hidCode: 0x40, row: 0, col: 8.5, group: 'function' },
  { code: 'f8', label: 'F8', lightIndex: 9, hidCode: 0x41, row: 0, col: 9.5, group: 'function' },
  { code: 'f9', label: 'F9', lightIndex: 10, hidCode: 0x42, row: 0, col: 11, group: 'function' },
  { code: 'f10', label: 'F10', lightIndex: 11, hidCode: 0x43, row: 0, col: 12, group: 'function' },
  { code: 'f11', label: 'F11', lightIndex: 12, hidCode: 0x44, row: 0, col: 13, group: 'function' },
  { code: 'f12', label: 'F12', lightIndex: 13, hidCode: 0x45, row: 0, col: 14, group: 'function' },
  { code: 'printscreen', label: 'PrtSc', lightIndex: 112, hidCode: 0x46, row: 0, col: 15.5, group: 'nav' },
  { code: 'scrolllock', label: 'ScrLk', lightIndex: 113, hidCode: 0x47, row: 0, col: 16.5, group: 'nav' },
  { code: 'pause', label: 'Pause', lightIndex: 115, hidCode: 0x48, row: 0, col: 17.5, group: 'nav' },

  // ROW 1: Number Row
  { code: 'grave', label: '~', subLabel: '`', lightIndex: 19, hidCode: 0x35, row: 1, col: 0, group: 'alpha' },
  { code: '1', label: '1', subLabel: '!', lightIndex: 20, hidCode: 0x1E, row: 1, col: 1, group: 'alpha' },
  { code: '2', label: '2', subLabel: '@', lightIndex: 21, hidCode: 0x1F, row: 1, col: 2, group: 'alpha' },
  { code: '3', label: '3', subLabel: '#', lightIndex: 22, hidCode: 0x20, row: 1, col: 3, group: 'alpha' },
  { code: '4', label: '4', subLabel: '$', lightIndex: 23, hidCode: 0x21, row: 1, col: 4, group: 'alpha' },
  { code: '5', label: '5', subLabel: '%', lightIndex: 24, hidCode: 0x22, row: 1, col: 5, group: 'alpha' },
  { code: '6', label: '6', subLabel: '^', lightIndex: 25, hidCode: 0x23, row: 1, col: 6, group: 'alpha' },
  { code: '7', label: '7', subLabel: '&', lightIndex: 26, hidCode: 0x24, row: 1, col: 7, group: 'alpha' },
  { code: '8', label: '8', subLabel: '*', lightIndex: 27, hidCode: 0x25, row: 1, col: 8, group: 'alpha' },
  { code: '9', label: '9', subLabel: '(', lightIndex: 28, hidCode: 0x26, row: 1, col: 9, group: 'alpha' },
  { code: '0', label: '0', subLabel: ')', lightIndex: 29, hidCode: 0x27, row: 1, col: 10, group: 'alpha' },
  { code: 'minus', label: '-', subLabel: '_', lightIndex: 30, hidCode: 0x2D, row: 1, col: 11, group: 'alpha' },
  { code: 'equal', label: '=', subLabel: '+', lightIndex: 31, hidCode: 0x2E, row: 1, col: 12, group: 'alpha' },
  { code: 'backspace', label: 'Backspace', lightIndex: 103, hidCode: 0x2A, width: 2, row: 1, col: 13, group: 'modifier' },
  { code: 'insert', label: 'Ins', lightIndex: 116, hidCode: 0x49, row: 1, col: 15.5, group: 'nav' },
  { code: 'home', label: 'Home', lightIndex: 117, hidCode: 0x4A, row: 1, col: 16.5, group: 'nav' },
  { code: 'pageup', label: 'PgUp', lightIndex: 118, hidCode: 0x4B, row: 1, col: 17.5, group: 'nav' },
  { code: 'numlock', label: 'Num', lightIndex: 32, hidCode: 0x53, row: 1, col: 19, group: 'numpad' },
  { code: 'numslash', label: '/', lightIndex: 33, hidCode: 0x54, row: 1, col: 20, group: 'numpad' },
  { code: 'numstar', label: '*', lightIndex: 34, hidCode: 0x55, row: 1, col: 21, group: 'numpad' },
  { code: 'numminus', label: '-', lightIndex: 122, hidCode: 0x56, row: 1, col: 22, group: 'numpad' },

  // ROW 2: Tab + QWERTY
  { code: 'tab', label: 'Tab', lightIndex: 37, hidCode: 0x2B, width: 1.5, row: 2, col: 0, group: 'modifier' },
  { code: 'q', label: 'Q', lightIndex: 38, hidCode: 0x14, row: 2, col: 1.5, group: 'alpha' },
  { code: 'w', label: 'W', lightIndex: 39, hidCode: 0x1A, row: 2, col: 2.5, group: 'alpha' },
  { code: 'e', label: 'E', lightIndex: 40, hidCode: 0x08, row: 2, col: 3.5, group: 'alpha' },
  { code: 'r', label: 'R', lightIndex: 41, hidCode: 0x15, row: 2, col: 4.5, group: 'alpha' },
  { code: 't', label: 'T', lightIndex: 42, hidCode: 0x17, row: 2, col: 5.5, group: 'alpha' },
  { code: 'y', label: 'Y', lightIndex: 43, hidCode: 0x1C, row: 2, col: 6.5, group: 'alpha' },
  { code: 'u', label: 'U', lightIndex: 44, hidCode: 0x18, row: 2, col: 7.5, group: 'alpha' },
  { code: 'i', label: 'I', lightIndex: 45, hidCode: 0x0C, row: 2, col: 8.5, group: 'alpha' },
  { code: 'o', label: 'O', lightIndex: 46, hidCode: 0x12, row: 2, col: 9.5, group: 'alpha' },
  { code: 'p', label: 'P', lightIndex: 47, hidCode: 0x13, row: 2, col: 10.5, group: 'alpha' },
  { code: 'lbracket', label: '[', subLabel: '{', lightIndex: 48, hidCode: 0x2F, row: 2, col: 11.5, group: 'alpha' },
  { code: 'rbracket', label: ']', subLabel: '}', lightIndex: 49, hidCode: 0x30, row: 2, col: 12.5, group: 'alpha' },
  { code: 'backslash', label: '\\', subLabel: '|', lightIndex: 67, hidCode: 0x31, width: 1.5, row: 2, col: 13.5, group: 'alpha' },
  { code: 'delete', label: 'Del', lightIndex: 119, hidCode: 0x4C, row: 2, col: 15.5, group: 'nav' },
  { code: 'end', label: 'End', lightIndex: 120, hidCode: 0x4D, row: 2, col: 16.5, group: 'nav' },
  { code: 'pagedown', label: 'PgDn', lightIndex: 121, hidCode: 0x4E, row: 2, col: 17.5, group: 'nav' },
  { code: 'num7', label: '7', lightIndex: 50, hidCode: 0x5F, row: 2, col: 19, group: 'numpad' },
  { code: 'num8', label: '8', lightIndex: 51, hidCode: 0x60, row: 2, col: 20, group: 'numpad' },
  { code: 'num9', label: '9', lightIndex: 52, hidCode: 0x61, row: 2, col: 21, group: 'numpad' },
  { code: 'numplus', label: '+', lightIndex: 123, hidCode: 0x57, height: 2, row: 2, col: 22, group: 'numpad' },

  // ROW 3: CapsLock + ASDF
  { code: 'capslock', label: 'Caps', lightIndex: 55, hidCode: 0x39, width: 1.75, row: 3, col: 0, group: 'modifier' },
  { code: 'a', label: 'A', lightIndex: 56, hidCode: 0x04, row: 3, col: 1.75, group: 'alpha' },
  { code: 's', label: 'S', lightIndex: 57, hidCode: 0x16, row: 3, col: 2.75, group: 'alpha' },
  { code: 'd', label: 'D', lightIndex: 58, hidCode: 0x07, row: 3, col: 3.75, group: 'alpha' },
  { code: 'f', label: 'F', lightIndex: 59, hidCode: 0x09, row: 3, col: 4.75, group: 'alpha' },
  { code: 'g', label: 'G', lightIndex: 60, hidCode: 0x0A, row: 3, col: 5.75, group: 'alpha' },
  { code: 'h', label: 'H', lightIndex: 61, hidCode: 0x0B, row: 3, col: 6.75, group: 'alpha' },
  { code: 'j', label: 'J', lightIndex: 62, hidCode: 0x0D, row: 3, col: 7.75, group: 'alpha' },
  { code: 'k', label: 'K', lightIndex: 63, hidCode: 0x0E, row: 3, col: 8.75, group: 'alpha' },
  { code: 'l', label: 'L', lightIndex: 64, hidCode: 0x0F, row: 3, col: 9.75, group: 'alpha' },
  { code: 'semicolon', label: ';', subLabel: ':', lightIndex: 65, hidCode: 0x33, row: 3, col: 10.75, group: 'alpha' },
  { code: 'quote', label: '\'', subLabel: '"', lightIndex: 66, hidCode: 0x34, row: 3, col: 11.75, group: 'alpha' },
  { code: 'enter', label: 'Enter', lightIndex: 85, hidCode: 0x28, width: 2.25, row: 3, col: 12.75, group: 'modifier' },
  { code: 'num4', label: '4', lightIndex: 68, hidCode: 0x5C, row: 3, col: 19, group: 'numpad' },
  { code: 'num5', label: '5', lightIndex: 69, hidCode: 0x5D, row: 3, col: 20, group: 'numpad' },
  { code: 'num6', label: '6', lightIndex: 70, hidCode: 0x5E, row: 3, col: 21, group: 'numpad' },

  // ROW 4: Shift + ZXCV
  { code: 'lshift', label: 'Shift', lightIndex: 73, hidCode: 0xE1, width: 2.25, row: 4, col: 0, group: 'modifier' },
  { code: 'z', label: 'Z', lightIndex: 74, hidCode: 0x1D, row: 4, col: 2.25, group: 'alpha' },
  { code: 'x', label: 'X', lightIndex: 75, hidCode: 0x1B, row: 4, col: 3.25, group: 'alpha' },
  { code: 'c', label: 'C', lightIndex: 76, hidCode: 0x06, row: 4, col: 4.25, group: 'alpha' },
  { code: 'v', label: 'V', lightIndex: 77, hidCode: 0x19, row: 4, col: 5.25, group: 'alpha' },
  { code: 'b', label: 'B', lightIndex: 78, hidCode: 0x05, row: 4, col: 6.25, group: 'alpha' },
  { code: 'n', label: 'N', lightIndex: 79, hidCode: 0x11, row: 4, col: 7.25, group: 'alpha' },
  { code: 'm', label: 'M', lightIndex: 80, hidCode: 0x10, row: 4, col: 8.25, group: 'alpha' },
  { code: 'comma', label: ',', subLabel: '<', lightIndex: 81, hidCode: 0x36, row: 4, col: 9.25, group: 'alpha' },
  { code: 'dot', label: '.', subLabel: '>', lightIndex: 82, hidCode: 0x37, row: 4, col: 10.25, group: 'alpha' },
  { code: 'slash', label: '/', subLabel: '?', lightIndex: 83, hidCode: 0x38, row: 4, col: 11.25, group: 'alpha' },
  { code: 'rshift', label: 'Shift', lightIndex: 84, hidCode: 0xE5, width: 2.75, row: 4, col: 12.25, group: 'modifier' },
  { code: 'up', label: '▲', lightIndex: 101, hidCode: 0x52, row: 4, col: 16.5, group: 'nav' },
  { code: 'num1', label: '1', lightIndex: 86, hidCode: 0x59, row: 4, col: 19, group: 'numpad' },
  { code: 'num2', label: '2', lightIndex: 87, hidCode: 0x5A, row: 4, col: 20, group: 'numpad' },
  { code: 'num3', label: '3', lightIndex: 88, hidCode: 0x5B, row: 4, col: 21, group: 'numpad' },
  { code: 'numenter', label: 'Enter', lightIndex: 106, hidCode: 0x58, height: 2, row: 4, col: 22, group: 'numpad' },

  // ROW 5: Bottom Row (Ctrl, Win, Alt, Space, FN, etc)
  { code: 'lctrl', label: 'Ctrl', lightIndex: 91, hidCode: 0xE0, width: 1.25, row: 5, col: 0, group: 'modifier' },
  { code: 'lwin', label: 'Win', lightIndex: 92, hidCode: 0xE3, width: 1.25, row: 5, col: 1.25, group: 'modifier' },
  { code: 'lalt', label: 'Alt', lightIndex: 93, hidCode: 0xE2, width: 1.25, row: 5, col: 2.5, group: 'modifier' },
  { code: 'space', label: 'Space', lightIndex: 94, hidCode: 0x2C, width: 6.25, row: 5, col: 3.75, group: 'alpha' },
  { code: 'ralt', label: 'Alt', lightIndex: 95, hidCode: 0xE6, width: 1.25, row: 5, col: 10, group: 'modifier' },
  { code: 'fn', label: 'FN', lightIndex: 96, hidCode: 0xAF, width: 1.25, row: 5, col: 11.25, group: 'modifier' },
  { code: 'menu', label: 'Menu', lightIndex: 97, hidCode: 0x65, width: 1.25, row: 5, col: 12.5, group: 'modifier' },
  { code: 'rctrl', label: 'Ctrl', lightIndex: 98, hidCode: 0xE4, width: 1.25, row: 5, col: 13.75, group: 'modifier' },
  { code: 'left', label: '◀', lightIndex: 99, hidCode: 0x50, row: 5, col: 15.5, group: 'nav' },
  { code: 'down', label: '▼', lightIndex: 100, hidCode: 0x51, row: 5, col: 16.5, group: 'nav' },
  { code: 'right', label: '▶', lightIndex: 102, hidCode: 0x4F, row: 5, col: 17.5, group: 'nav' },
  { code: 'num0', label: '0', lightIndex: 104, hidCode: 0x62, width: 2, row: 5, col: 19, group: 'numpad' },
  { code: 'numdot', label: '.', lightIndex: 105, hidCode: 0x63, row: 5, col: 21, group: 'numpad' },
];

export const KEY_BY_CODE = new Map<string, KeyDef>(ALL_KEYS.map((k) => [k.code, k]));
export const KEY_BY_INDEX = new Map<number, KeyDef>(ALL_KEYS.map((k) => [k.lightIndex, k]));

export const MODIFIER_BITS: { [name: string]: number } = {
  ctrl: 0x01,  // Left Ctrl
  shift: 0x02, // Left Shift
  alt: 0x04,   // Left Alt
  win: 0x08,   // Left GUI
  rctrl: 0x10, // Right Ctrl
  rshift: 0x20,// Right Shift
  ralt: 0x40,  // Right Alt
  rwin: 0x80,  // Right GUI
};

export const PRESET_GROUPS = [
  { name: 'All Keys', keys: ALL_KEYS.map((k) => k.code) },
  { name: 'WASD Keys', keys: ['w', 'a', 's', 'd'] },
  { name: 'Arrow Keys', keys: ['up', 'down', 'left', 'right'] },
  { name: 'Numpad', keys: ALL_KEYS.filter((k) => k.group === 'numpad').map((k) => k.code) },
  { name: 'Function Row', keys: ALL_KEYS.filter((k) => k.group === 'function').map((k) => k.code) },
  { name: 'Navigation Cluster', keys: ALL_KEYS.filter((k) => k.group === 'nav').map((k) => k.code) },
  { name: 'Modifiers', keys: ALL_KEYS.filter((k) => k.group === 'modifier').map((k) => k.code) },
];
