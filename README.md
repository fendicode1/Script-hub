# ScriptHub v3 (tanpa server)

Website statis: tidak perlu Node.js, tidak perlu `npm install`.

## Cara membuka
- Di komputer: ekstrak zip, klik dua kali `index.html`.
- Online: unggah semua isi folder ke hosting statis apa pun (GitHub Pages, Netlify, Cloudflare Pages, cPanel/public_html).

## Password admin
Ada di `config.js`:

    ADMIN_PASSWORD: "fendi21@4"

Ubah lalu simpan. Peringatan: file ini bisa dibaca siapa saja lewat view-source, jadi password hanya pembatas ringan, bukan pengaman sungguhan.

## Menu garis tiga (pojok kiri atas)
- Beranda: cari, filter game, urut Terlama/Terbaru.
- Favorit: simpan script dengan bintang.
- Terakhir dilihat: riwayat 30 script terakhir.
- Statistik: total script, jumlah game, tertua/terbaru, grafik per game.
- Admin: tambah, kelola/hapus, impor/ekspor, feed otomatis.
- Pengaturan: mode hemat blur, bungkus baris kode, ukuran huruf kode.
- Tentang & keamanan.

## Agar script tampil untuk semua pengunjung
Situs ini tidak punya database server. Script yang ditambah lewat Admin tersimpan di browser admin saja.
Untuk mempublikasikannya: Admin > Impor / Ekspor > "Unduh scripts-data.js", lalu ganti file `data/scripts-data.js` di hosting dengan file itu.

## Impor otomatis
Isi `FEEDS` di `config.js` dengan URL JSON (array script). Situs mengeceknya saat dibuka, sesuai `FEED_INTERVAL_MINUTES`.
URL harus mengizinkan akses lintas situs (CORS); `raw.githubusercontent.com` bisa.

Format tiap script:

    { "title": "...", "game": "...", "description": "...", "code": "...",
      "tags": ["a","b"], "author": "...", "createdAt": "2026-01-31" }

Kode hanya ditampilkan sebagai teks dan tidak pernah dijalankan.
