<img width="1282" height="913" alt="image" src="https://github.com/user-attachments/assets/2975652b-251c-40b2-82d9-e64b5fbbe835" />
<img width="1236" height="490" alt="image" src="https://github.com/user-attachments/assets/155ad4d8-4e98-4951-9007-26472143f1ba" />
# Aula F108 Pro Mechanical Keyboard Controller & Studio

Aula F108 Pro mekanik klavye için geliştirilmiş; arka aydınlatma modları, tuş başına özel RGB, tuş eşleme (remap), 240×135 TFT LCD ekran görsel/GIF yükleme ve donanımsal RTC saat senkronizasyonu sağlayan açık kaynaklı, bağımsız kontrol yazılımı.


---

## 🚀 Özellikler

- **20 Farklı Donanımsal Işık Modu**: Renk, parlaklık, animasyon hızı ve yön seçimi.
- **Tuş Başına RGB (Per-Key RGB)**: 108 tuşu bağımsız renklendirme, hazır şablonlar (WASD, Cyberpunk vb.) ve YAML içe/dışa aktarma.
- **Tuş Yeniden Eşleme (Remap)**: Normal katman (`04 11`) ve FN katmanı (`04 27`) için tuş takası, multimedya kontrolleri ve fare eylemleri.
- **240×135 TFT LCD Ekran & Animasyon Stüdyosu**: Statik görseller (PNG, JPG) veya animasyonlu GIF'leri 141 güvenli kare sınırı dahilinde RGB565 formatına dönüştürüp klavyeye aktarma.
- **Donanımsal RTC Saat Senkronizasyonu**: Tek tıkla bilgisayar saatini klavyenin dahili saatine eşitleme (`04 28 Protocol`).
- **HID Paket Denetleyicisi**: Gönderilen ve alınan tüm 64 baytlık ham USB raporlarını canlı izleme.

---

## 🐧 Linux USB İzinleri (Udev Kuralı)

Linux altında WebHID / USB cihazına `sudo` (root) yetkisi olmadan doğrudan erişebilmek için aşağıdaki udev kuralını terminalde bir defa çalıştırmanız gerekir:

```bash
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="0c45", ATTR{idProduct}=="800a", MODE="0666"' | sudo tee /etc/udev/rules.d/99-aula.rules
sudo udevadm control --reload-rules && sudo udevadm trigger
```

> **Önemli:** Klavyeyi USB Type-C kablosuyla bilgisayara bağladığınızdan emin olun. 2.4G kablosuz veya Bluetooth modunda HID yapılandırma komutları donanımsal olarak kısıtlı olabilir.

---

## 🛠️ İşletim Sistemine Göre Derleme (Desktop Build)

Uygulama, bağımsız bir masaüstü uygulaması olarak doğrudan işletim sisteminize göre derlenebilir.

### Ön Gereksinimler

