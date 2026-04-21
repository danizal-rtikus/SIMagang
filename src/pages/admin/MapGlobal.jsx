import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, Building2, Globe } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createColoredIcon = (color) => L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -30],
});
const iconMasuk  = createColoredIcon('#10B981');
const iconKeluar = createColoredIcon('#F59E0B');

const PAGE_SIZE = 10;
const toDateInputValue = (d) => {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
};

export default function AdminMapGlobal() {
    const [attendances, setAttendances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
    const [page, setPage] = useState(1);

    useEffect(() => { fetchMapData(selectedDate); setPage(1); }, [selectedDate]);

    const fetchMapData = async (dateStr) => {
        setLoading(true);
        try {
            const { data: internships } = await supabase
                .from('internships')
                .select('student_id, company_name, users_profile!internships_student_id_fkey(full_name)')
                .in('status', ['approved', 'finished']);

            const studentInfoMap = {};
            (internships || []).forEach(i => {
                studentInfoMap[i.student_id] = {
                    name: i.users_profile?.full_name || 'Tanpa Nama',
                    company: i.company_name || 'Tanpa Instansi'
                };
            });

            const { data: attendanceData } = await supabase
                .from('attendances')
                .select('*')
                .gte('created_at', `${dateStr}T00:00:00`)
                .lte('created_at', `${dateStr}T23:59:59`)
                .order('created_at', { ascending: false });

            const markers = (attendanceData || []).map(a => ({
                ...a,
                student_name: studentInfoMap[a.student_id]?.name || 'Mahasiswa Tidak Diketahui',
                company_name: studentInfoMap[a.student_id]?.company || '-'
            }));
            setAttendances(markers);
        } finally {
            setLoading(false);
        }
    };

    const markersOnMap = useMemo(() => attendances.filter(a => a.latitude != null && a.longitude != null), [attendances]);
    const defaultCenter = markersOnMap.length > 0 ? [markersOnMap[0].latitude, markersOnMap[0].longitude] : [-7.398246, 109.230072];
    const totalPages = Math.max(1, Math.ceil(attendances.length / PAGE_SIZE));
    const pagedList  = attendances.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Global Map Lokasi Magang</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Pemantauan posisi seluruh mahasiswa magang berdasarkan presensi tanggal terpilih.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#E0E7FF', color: 'var(--primary)', borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: '0.9rem' }}>
                        <Globe size={16} /> {attendances.length} Titik Presensi
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <Calendar size={16} color="var(--primary)" />
                        <input type="date" value={selectedDate} max={toDateInputValue(new Date())}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ border: 'none', outline: 'none', fontSize: '0.95rem', color: 'var(--text-main)', cursor: 'pointer' }} />
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                {[{ color: '#10B981', label: 'Absen Masuk' }, { color: '#F59E0B', label: 'Absen Keluar' }].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, border: '2px solid white', boxShadow: '0 0 0 1px ' + color }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Total: <strong>{attendances.length}</strong> presensi · {markersOnMap.length} dengan GPS
                </span>
            </div>

            {/* 2 Column Layout */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    🗺️ Memuat peta global...
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '16px', alignItems: 'start' }}>
                    {/* Peta */}
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        {markersOnMap.length === 0 ? (
                            <div style={{ height: '560px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '12px' }}>
                                <MapPin size={40} strokeWidth={1.2} />
                                <p style={{ margin: 0, fontWeight: 500 }}>Tidak ada koordinat GPS pada tanggal ini</p>
                            </div>
                        ) : (
                            <MapContainer center={defaultCenter} zoom={12} style={{ height: '560px', width: '100%' }} key={selectedDate}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                                {markersOnMap.map(apt => (
                                    <Marker key={apt.id} position={[apt.latitude, apt.longitude]} icon={apt.type === 'in' ? iconMasuk : iconKeluar}>
                                        <Popup minWidth={180}>
                                            <div style={{ textAlign: 'center', padding: '4px 0' }}>
                                                {apt.photo_url && (
                                                    <div style={{ width: '110px', height: '110px', margin: '0 auto 10px', overflow: 'hidden', borderRadius: '8px', border: '2px solid #E2E8F0' }}>
                                                        <img src={apt.photo_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                )}
                                                <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>{apt.student_name}</p>
                                                <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: '#475569' }}>🏢 {apt.company_name}</p>
                                                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600, backgroundColor: apt.type === 'in' ? '#D1FAE5' : '#FEF3C7', color: apt.type === 'in' ? '#059669' : '#D97706' }}>
                                                    {apt.type === 'in' ? '✓ Masuk' : '✗ Keluar'}
                                                </span>
                                                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>🕐 {new Date(apt.created_at).toLocaleString('id-ID')}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        )}
                    </div>

                    {/* Riwayat + Pagination */}
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', maxHeight: '560px' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Riwayat Presensi</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                            {attendances.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Clock size={36} strokeWidth={1.2} style={{ marginBottom: '8px' }} />
                                    <p style={{ margin: 0 }}>Tidak ada presensi pada tanggal ini</p>
                                </div>
                            ) : (
                                pagedList.map((apt, idx) => (
                                    <div key={apt.id} style={{ display: 'flex', gap: '12px', padding: '12px 20px', borderBottom: idx < pagedList.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'flex-start' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, marginTop: '5px', backgroundColor: apt.type === 'in' ? '#10B981' : '#F59E0B', boxShadow: `0 0 0 3px ${apt.type === 'in' ? '#D1FAE5' : '#FEF3C7'}` }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{apt.student_name}</span>
                                                <span style={{ flexShrink: 0, padding: '1px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: apt.type === 'in' ? '#D1FAE5' : '#FEF3C7', color: apt.type === 'in' ? '#059669' : '#D97706' }}>
                                                    {apt.type === 'in' ? 'Masuk' : 'Keluar'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.77rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}><Building2 size={11} /> {apt.company_name}</span>
                                                <span style={{ fontSize: '0.77rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={11} /> {new Date(apt.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                {apt.latitude != null && <span style={{ fontSize: '0.77rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={11} /> GPS</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {attendances.length > PAGE_SIZE && (
                            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hal. {page}/{totalPages}</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: page===1?'#F8FAFC':'white', cursor: page===1?'not-allowed':'pointer', color: page===1?'#CBD5E1':'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronLeft size={16}/></button>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: page===totalPages?'#F8FAFC':'white', cursor: page===totalPages?'not-allowed':'pointer', color: page===totalPages?'#CBD5E1':'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronRight size={16}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
