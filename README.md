# Aula F108 Pro Mechanical Keyboard Controller & Studio

Aula F108 Pro mekanik klavye için geliştirilmiş; arka aydınlatma modları, tuş başına özel RGB, tuş eşleme (remap), 240×135 TFT LCD ekran görsel/GIF yükleme ve donanımsal RTC saat senkronizasyonu sağlayan açık kaynaklı, bağımsız kontrol yazılımı.

Herhangi bir harici sunucuya veya bulut servisine ihtiyaç duymaz; yerel ortamda %100 çevrimdışı çalışır.

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

> **Not:** Klavyeyi USB kablosuyla bilgisayara bağladığınızdan emin olun. 2.4G kablosuz dongle veya Bluetooth üzerinden HID yapılandırma komutları donanım gereği kısıtlı olabilir.

---

## 🛠️ İşletim Sistemine Göre Derleme (Desktop Build)

Uygulama, bağımsız bir masaüstü uygulaması olarak doğrudan işletim sisteminize göre derlenebilir.

### Ön Gereksinimler

- [Node.js](https://nodejs.org/) (Sürüm 18 veya üstü; Node 20/22 önerilir)
- `npm` paket yöneticisi

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
# Electron derleme araçlarını yükleyin (ilk seferde)
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

## 💻 Geliştirme (Development)

Yerel ortamınızda kaynak kodları düzenlerken test etmek için:

```bash
# Web arayüzü olarak başlatma:
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

## 📄 Lisans

Bu proje açık kaynaklıdır. Detaylar için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.
