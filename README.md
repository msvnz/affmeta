# Affmeta

Dashboard laporan Meta Ads dan Shopee Affiliate. GitHub Pages melayani situs statis. Saat konfigurasi database diisi, **Saved Reports** menyimpan laporan harian di PostgreSQL milik proyek Supabase. Setiap akun hanya dapat membaca dan mengubah laporannya sendiri. CSV mentah diproses di browser, sementara ringkasan harian dan rincian yang dipakai dashboard disimpan saat menekan **Simpan Laporan**.

## Aktifkan database

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan buat proyek untuk Affmeta. Jalankan [migrasi tabel laporan](supabase/migrations/202611210001_saved_reports.sql) sekali di **SQL Editor**.
2. Di **Authentication**, pastikan login email aktif dan nonaktifkan pendaftaran publik jika dashboard hanya dipakai pribadi. Buat akun yang akan dipakai di **Authentication → Users**.
3. Isi [database-config.js](database-config.js) dengan **Project URL** (misalnya `https://project-ref.supabase.co`) dan **Publishable key** (`sb_publishable_…`) dari proyek. File ini dilayani GitHub Pages. Gunakan hanya publishable key.
4. Publikasikan perubahan di GitHub Pages seperti biasa. Buka **Saved Reports**, masuk dengan akun Supabase yang dibuat, dan simpan satu laporan. Masuk dengan akun yang sama di perangkat lain untuk memeriksa bahwa laporan tersedia. Klik **Muat Ulang** untuk melihat perubahan dari perangkat lain. Memuat ulang halaman akan meminta login kembali.

Jika kedua isian konfigurasi kosong, dashboard menggunakan penyimpanan lama di browser.

## Pindahkan laporan lama

1. Sebelum mengaktifkan database, simpan cadangan lewat **Saved Reports → Export JSON Data** jika tersedia.
2. Setelah database aktif, buka situs dari alamat yang sama dan gunakan profil browser tempat laporan lama tersimpan. Masuk ke akun tujuan dan klik **Pindahkan Laporan Lama**.
3. Bandingkan tanggal dan total laporan. Pemindahan melewati tanggal yang sudah ada di database serta mempertahankan data lama di browser. Ulangi pada tiap profil browser yang punya laporan tersendiri.

Gunakan **Import JSON** untuk memulihkan cadangan. Import mengganti laporan pada tanggal yang sama dalam akun yang sedang digunakan.
