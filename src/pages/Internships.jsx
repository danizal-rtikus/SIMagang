import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Plus, Check, X, FileEdit } from 'lucide-react';

export default function Internships() {
    const { userProfile } = useOutletContext();
    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dosens, setDosens] = useState([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ company_name: '', start_date: '', end_date: '' });

    useEffect(() => {
        fetchInternships();
        if (userProfile.role === 'admin') {
            fetchDosens();
        }
    }, [userProfile]);

    const fetchInternships = async () => {
        setLoading(true);
        let query = supabase.from('internships').select(`
      *,
      student:student_id(full_name),
      dosen:dosen_id(full_name)
    `).order('created_at', { ascending: false });

        if (userProfile.role === 'mahasiswa') {
            query = query.eq('student_id', userProfile.id);
        } else if (userProfile.role === 'dosen') {
            query = query.eq('dosen_id', userProfile.id);
        }

        const { data, error } = await query;
        if (!error && data) {
            setInternships(data);
        }
        setLoading(false);
    };

    const fetchDosens = async () => {
        const { data, error } = await supabase.from('users_profile').select('id, full_name').eq('role', 'dosen');
        if (!error && data) setDosens(data);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('internships').insert([{
            student_id: userProfile.id,
            company_name: formData.company_name,
            start_date: formData.start_date,
            end_date: formData.end_date
        }]);

        if (!error) {
            setShowModal(false);
            setFormData({ company_name: '', start_date: '', end_date: '' });
            fetchInternships();
        } else {
            toast.error('Gagal menambahkan data: ' + error.message);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        const { error } = await supabase.from('internships').update({ status }).eq('id', id);
        if (!error) fetchInternships();
    };

    const handleAssignDosen = async (id, dosen_id) => {
        const { error } = await supabase.from('internships').update({ dosen_id }).eq('id', id);
        if (!error) fetchInternships();
    };

    const getStatusBadge = (status) => {
        const specs = {
            pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'Menunggu' },
            approved: { color: '#10B981', bg: '#D1FAE5', label: 'Disetujui' },
            rejected: { color: '#EF4444', bg: '#FEE2E2', label: 'Ditolak' },
            finished: { color: '#4F46E5', bg: '#E0E7FF', label: 'Selesai' }
        };
        const s = specs[status] || specs.pending;
        return (
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: s.color, backgroundColor: s.bg }}>
                {s.label}
            </span>
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Data Magang</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kelola data pengajuan instansi magang.</p>
                </div>

                {userProfile.role === 'mahasiswa' && (
                    <button onClick={() => setShowModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Ajukan Baru
                    </button>
                )}
            </div>

            <div className="glass-panel" style={{ overflowX: 'auto', backgroundColor: 'white' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
                ) : internships.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data magang.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Instansi</th>
                                {userProfile.role !== 'mahasiswa' && <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Mahasiswa</th>}
                                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Tanggal Pelaksanaan</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Dosen Pembimbing</th>
                                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                                {userProfile.role === 'admin' && <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {internships.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: 500 }}>{item.company_name}</td>
                                    {userProfile.role !== 'mahasiswa' && <td style={{ padding: '16px 24px' }}>{item.student?.full_name}</td>}
                                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>
                                        {new Date(item.start_date).toLocaleDateString('id-ID')} - {new Date(item.end_date).toLocaleDateString('id-ID')}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        {userProfile.role === 'admin' ? (
                                            <select
                                                className="input-field"
                                                style={{ padding: '6px 12px', minWidth: '150px' }}
                                                value={item.dosen_id || ''}
                                                onChange={(e) => handleAssignDosen(item.id, e.target.value)}
                                            >
                                                <option value="">-- Pilih Dosen --</option>
                                                {dosens.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                            </select>
                                        ) : (
                                            <span style={{ color: item.dosen?.full_name ? 'inherit' : 'var(--text-muted)' }}>
                                                {item.dosen?.full_name || 'Belum ditentukan'}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>{getStatusBadge(item.status)}</td>

                                    {userProfile.role === 'admin' && (
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {item.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleUpdateStatus(item.id, 'approved')} title="Setujui" style={{ color: '#10B981', padding: '6px', backgroundColor: '#D1FAE5', borderRadius: '6px' }}>
                                                            <Check size={18} />
                                                        </button>
                                                        <button onClick={() => handleUpdateStatus(item.id, 'rejected')} title="Tolak" style={{ color: '#EF4444', padding: '6px', backgroundColor: '#FEE2E2', borderRadius: '6px' }}>
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {item.status === 'approved' && (
                                                    <button onClick={() => handleUpdateStatus(item.id, 'finished')} title="Tandai Selesai" style={{ color: '#4F46E5', padding: '6px', backgroundColor: '#E0E7FF', borderRadius: '6px' }}>
                                                        <FileEdit size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Pengajuan Baru */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Ajukan Tempat Magang Baru</h2>
                        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nama Instansi / Perusahaan</label>
                                <input
                                    type="text" required className="input-field"
                                    value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                    placeholder="Misal: PT Teknologi Nusantara"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tanggal Mulai</label>
                                    <input
                                        type="date" required className="input-field"
                                        value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tanggal Selesai</label>
                                    <input
                                        type="date" required className="input-field"
                                        value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                <button type="submit" className="btn-primary">Kirim Pengajuan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
