# Lingkup Sistem Informasi Magang (SIMagang)

Dokumen ini merangkum ruang lingkup fitur dan alur kerja aplikasi SIMagang berdasarkan kesepakatan terbaru.

## 1. Aktor & Hak Akses (Role)
*   **Admin**: Mengelola pengguna, memantau lokasi presensi semua mahasiswa.
*   **Dosen**: Memeriksa laporan mahasiswa bimbingan (Harian, Bulanan, Akhir) dan memantau lokasi magang mereka.
*   **Mahasiswa**: Melakukan presensi kedatangan/kepulangan dengan kamera, serta mengumpulkan laporan-laporan kegiatan.

## 2. Struktur Menu Berdasarkan Role

### A. Admin
1.  **Dashboard**: Ringkasan data (Total pengguna, total presensi hari ini, dll).
2.  **Manajemen User**: Melihat daftar user, menyetujui, atau mengubah profil dan penempatan dosen/mahasiswa.
3.  **Manajemen Mitra**: Mengelola data instansi perusahaan/mitra magang beserta kuotanya.
4.  **Map Lokasi Mahasiswa**: Peta interaktif yang menampilkan titik lokasi presensi *real-time* dari seluruh mahasiswa magang. Marker pada peta akan tersemat *Popup* berisi kombinasi Nama Mahasiswa, Nama Mitra/Instansi, serta foto presensinya.

### B. Dosen
1.  **Dashboard**: Ringkasan data mahasiswa bimbingannya.
2.  **Cek Laporan Harian**: Melihat dan memberikan umpan balik (catatan) pada logbook harian mahasiswa bimbingan.
3.  **Cek Laporan Bulanan**: Melihat progres (*Progress Tracking*) pengumpulan laporan bulanan mahasiswa bimbingan dari Bulan ke-1 sampai dengan Bulan ke-6.
4.  **Cek Laporan Akhir**: Melihat dokumen laporan akhir magang mahasiswa bimbingan.
5.  **Map Lokasi Mahasiswa**: Peta interaktif yang menampilkan titik lokasi presensi khusus mahasiswa yang berada di bawah bimbingannya (lengkap dengan *Popup* informasi Mahasiswa + Mitra).

### C. Mahasiswa
1.  **Dashboard**: Status magang, ringkasan kehadiran, riwayat kegiatan yang sudah dilakukan, dan persentase kelengkapan Laporan Bulanan yang sudah disubmit.
2.  **Presensi (dengan Kamera)**: Fitur absen masuk/keluar harian yang wajib menangkap foto (*selfie* dari web kamera) beserta titik koordinat GPS (*Geolocation*).
3.  **Laporan Harian**: Mengisi jurnal kegiatan setiap hari.
4.  **Laporan Bulanan**: Mengunggah dokumen PDF laporan bulanan dengan pilihan periode wajib (Bulan ke-1 hingga Bulan ke-6).
5.  **Laporan Akhir**: Mengunggah dokumen laporan akhir kegiatan magang.

## 3. Implikasi Teknis & Kebutuhan Fitur Tambahan
*   **Supabase Storage**: Digunakan untuk menyimpan file gambar (foto presensi kamera) dan file dokumen dokumen (PDF Laporan Bulanan/Akhir).
*   **Geolocation API**: Browser otomatis meminta akses lokasi (Latitude/Longitude) saat mahasiswa membuka halaman Presensi.
*   **WebRTC/Camera API**: Menangkap foto langsung dari browser/HP di menu Presensi.
*   **Geocoding & Leaflet.js**: Integrasi library Peta untuk merender *marker* presensi akurat. Dikliknya setiap marker akan memunculkan komponen *Tooltip/Popup* yang menarik memuat info mahasiswa dan mitra tempat dia magang.
