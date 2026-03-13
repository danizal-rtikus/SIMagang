import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Globe } from 'lucide-react';

// Fix for custom icons in Leaflet with Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function AdminMapGlobal() {
    const [attendances, setAttendances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMapData();
    }, []);

    const fetchMapData = async () => {
        setLoading(true);

        // 1. Ambil seluuruh internship yang approved/finished untuk mapping nama dan perusahaan
        const { data: internships } = await supabase
            .from('internships')
            .select('student_id, company_name, users_profile!internships_student_id_fkey(full_name)')
            .in('status', ['approved', 'finished']);

        const studentInfoMap = {};
        if (internships) {
            internships.forEach(i => {
                studentInfoMap[i.student_id] = {
                    name: i.users_profile?.full_name || 'Tanpa Nama',
                    company: i.company_name || 'Tanpa Instansi'
                };
            });
        }

        // 2. Ambil seluruh data attendance yang memiliki latitude & longitude
        const { data: attendanceData } = await supabase
            .from('attendances')
            .select('*')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .order('created_at', { ascending: false });

        if (attendanceData) {
            const markers = attendanceData.map(a => ({
                ...a,
                student_name: studentInfoMap[a.student_id]?.name || 'Data Mahasiswa Tidak Ditemukan',
                company_name: studentInfoMap[a.student_id]?.company || 'Tidak Terhubung ke Instansi'
            }));
            setAttendances(markers);
        }

        setLoading(false);
    };

    const defaultCenter = attendances.length > 0
        ? [attendances[0].latitude, attendances[0].longitude]
        : [-6.200000, 106.816666]; // Default to Jakarta if empty

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Global Map Lokasi Magang</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Pemantauan *real-time* posisi seluruh mahasiswa magang bedasarkan presensi terbaru.</p>
                </div>
                <div className="badge" style={{ backgroundColor: '#E0E7FF', color: '#4F46E5', padding: '8px 16px', fontSize: '1rem' }}>
                    <Globe size={18} style={{ marginRight: '8px' }} />
                    {attendances.length} Titik Presensi
                </div>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white', padding: '16px' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat peta global...</div>
                ) : attendances.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data presensi global yang masuk.</div>
                ) : (
                    <div style={{ height: '600px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                        <MapContainer center={defaultCenter} zoom={11} style={{ height: '100%', width: '100%' }}>
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
                )}
            </div>
        </div>
    );
}
