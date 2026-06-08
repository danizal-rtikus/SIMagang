import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Lock, Unlock, Users, RefreshCw, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminSesiPenilaian() {
    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, open, closed
    
    // Modal states
    const [showConfirmReopen, setShowConfirmReopen] = useState(false);
    const [selectedInternship, setSelectedInternship] = useState(null);
    const [reopening, setReopening] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [selectedDosenId, setSelectedDosenId] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('internships')
                .select(`
                    id,
                    status,
                    penilaian_status,
                    student:users_profile!internships_student_id_fkey(id, full_name, identifier),
                    dosen:users_profile!internships_dosen_id_fkey(id, full_name, identifier),
                    partner:partners(id, name)
                `)
                .in('status', ['approved', 'finished']);

            if (error) throw error;
            setInternships(data || []);
        } catch (err) {
            toast.error('Gagal mengambil data sesi penilaian: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReopenClick = (internship) => {
        setSelectedInternship(internship);
        setShowConfirmReopen(true);
    };

    const executeReopen = async () => {
        if (!selectedInternship) return;
        setReopening(true);
        try {
            const { error } = await supabase
                .from('internships')
                .update({ penilaian_status: 'open' })
                .eq('id', selectedInternship.id);

            if (error) throw error;

            setInternships(prev =>
                prev.map(item =>
                    item.id === selectedInternship.id
                        ? { ...item, penilaian_status: 'open' }
                        : item
                )
            );
            toast.success(`Sesi penilaian untuk ${selectedInternship.student?.full_name} berhasil dibuka kembali!`);
            setShowConfirmReopen(false);
        } catch (err) {
            toast.error('Gagal membuka sesi: ' + err.message);
        } finally {
            setReopening(false);
        }
    };

    // Calculate stats
    // Extract unique lecturers who have active bimbingan
    const uniqueDosenList = [];
    const dosenMap = new Map();
    internships.forEach(item => {
        if (item.dosen && !dosenMap.has(item.dosen.id)) {
            dosenMap.set(item.dosen.id, true);
            uniqueDosenList.push(item.dosen);
        }
    });
    uniqueDosenList.sort((a, b) => a.full_name.localeCompare(b.full_name));

    const totalCount = internships.length;
    const openCount  = internships.filter(i => i.penilaian_status !== 'closed').length;
    const closedCount = internships.filter(i => i.penilaian_status === 'closed').length;

    // Filtered data
    const filteredData = internships.filter(item => {
        const studentName = item.student?.full_name?.toLowerCase() || '';
        const studentNim = item.student?.identifier?.toLowerCase() || '';
        const dosenName = item.dosen?.full_name?.toLowerCase() || '';
        const searchLower = searchQuery.toLowerCase();
        
        const matchesSearch = studentName.includes(searchLower) || studentNim.includes(searchLower) || dosenName.includes(searchLower);
        
        const status = item.penilaian_status || 'open';
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'open' && status === 'open') ||
                             (statusFilter === 'closed' && status === 'closed');
                             
        return matchesSearch && matchesStatus;
    });

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Sesi Penilaian Magang</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Pantau dan kelola sesi penilaian mahasiswa oleh dosen pembimbing.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setShowPrintModal(true); setSelectedDosenId(''); }} className="btn-primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer', padding: '8px 16px', background: 'var(--primary, #F6821F)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600 }}>
                        <Printer size={15} /> Cetak Laporan per Dosen
                    </button>
                    <button onClick={fetchData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer', padding: '8px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        <RefreshCw size={14} className={loading ? 'spin-anim' : ''} /> Segarkan
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: 'white' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={22} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Mahasiswa Aktif</p>
                        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalCount}</p>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: 'white' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Unlock size={22} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Sesi Penilaian Terbuka</p>
                        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#D97706' }}>{openCount}</p>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: 'white' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#FAF5FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={22} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Sesi Penilaian Ditutup</p>
                        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#7C3AED' }}>{closedCount}</p>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="glass-panel" style={{ padding: '16px 20px', backgroundColor: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                    <span style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }}>
                        <Search size={16} />
                    </span>
                    <input
                        type="text"
                        placeholder="Cari mahasiswa atau dosen pembimbing..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.88rem', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                        { id: 'all', label: 'Semua Status' },
                        { id: 'open', label: 'Terbuka' },
                        { id: 'closed', label: 'Ditutup' }
                    ].map(btn => {
                        const active = statusFilter === btn.id;
                        return (
                            <button
                                key={btn.id}
                                onClick={() => setStatusFilter(btn.id)}
                                style={{
                                    padding: '6px 14px',
                                    border: active ? 'none' : '1px solid var(--border)',
                                    borderRadius: '20px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    backgroundColor: active ? 'var(--primary, #F6821F)' : 'white',
                                    color: active ? 'white' : 'var(--text-muted)',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {btn.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Memuat data sesi penilaian...
                </div>
            ) : (
                <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mahasiswa</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Instansi Mitra</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Dosen Pembimbing</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status Sesi</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'right' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            Tidak ada data sesi penilaian yang sesuai.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map(item => {
                                        const status = item.penilaian_status || 'open';
                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{item.student?.full_name || 'Tanpa Nama'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>NIM: {item.student?.identifier || 'N/A'}</div>
                                                </td>
                                                <td style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                                    {item.partner?.name || 'Belum diplot'}
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{item.dosen?.full_name || 'Belum ditunjuk'}</div>
                                                    {item.dosen?.identifier && (
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>NIDN: {item.dosen.identifier}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    {status === 'closed' ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#EDE9FE', color: '#7C3AED', fontSize: '0.78rem', fontWeight: 600 }}>
                                                            <Lock size={12} /> Ditutup
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '0.78rem', fontWeight: 600 }}>
                                                            <Unlock size={12} /> Terbuka
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                    {status === 'closed' ? (
                                                        <button
                                                            onClick={() => handleReopenClick(item)}
                                                            className="btn-secondary"
                                                            style={{
                                                                padding: '6px 12px',
                                                                border: '1px solid #7C3AED',
                                                                backgroundColor: 'white',
                                                                color: '#7C3AED',
                                                                borderRadius: '6px',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s'
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FAF5FF'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; }}
                                                        >
                                                            Buka Sesi
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aktif</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Confirm Reopen Modal */}
            {showConfirmReopen && selectedInternship && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '10px', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Unlock size={28} />
                        </div>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Buka Kembali Sesi Penilaian?</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '24px', lineHeight: 1.5 }}>
                            Anda akan membuka kembali sesi penilaian untuk <strong>{selectedInternship.student?.full_name}</strong>.<br />
                            Dosen Pembimbing (<strong>{selectedInternship.dosen?.full_name}</strong>) dapat mengubah nilai kembali, dan nilai tidak akan lagi ditampilkan pada mahasiswa sampai sesi ditutup kembali.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setShowConfirmReopen(false)} disabled={reopening} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Batal</button>
                            <button onClick={executeReopen} disabled={reopening} style={{ padding: '10px 22px', border: 'none', borderRadius: '6px', background: '#D97706', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                                {reopening ? 'Memproses...' : 'Ya, Buka Sesi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Selection Modal */}
            {showPrintModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '10px', maxWidth: '450px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Printer size={28} />
                        </div>
                        <h3 style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>Cetak Rekap Nilai Dosen</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '20px', lineHeight: 1.4 }}>
                            Pilih Dosen Pendamping untuk mencetak rekapitulasi nilai mahasiswa bimbingannya.
                        </p>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Dosen Pendamping</label>
                            <select 
                                value={selectedDosenId}
                                onChange={e => setSelectedDosenId(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.88rem', outline: 'none' }}
                            >
                                <option value="">-- Pilih Dosen Pendamping --</option>
                                {uniqueDosenList.map(d => (
                                    <option key={d.id} value={d.id}>{d.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowPrintModal(false)} style={{ padding: '9px 18px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Batal</button>
                            <button 
                                onClick={() => {
                                    if (!selectedDosenId) { toast.error('Pilih Dosen Pendamping terlebih dahulu!'); return; }
                                    window.open(`/admin/print-nilai-dosen/${selectedDosenId}`, '_blank');
                                    setShowPrintModal(false);
                                }}
                                style={{ padding: '9px 22px', border: 'none', borderRadius: '6px', background: 'var(--primary, #F6821F)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                            >
                                Cetak
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .spin-anim {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
