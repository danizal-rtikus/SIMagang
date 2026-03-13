import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for custom icons in Leaflet with Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function DosenMapBimbingan() {
    const [attendances, setAttendances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMapData();
    }, []);

    const fetchMapData = async () => {
        setLoading(true);

        // 1. Dapatkan daftar mahasiswa bimbingannya dari tabel internships (dengan company name)
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: internships } = await supabase
                .from('internships')
                .select('student_id, company_name, users_profile!internships_student_id_fkey(full_name)')
                .eq('dosen_id', user.id)
                .in('status', ['approved', 'finished']);

            if (internships) {
                const studentIds = internships.map(i => i.student_id);
                const studentInfoMap = {};
                internships.forEach(i => {
                    studentInfoMap[i.student_id] = {
                        name: i.users_profile?.full_name || 'Tanpa Nama',
                        company: i.company_name || 'Tanpa Instansi'
                    };
                });

                // 2. Ambil data attendance HARI INI saja, atau limit beberapa terakhir untuk mahasiswa tersebut
                if (studentIds.length > 0) {
                    // Untuk simplifikasi, kita ambil semua yang lokasinya tidak null
                    const { data: attendanceData } = await supabase
                        .from('attendances')
                        .select('*')
                        .in('student_id', studentIds)
                        .not('latitude', 'is', null)
                        .not('longitude', 'is', null)
                        .order('created_at', { ascending: false });

                    if (attendanceData) {
                        // Filter untuk mengambil satu presensi terbaru per mahasiswa per hari
                        // Disini kita akan map semua titik untuk demo (bisa dibatasi nanti)
                        const markers = attendanceData.map(a => ({
                            ...a,
                            student_name: studentInfoMap[a.student_id]?.name,
                            company_name: studentInfoMap[a.student_id]?.company
                        }));
                        setAttendances(markers);
                    }
                }
            }
        }

        setLoading(false);
    };

    // Center on Indonesia roughly, or center on the first marker
    const defaultCenter = attendances.length > 0
        ? [attendances[0].latitude, attendances[0].longitude]
        : [-6.200000, 106.816666]; // Default to Jakarta if empty

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Peta Lokasi Mahasiswa</h1>
                <p style={{ color: 'var(--text-muted)' }}>Titik koordinat (*marker*) lokasi kegiatan presensi mahasiswa bimbingan.</p>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white', padding: '16px' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat peta...</div>
                ) : attendances.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data presensi dengan koordinat GPS dari mahasiswa Anda.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Peta */}
                        <div style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {attendances.map((apt) => (
                                <Marker key={apt.id} position={[apt.latitude, apt.longitude]}>
                                    <Popup>
                                        <div style={{ textAlign: 'center', padding: '4px' }}>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--primary)' }}>{apt.student_name}</h4>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 500 }}>🏢 {apt.company_name}</p>
                                            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Absen: {apt.type === 'in' ? 'Masuk' : 'Keluar'} <br />
                                                Waktu: {new Date(apt.created_at).toLocaleString('id-ID')}
                                            </p>
                                            {apt.photo_url && (
                                                <div style={{ width: '120px', height: '120px', margin: '0 auto', overflow: 'hidden', borderRadius: '8px' }}>
                                                    <img src={apt.photo_url} alt="Presensi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                        </div>

                        {/* Daftar Presensi */}
                        <div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Riwayat Presensi Terbaru</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Waktu</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Mahasiswa</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Instansi</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Tipe Absen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendances.map(apt => (
                                            <tr key={`list-${apt.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '12px 16px' }}>{new Date(apt.created_at).toLocaleString('id-ID')}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{apt.student_name}</td>
                                                <td style={{ padding: '12px 16px' }}>{apt.company_name}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                                                        backgroundColor: apt.type === 'in' ? '#D1FAE5' : '#FEF3C7',
                                                        color: apt.type === 'in' ? '#10B981' : '#F59E0B'
                                                    }}>
                                                        {apt.type === 'in' ? 'Masuk' : 'Keluar'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
