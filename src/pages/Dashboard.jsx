import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Users, CheckCircle, Clock, FileText, Briefcase, Activity, Calendar, Search, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
    const { userProfile } = useOutletContext();
    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
    const [mhsData, setMhsData] = useState({ monthlyCount: 0, dailyTimeline: [] });
    
    // State khusus untuk Admin
    const [adminData, setAdminData] = useState({ dosen: [], mahasiswa: [], mitra: [] });
    const [adminModal, setAdminModal] = useState({ isOpen: false, type: '', data: [] });
    const [adminSearch, setAdminSearch] = useState('');

    // State khusus untuk Dosen
    const [dosenStudents, setDosenStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (userProfile?.role) {
            fetchStats();
            if (userProfile.role === 'admin') {
                fetchAdminData();
            } else if (userProfile.role === 'mahasiswa') {
                fetchMahasiswaData();
            } else if (userProfile.role === 'dosen') {
                fetchDosenStudents();
            }
        }
    }, [userProfile]);

    const fetchAdminData = async () => {
        const { data: rawDosen } = await supabase.from('users_profile').select('id, full_name, identifier').eq('role', 'dosen');
        const { data: rawMhs } = await supabase.from('users_profile').select('id, full_name, identifier').eq('role', 'mahasiswa');
        const { data: rawMitra } = await supabase.from('partners').select('id, name');
        
        const { data: internships } = await supabase
            .from('internships')
            .select(`
                student_id, dosen_id, partner_id, status,
                dosen:users_profile!internships_dosen_id_fkey(full_name),
                partner:partners(name)
            `);
            
        const mappedDosen = (rawDosen || []).map(d => {
            const mhsCount = (internships || []).filter(i => i.dosen_id === d.id && ['approved', 'finished'].includes(i.status)).length;
            return { ...d, mhsCount };
        });

        const mappedMhs = (rawMhs || []).map(m => {
            const internship = (internships || []).find(i => i.student_id === m.id && ['approved', 'finished'].includes(i.status));
            return {
                ...m,
                dosenName: internship?.dosen?.full_name || 'Belum diplot',
                partnerName: internship?.partner?.name || 'Belum diplot'
            };
        });

        const mappedMitra = (rawMitra || []).map(p => {
            const mhsCount = (internships || []).filter(i => i.partner_id === p.id && ['approved', 'finished'].includes(i.status)).length;
            return { ...p, mhsCount };
        });

        setAdminData({ dosen: mappedDosen, mahasiswa: mappedMhs, mitra: mappedMitra });
    };

    const fetchStats = async () => {
        try {
            let query = supabase.from('internships').select('status');

            if (userProfile.role === 'mahasiswa') {
                query = query.eq('student_id', userProfile.id);
            } else if (userProfile.role === 'dosen') {
                query = query.eq('dosen_id', userProfile.id);
            }

            const { data, error } = await query;
            if (!error && data) {
                setStats({
                    total: data.length,
                    approved: data.filter(d => d.status === 'approved' || d.status === 'finished').length,
                    pending: data.filter(d => d.status === 'pending').length,
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMahasiswaData = async () => {
        // Fetch count of monthly reports
        const { count } = await supabase.from('monthly_reports').select('*', { count: 'exact', head: true }).eq('student_id', userProfile.id);

        // Fetch latest 5 daily reports for timeline
        const { data: timelineData } = await supabase.from('daily_reports')
            .select('id, date, activity, status')
            .eq('student_id', userProfile.id)
            .order('date', { ascending: false })
            .limit(5);

        setMhsData({
            monthlyCount: count || 0,
            dailyTimeline: timelineData || []
        });
    };

    const fetchDosenStudents = async () => {
        const { data } = await supabase
            .from('internships')
            .select(`
                id,
                status,
                student_id,
                users_profile!internships_student_id_fkey(full_name, identifier),
                partners(name)
            `)
            .eq('dosen_id', userProfile.id)
            .in('status', ['approved', 'finished']);

        if (data) {
            setDosenStudents(data.map(item => ({
                id: item.student_id,
                name: item.users_profile?.full_name || 'Tanpa Nama',
                identifier: item.users_profile?.identifier || 'N/A',
                partner: item.partners?.name || 'Tanpa Mitra',
                internship_id: item.id
            })));
        }
    };

    const renderAdminModal = () => {
        if (!adminModal.isOpen) return null;

        const filtered = adminModal.data.filter(item => {
            const s = adminSearch.toLowerCase();
            if (adminModal.type === 'dosen') return item.full_name?.toLowerCase().includes(s) || item.identifier?.toLowerCase().includes(s);
            if (adminModal.type === 'mahasiswa') return item.full_name?.toLowerCase().includes(s) || item.identifier?.toLowerCase().includes(s) || item.dosenName?.toLowerCase().includes(s) || item.partnerName?.toLowerCase().includes(s);
            if (adminModal.type === 'mitra') return item.name?.toLowerCase().includes(s);
            return false;
        });

        let title = '';
        if (adminModal.type === 'dosen') title = 'Daftar Dosen Pendamping';
        if (adminModal.type === 'mahasiswa') title = 'Daftar Mahasiswa Magang';
        if (adminModal.type === 'mitra') title = 'Daftar Mitra Magang';

        return (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>{title}</h3>
                        <button onClick={() => setAdminModal({ isOpen: false, type: '', data: [] })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
                    </div>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }}><Search size={18} /></div>
                            <input 
                                type="text" 
                                className="input-field" 
                                placeholder="Cari data..." 
                                style={{ paddingLeft: '38px', margin: 0 }}
                                value={adminSearch}
                                onChange={(e) => setAdminSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ overflowY: 'auto', padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F8FAFC' }}>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {adminModal.type === 'dosen' && (
                                        <>
                                            <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Nama Dosen</th>
                                            <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Jumlah Bimbingan</th>
                                        </>
                                    )}
                                    {adminModal.type === 'mahasiswa' && (
                                        <>
                                            <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Nama Mahasiswa</th>
                                            <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Dosen Pendamping</th>
                                            <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Instansi Mitra</th>
                                        </>
                                    )}
                                    {adminModal.type === 'mitra' && (
                                        <>
                                            <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Nama Mitra</th>
                                            <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Jumlah Mahasiswa</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Data tidak ditemukan.</td></tr>
                                ) : filtered.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        {adminModal.type === 'dosen' && (
                                            <>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ fontWeight: 500 }}>{item.full_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NIDN/NUPTK: {item.identifier}</div>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>{item.mhsCount} Mahasiswa</td>
                                            </>
                                        )}
                                        {adminModal.type === 'mahasiswa' && (
                                            <>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ fontWeight: 500 }}>{item.full_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NIM: {item.identifier}</div>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>{item.dosenName}</td>
                                                <td style={{ padding: '16px 24px' }}>{item.partnerName}</td>
                                            </>
                                        )}
                                        {adminModal.type === 'mitra' && (
                                            <>
                                                <td style={{ padding: '16px 24px', fontWeight: 500 }}>{item.name}</td>
                                                <td style={{ padding: '16px 24px' }}>{item.mhsCount} Mahasiswa</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderAdminDashboard = () => (
        <div>
            <h3 style={{ marginBottom: '20px', fontSize: '1.25rem' }}>Overview Admin</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                <div onClick={() => { setAdminSearch(''); setAdminModal({ isOpen: true, type: 'dosen', data: adminData.dosen }) }} style={{ cursor: 'pointer' }}>
                    <StatCard title="Total Dosen Pendamping" value={adminData.dosen.length} icon={<Users />} color="#4F46E5" />
                </div>
                <div onClick={() => { setAdminSearch(''); setAdminModal({ isOpen: true, type: 'mahasiswa', data: adminData.mahasiswa }) }} style={{ cursor: 'pointer' }}>
                    <StatCard title="Total Mahasiswa Magang keseluruhan" value={adminData.mahasiswa.length} icon={<Activity />} color="#10B981" />
                </div>
                <div onClick={() => { setAdminSearch(''); setAdminModal({ isOpen: true, type: 'mitra', data: adminData.mitra }) }} style={{ cursor: 'pointer' }}>
                    <StatCard title="Total Mitra terdaftar" value={adminData.mitra.length} icon={<Briefcase />} color="#F59E0B" />
                </div>
            </div>
            {renderAdminModal()}
        </div>
    );

    const renderDosenDashboard = () => {
        const filteredStudents = dosenStudents.filter(student => 
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            student.partner.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div>
                <h3 style={{ marginBottom: '20px', fontSize: '1.25rem' }}>Dashboard Dosen</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                    <StatCard title="Mahasiswa Bimbingan" value={stats.total} icon={<Users />} color="#4F46E5" />
                    <StatCard title="Laporan Belum Diperiksa" value="Cek Menu" icon={<FileText />} color="#10B981" />
                </div>

                <div className="glass-panel" style={{ backgroundColor: 'white' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Daftar Mahasiswa Bimbingan</h4>
                        
                        <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
                            <div style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }}>
                                <Search size={18} />
                            </div>
                            <input 
                                type="text" 
                                className="input-field" 
                                placeholder="Cari nama atau mitra..." 
                                style={{ paddingLeft: '38px', margin: 0 }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Nama Mahasiswa</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Instansi Mitra</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Aksi Khusus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            Tidak ditemukan data mahasiswa yang sesuai.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '16px 24px', fontWeight: 500 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Users size={16} />
                                                    </div>
                                                    <div>
                                                        <div>{student.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>NIM: {student.identifier}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                                    <MapPin size={14} color="var(--text-muted)" />
                                                    {student.partner}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                <Link to="/dosen/monthly-reports" className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <FileText size={14} /> Cek Laporan
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderMahasiswaDashboard = () => {
        const progressPercentage = Math.round((mhsData.monthlyCount / 6) * 100);
        return (
            <div>
                <h3 style={{ marginBottom: '20px', fontSize: '1.25rem' }}>Status Magang Saya</h3>

                {stats.total === 0 ? (
                    <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'white', marginBottom: '24px' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '0' }}>Anda belum ditempatkan pada instansi magang oleh Admin Program.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                        <StatCard title="Pengajuan Magang" value={stats.total} icon={<Briefcase />} color="#4F46E5" />
                        <StatCard title="Status Pengajuan" value={stats.approved > 0 ? "Disetujui" : "Pending"} icon={<CheckCircle />} color={stats.approved > 0 ? "#10B981" : "#F59E0B"} />
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                    {/* Progress Bar Laporan Bulanan */}
                    <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <Calendar color="var(--primary)" />
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Persentase Laporan Bulanan</h4>
                        </div>
                        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600 }}>Terkumpul: {mhsData.monthlyCount} dari 6</span>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{progressPercentage}%</span>
                        </div>
                        <div style={{ width: '100%', backgroundColor: 'var(--border)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${progressPercentage}%`,
                                backgroundColor: 'var(--primary)',
                                transition: 'width 1s ease-in-out'
                            }}></div>
                        </div>
                    </div>

                    {/* Timeline Jurnal Harian */}
                    <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <Activity color="#10B981" />
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Riwayat Kegiatan Terbaru</h4>
                        </div>

                        {mhsData.dailyTimeline.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Belum ada logbook harian.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {mhsData.dailyTimeline.map((item, idx) => (
                                    <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981', marginTop: '6px' }}></div>
                                            {idx !== mhsData.dailyTimeline.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--border)', minHeight: '20px', marginTop: '4px' }}></div>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </div>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {item.activity}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Link to="/mahasiswa/daily-reports" style={{ display: 'block', marginTop: '16px', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 500 }}>Lihat Semua Laporan →</Link>
                    </div>

                </div>
            </div>
        );
    };

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Dashboard</h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    Selamat datang kembali, <strong>{userProfile?.full_name}</strong>.
                </p>
            </div>

            {userProfile?.role === 'admin' && renderAdminDashboard()}
            {userProfile?.role === 'dosen' && renderDosenDashboard()}
            {userProfile?.role === 'mahasiswa' && renderMahasiswaDashboard()}
        </div>
    );
}

const StatCard = ({ title, value, icon, color }) => (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'white' }}>
        <div style={{
            width: '56px', height: '56px', borderRadius: '12px',
            backgroundColor: `${color}15`, color: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {React.cloneElement(icon, { size: 28 })}
        </div>
        <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500, margin: '0 0 4px 0' }}>{title}</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{value}</p>
        </div>
    </div>
);
