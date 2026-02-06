# Aplikasi Web Izin Staff

Aplikasi web untuk mengelola izin staff dengan sistem kuota harian.

## Fitur

1. **Login System**
   - Login dengan username dan password
   - Akses hanya 2 jam setelah shift dimulai
   - Admin login: username: `csline`, password: `aa1234`

2. **Sistem Izin**
   - Izin 15 menit: 4 kali/hari
   - Izin ambil makan: 3 kali/hari dengan durasi 7 menit
   - Hanya 1 staff per jobdesk yang dapat izin
   - Waktu izin tetap berjalan meskipun internet hilang

3. **Fitur Admin**
   - Kelola staff (tambah, hapus)
   - Kelola shift
   - Kelola jobdesk
   - Atur kuota izin
   - Atur tampilan (logo, background, warna tema)

4. **Tampilan**
   - Tema biru dengan aksen emas
   - Jam digital real-time
   - Animasi staff tidur saat izin
   - History izin staff
   - Daftar staff yang sedang izin

## Cara Menggunakan

### Deployment Gratis di Netlify

1. Buat akun di [Netlify](https://www.netlify.com/)
2. Buat repository baru di GitHub
3. Upload semua file ke repository
4. Login ke Netlify dan pilih "New site from Git"
5. Pilih repository yang sudah dibuat
6. Netlify akan otomatis deploy aplikasi

### Atau Deploy Manual

1. Upload semua file ke hosting web
2. Aplikasi akan bekerja langsung tanpa perlu backend

## Struktur File