- [Node.js](https://nodejs.org/) (Sürüm 18 veya üstü; Node 20 / 22 / 24)
- `npm` paket yöneticisi
- **Linux için FUSE 2 Kütüphanesi (`fuse2` / `libfuse2`)**: AppImage paketlerinin çift tıklanarak doğrudan çalışabilmesi için sisteminizde `fuse2` paketinin kurulu olması **zorunludur**:
  - **Arch Linux / Manjaro:** `sudo pacman -S fuse2`
  - **Ubuntu / Debian / Linux Mint:** `sudo apt install libfuse2`
  - **Fedora / RHEL:** `sudo dnf install fuse-libs`
  - **openSUSE:** `sudo zypper install libfuse2`

```bash
# Projeyi klonlayın ve klasöre girin
git clone https://github.com/nopickart/f108-pro-web-gui-app.git
cd f108-pro-web-gui-app

# Bağımlılıkları yükleyin
npm install
```

---

### 1. Linux için Derleme (.AppImage & .deb)

Linux masaüstünüzde **çift tıklayarak çalıştırmak** için `.AppImage` ve sisteminize kurmak için `.deb` paketi üretir:

```bash
# Electron derleme araçlarını yükleyin
npm install -D electron electron-builder

# Linux paketlerini derleyin
npm run dist:linux
```

Derleme tamamlandığında çıktılar **`release/`** klasöründe oluşturulur:
- **`release/Aula F108 Pro Controller-1.0.0.AppImage`**
- **`release/aula-f108-pro_1.0.0_amd64.deb`**

#### Masaüstünde Çift Tıklayarak Çalıştırma:
1. `release/` klasöründeki `.AppImage` dosyasını Masaüstünüze taşıyın.
2. Dosyaya sağ tıklayın: **Özellikler (Properties) → İzinler (Permissions) → "Dosyayı bir program gibi çalıştırmaya izin ver" (Allow executing file as program)** kutucuğunu işaretleyin (veya terminalden `chmod +x ~/Desktop/*.AppImage`).
3. **Simgeye çift tıklayın**, uygulama yerel ve bağımsız bir masaüstü penceresinde açılacaktır!

> ⚠️ **Zorunlu Gereksinim (FUSE 2):**
> Linux sistemlerinde AppImage paketlerinin çift tıklanarak açılabilmesi için `fuse2` paketinin kurulu olması şarttır:
> - **Arch Linux:** `sudo pacman -S fuse2`
> - **Ubuntu / Debian:** `sudo apt install libfuse2`
> - **Fedora:** `sudo dnf install fuse-libs`
> *(FUSE yüklemeden doğrudan çalıştırmak isterseniz: `./release/*.AppImage --appimage-extract-and-run`)*

Debian/Ubuntu/Linux Mint'e sistem uygulaması olarak kurmak isterseniz:
```bash
sudo dpkg -i release/aula-f108-pro_1.0.0_amd64.deb
```

---

### 2. Windows için Derleme (.exe Kurulum & Portable)

Windows için tek tıklanabilir kurulum sihirbazı (`Setup.exe`) ve kuruluma gerek olmadan çift tıklanan taşınabilir (`portable.exe`) paket üretir:

```bash
npm run dist:win
```

Çıktılar **`release/`** klasöründe yer alır:
- **`release/Aula F108 Pro Controller Setup 1.0.0.exe`**
- **`release/Aula F108 Pro Controller 1.0.0.exe`** (Portable)

---

### 3. macOS için Derleme (.dmg)

macOS için doğrudan sürücüye atıp kurabileceğiniz disk imajı (`.dmg`) üretir:

```bash
npm run dist:mac
```

Çıktı **`release/`** klasöründe:
- **`release/Aula F108 Pro Controller-1.0.0.dmg`**

---

## ⚠️ Sık Karşılaşılan Kurulum Uyarıları & Çözümleri (Troubleshooting)

### 1. `npm warn install-scripts 2 packages had install scripts blocked` Uyarısı
Modern Node.js ve npm (özellikle npm v10/v11 veya `allowScripts` güvenlik ayarı aktif olan ortamlarda) kurulum sırasında bazı paketlerin postinstall betiklerini durdurabilir:
- **`esbuild`**: Vite'ın derleyicisidir. Eğer bu betik engellenmişse `esbuild: not found` hatası almamak için terminalde şu komutu çalıştırmanız yeterlidir:
  ```bash
  npm rebuild esbuild
  # veya
  npm install --foreground-scripts
  ```
  *(Not: Projedeki `.npmrc` yapılandırması ve `npm run dist:linux` betiği bu işlemi otomatik olarak da tetikler).*
- **`electron-winstaller`**: Bu paket sadece Windows üzerinde `.exe` oluşturmak içindir. **Linux'ta `.AppImage` veya `.deb` derlerken hiçbir şekilde kullanılmaz.** Bu uyarı Linux derlemesini hiçbir şekilde etkilemez, güvenle yok sayabilirsiniz.

### 2. `15 moderate severity vulnerabilities` Uyarısı
Bu uyarılar, `electron-builder` paketleme aracının kendi iç geliştirme bağımlılıklarından kaynaklanan genel `npm audit` bildirimleridir. Uygulamanın çalışma kodunda yer almaz, derleme sürecini veya Linux güvenliğini etkilemez.

---

## 💻 Geliştirme (Development)

Yerel ortamınızda kaynak kodları düzenlerken test etmek için:

```bash
# Web arayüzü olarak tarayıcıda başlatma:
npm run dev

# Masaüstü (Electron) penceresinde anında test etme:
npm run electron:dev
```

---

## 🌐 Statik Web Sürümü Olarak Derleme

Uygulamayı yerel bir web sunucusunda barındırmak veya Nginx/Apache üzerinden açmak isterseniz:

```bash
npm run build
```

Derlenen dosyalar **`dist/`** klasöründe yer alır. `dist/` içeriğini herhangi bir statik web sunucusuna yerleştirebilirsiniz.

---

## 🙏 Teşekkürler

Bu proje, [Parsia Hakimian](https://github.com/parsiya)'ın Aula F108 Pro
için yaptığı tersine mühendislik çalışmasına dayanır (HID protokolü,
Ghidra analizi, LCD yükleme araştırması). Protokol dokümanları
[`ai-docs/`](./ai-docs) klasöründe onun çalışmasından alınmıştır.

Orijinal proje: [parsiya/f108-pro](https://github.com/parsiya/f108-pro)


## 📄 Lisans

Bu proje açık kaynaklıdır. Detaylar için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.
