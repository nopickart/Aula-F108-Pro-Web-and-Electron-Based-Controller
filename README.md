<img width="1282" height="913" alt="image" src="https://github.com/user-attachments/assets/2975652b-251c-40b2-82d9-e64b5fbbe835" />
<img width="1236" height="490" alt="image" src="https://github.com/user-attachments/assets/155ad4d8-4e98-4951-9007-26472143f1ba" />
# Aula F108 Pro Mechanical Keyboard Controller & Studio

Open-source, independent control software developed for the Aula F108 Pro mechanical keyboard; providing backlighting modes, per-key custom RGB, key remapping, 240×135 TFT LCD screen image/GIF upload, and hardware RTC clock synchronization.

---

## 🚀 Features

* **20 Different Hardware Lighting Modes**: Color, brightness, animation speed, and direction selection.
* **Per-Key RGB**: Independent coloring for 108 keys, ready-made templates (WASD, Cyberpunk, etc.), and YAML import/export.
* **Key Remapping (Remap)**: Key swapping, multimedia controls, and mouse actions for the Normal layer (`04 11`) and FN layer (`04 27`).
* **240×135 TFT LCD Screen & Animation Studio**: Converting static images (PNG, JPG) or animated GIFs into RGB565 format within a safe 141-frame limit and transferring them to the keyboard.
* **Hardware RTC Clock Synchronization**: One-click syncing of the computer clock to the keyboard's internal clock (`04 28 Protocol`).
* **HID Packet Inspector**: Live monitoring of all sent and received 64-byte raw USB reports.

---

## 🐧 Linux USB Permissions (Udev Rule)

To directly access the WebHID / USB device under Linux without `sudo` (root) privileges, you need to run the following udev rule once in the terminal:

```bash
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="0c45", ATTR{idProduct}=="800a", MODE="0666"' | sudo tee /etc/udev/rules.d/99-aula.rules
sudo udevadm control --reload-rules && sudo udevadm trigger

```

> **Important:** Make sure you connect the keyboard to the computer using a USB Type-C cable. HID configuration commands might be hardware-restricted in 2.4G wireless or Bluetooth mode.

---
For Try:

https://nopickart.github.io/Aula-F108-Pro-Web-and-Electron-Based-Controller/


## 🛠️ Desktop Build

The application can be compiled directly for your operating system as a standalone desktop app.

### Prerequisites

* [Node.js](https://nodejs.org/) (Version 18 or higher; Node 20 / 22 / 24)
* `npm` package manager
* **FUSE 2 Library for Linux (`fuse2` / `libfuse2`)**: It is **mandatory** to have the `fuse2` package installed on your system for AppImage packages to run directly by double-clicking:
* **Arch Linux / Manjaro:** `sudo pacman -S fuse2`
* **Ubuntu / Debian / Linux Mint:** `sudo apt install libfuse2`
* **Fedora / RHEL:** `sudo dnf install fuse-libs`
* **openSUSE:** `sudo zypper install libfuse2`



```bash
# Clone the project and enter the directory
git clone https://github.com/nopickart/f108-pro-web-gui-app.git
cd f108-pro-web-gui-app

# Install dependencies
npm install

```

---

### 1. Build for Linux (.AppImage & .deb)

Generates an `.AppImage` for **double-click execution** on your Linux desktop and a `.deb` package to install on your system:

```bash
# Install Electron build tools
npm install -D electron electron-builder

# Build Linux packages
npm run dist:linux

```

When the build is complete, the outputs will be generated in the **`release/`** folder:

* **`release/Aula F108 Pro Controller-1.0.0.AppImage`**
* **`release/aula-f108-pro_1.0.0_amd64.deb`**

#### Running by Double-Clicking on the Desktop:

1. Move the `.AppImage` file from the `release/` folder to your Desktop.
2. Right-click the file: **Properties → Permissions → Check the "Allow executing file as program"** box (or run `chmod +x ~/Desktop/*.AppImage` from the terminal).
3. **Double-click the icon**, the application will open in a native and standalone desktop window!

> ⚠️ **Mandatory Requirement (FUSE 2):**
> To open AppImage packages by double-clicking on Linux systems, the `fuse2` package must be installed:
> * **Arch Linux:** `sudo pacman -S fuse2`
> * **Ubuntu / Debian:** `sudo apt install libfuse2`
> * **Fedora:** `sudo dnf install fuse-libs`
> *(If you want to run it directly without installing FUSE: `./release/*.AppImage --appimage-extract-and-run`)*
> 
> 

If you want to install it as a system application on Debian/Ubuntu/Linux Mint:

```bash
sudo dpkg -i release/aula-f108-pro_1.0.0_amd64.deb

```

---

### 2. Build for Windows (.exe Setup & Portable)

Generates a one-click setup wizard (`Setup.exe`) and a double-clickable portable (`portable.exe`) package that requires no installation for Windows:

```bash
npm run dist:win

```

Outputs are located in the **`release/`** folder:

* **`release/Aula F108 Pro Controller Setup 1.0.0.exe`**
* **`release/Aula F108 Pro Controller 1.0.0.exe`** (Portable)

---

### 3. Build for macOS (.dmg)

Generates a disk image (`.dmg`) for macOS that you can directly mount and install:

```bash
npm run dist:mac

```

Output is in the **`release/`** folder:

* **`release/Aula F108 Pro Controller-1.0.0.dmg`**

---

## ⚠️ Troubleshooting

### 1. `npm warn install-scripts 2 packages had install scripts blocked` Warning

Modern Node.js and npm (especially npm v10/v11 or in environments with the `allowScripts` security setting enabled) may block postinstall scripts of certain packages during installation:

* **`esbuild`**: This is Vite's compiler. If this script is blocked, simply run the following command in the terminal to avoid the `esbuild: not found` error:
```bash
npm rebuild esbuild
# or
npm install --foreground-scripts

```


*(Note: The `.npmrc` configuration in the project and the `npm run dist:linux` script also trigger this process automatically).*
* **`electron-winstaller`**: This package is only for creating `.exe` files on Windows. **It is not used in any way when building `.AppImage` or `.deb` on Linux.** This warning does not affect the Linux build at all and can be safely ignored.

### 2. `15 moderate severity vulnerabilities` Warning

These warnings are generic `npm audit` notifications originating from the internal development dependencies of the `electron-builder` packaging tool. They are not part of the application's runtime code and do not affect the build process or Linux security.

---

## 💻 Development

To test while editing the source code in your local environment:

```bash
# Launch in the browser as a web interface:
npm run dev

# Test instantly in a Desktop (Electron) window:
npm run electron:dev

```

---

## 🌐 Static Web Build

If you want to host the application on a local web server or serve it via Nginx/Apache:

```bash
npm run build

```

The compiled files are located in the **`dist/`** folder. You can place the contents of `dist/` into any static web server.

---

## 🙏 Credits

This project is based on the reverse engineering work done by [Parsia Hakimian](https://github.com/parsiya) for the Aula F108 Pro (HID protocol, Ghidra analysis, LCD upload research). The protocol documents in the [`ai-docs/`](https://www.google.com/search?q=./ai-docs) folder are taken from his work.

Original project: [parsiya/f108-pro](https://github.com/parsiya/f108-pro)

## 📄 License

This project is open-source. For details, you can check the [LICENSE](https://www.google.com/search?q=LICENSE) file.
