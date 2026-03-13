import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Briefcase, Plus, MapPin, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PlottingMagang() {
    const [internships, setInternships] = useState([]);
    const [students, setStudents] = useState([]);
    const [dosens, setDosens] = useState([]);
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [formData, setFormData] = useState({
        student_id: '',
        dosen_id: '',
        partner_id: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // Fetch all related entities for dropdowns
        const [
            { data: mhsData },
            { data: dsnData },
            { data: ptnData },
            { data: intData }
        ] = await Promise.all([
            supabase.from('users_profile').select('*').eq('role', 'mahasiswa').order('full_name'),
            supabase.from('users_profile').select('*').eq('role', 'dosen').order('full_name'),
            supabase.from('partners').select('*').order('name'),
            supabase.from('internships').select(`
            id, start_date, end_date, student_id, dosen_id, partner_id, company_name, status,
            student:users_profile!internships_student_id_fkey(full_name),
            dosen:users_profile!internships_dosen_id_fkey(full_name),
            partner:partners(name)
        `).order('created_at', { ascending: false })
        ]);

        if (mhsData) setStudents(mhsData);
        if (dsnData) setDosens(dsnData);
        if (ptnData) setPartners(ptnData);

        // Map internships and flatten relation data safely
        if (intData) setInternships(intData);

        setLoading(false);
    };

    const handleOpenAdd = () => {
        setFormData({
            student_id: '',
            dosen_id: '',
            partner_id: '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: ''
        });
        setShowModal(true);
    };

    const handleDelete = (id, studentName) => {
        setDeleteConfirm({ id, studentName });
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const { error } = await supabase.from('internships').delete().eq('id', deleteConfirm.id);
        if (!error) {
            toast.success('Penempatan dibatalkan.');
            fetchData();
        } else {
            toast.error("Gagal membatalkan: " + error.message);
        }
        setDeleteConfirm(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.student_id || !formData.dosen_id || !formData.partner_id) {
            toast.error("Semua pilihan wajib diisi!");
            return;
        }

        const selectedPartner = partners.find(p => p.id === formData.partner_id);

        // Cek apakah mahasiswa ini sudah ada penempatannya
        const existing = internships.find(i => i.student_id === formData.student_id);
        if (existing) {
            toast.error("Mahasiswa ini sudah memiliki plot/penempatan. Harap hapus penempatan lama jika ingin memperbarui.");
            return;
        }

        const { error } = await supabase
            .from('internships')
            .insert([{
                student_id: formData.student_id,
                dosen_id: formData.dosen_id,
                partner_id: formData.partner_id,
                company_name: selectedPartner?.name, // fallback as demanded by original schema
                start_date: formData.start_date,
                end_date: formData.end_date,
                status: 'approved' // Automatically Approved because Admin sets it
            }]);

        if (!error) {
            setShowModal(false);
            fetchData();
            toast.success("Penempatan berhasil disimpan!");
        } else {
            toast.error("Gagal menempatkan mahasiswa: " + error.message);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Plotting Penempatan Magang</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Atur hubungan pendampingan antara Dosen, Mahasiswa, dan Mitra Instansi.</p>
                </div>
                <button onClick={handleOpenAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Tambah Penempatan Baru
                </button>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat relasi penempatan...</div>
                ) : internships.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada mahasiswa yang ditempatkan/diplot.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Mahasiswa</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Dosen Pendamping</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Instansi/Mitra</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Waktu Magang</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {internships.map((plot) => (
                                    <tr key={plot.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px', fontWeight: 500, color: 'var(--primary)' }}>
                                            {plot.student?.full_name || 'Tanpa Nama'}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '0.95rem' }}>
                                            {plot.dosen?.full_name || 'Belum Diplot'}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '0.95rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Briefcase size={14} color="var(--text-muted)" />
                                                {plot.partner?.name || plot.company_name || 'Tidak Ada Instansi'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            {new Date(plot.start_date).toLocaleDateString('id-ID')} - {new Date(plot.end_date).toLocaleDateString('id-ID')}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <button
                                                onClick={() => handleDelete(plot.id, plot.student?.full_name)}
                                                className="input-field"
                                                style={{ width: 'auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#EF4444', backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }}
                                            >
                                                <Trash2 size={14} /> Batal Penempatan
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Tambah Plotting Mahasiswa</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Pilih Mahasiswa</label>
                                <select required className="input-field" value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}>
                                    <option value="" disabled>--- Pilih Mahasiswa ---</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Pilih Dosen Pendamping</label>
                                <select required className="input-field" value={formData.dosen_id} onChange={(e) => setFormData({ ...formData, dosen_id: e.target.value })}>
                                    <option value="" disabled>--- Pilih Dosen ---</option>
                                    {dosens.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Pilih Instansi Penempatan (Mitra)</label>
                                <select required className="input-field" value={formData.partner_id} onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}>
                                    <option value="" disabled>--- Pilih Mitra / Perusahaan ---</option>
                                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tanggal Mulai</label>
                                    <input type="date" required className="input-field" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tanggal Selesai</label>
                                    <input type="date" required className="input-field" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ padding: '12px', backgroundColor: '#ECFDF5', color: '#065F46', fontSize: '0.85rem', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                                <CheckCircle size={16} />
                                Plotting akan langsung berstatus "Disetujui" (Approved) dan Mahasiswa dapat mulai Magang.
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                <button type="submit" className="btn-primary">Simpan Plotting</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px 0', fontWeight: 500, fontSize: '1.05rem', color: '#1e293b' }}>
                            Yakin ingin membatalkan penempatan magang untuk {deleteConfirm.studentName}?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Batal
                            </button>
                            <button onClick={executeDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Batalkan Penempatan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
