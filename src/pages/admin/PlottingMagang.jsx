import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus, Briefcase, CheckCircle, Trash2, Edit3, Search,
    ChevronLeft, ChevronRight, User, GraduationCap, Building2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonTableRow } from '../../components/Skeleton';

const PAGE_SIZE = 15;

const STATUS_META = {
    approved: { label: 'Aktif',    bg: '#D1FAE5', color: '#059669' },
    finished: { label: 'Selesai',  bg: '#E0E7FF', color: '#4338CA' },
    pending:  { label: 'Pending',  bg: '#FEF3C7', color: '#D97706' },
    rejected: { label: 'Ditolak', bg: '#FEE2E2', color: '#DC2626' },
};

function StatusBadge({ status }) {
    const s = STATUS_META[status] || { label: status, bg: '#F1F5F9', color: '#64748B' };
    return (
        <span style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: 600, backgroundColor: s.bg, color: s.color }}>
            {s.label}
        </span>
    );
}

export default function PlottingMagang() {
    const [internships, setInternships] = useState([]);
    const [students, setStudents]       = useState([]);
    const [dosens, setDosens]           = useState([]);
    const [partners, setPartners]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [page, setPage]               = useState(1);

    // Modals
    const [showModal, setShowModal]       = useState(false);
    const [editingPlot, setEditingPlot]   = useState(null); // null = add, object = edit
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [formData, setFormData]         = useState({ student_id: '', dosen_id: '', partner_id: '', start_date: '', end_date: '' });
    const [saving, setSaving]             = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const [{ data: mhsData }, { data: dsnData }, { data: ptnData }, { data: intData }] = await Promise.all([
            supabase.from('users_profile').select('*').eq('role', 'mahasiswa').order('full_name'),
            supabase.from('users_profile').select('*').eq('role', 'dosen').order('full_name'),
            supabase.from('partners').select('*').order('name'),
            supabase.from('internships').select(`
                id, start_date, end_date, student_id, dosen_id, partner_id, company_name, status,
                student:users_profile!internships_student_id_fkey(full_name, identifier),
                dosen:users_profile!internships_dosen_id_fkey(full_name),
                partner:partners(name)
            `).order('created_at', { ascending: false }),
        ]);
        if (mhsData) setStudents(mhsData);
        if (dsnData) setDosens(dsnData);
        if (ptnData) setPartners(ptnData);
        if (intData) setInternships(intData);
        setLoading(false);
    };

    // ── Filter + Search + Pagination ──────────────────────
    const filtered = useMemo(() => {
        if (!search) return internships;
        const q = search.toLowerCase();
        return internships.filter(p =>
            p.student?.full_name?.toLowerCase().includes(q) ||
            p.student?.identifier?.toLowerCase().includes(q) ||
            p.dosen?.full_name?.toLowerCase().includes(q) ||
            (p.partner?.name || p.company_name || '').toLowerCase().includes(q)
        );
    }, [internships, search]);

    const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged       = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // ── Modal: Tambah ──────────────────────────────────────
    const handleOpenAdd = () => {
        setEditingPlot(null);
        setFormData({ student_id: '', dosen_id: '', partner_id: '', start_date: new Date().toISOString().split('T')[0], end_date: '' });
        setShowModal(true);
    };

    // ── Modal: Edit (hanya mitra, dosen, tanggal) ──────────
    const handleOpenEdit = (plot) => {
        setEditingPlot(plot);
        setFormData({
            student_id: plot.student_id,
            dosen_id:   plot.dosen_id,
            partner_id: plot.partner_id || '',
            start_date: plot.start_date || '',
            end_date:   plot.end_date   || '',
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.student_id || !formData.dosen_id || !formData.partner_id) {
            toast.error('Semua pilihan wajib diisi!'); return;
        }
        setSaving(true);
        const toastId = toast.loading(editingPlot ? 'Memperbarui plotting...' : 'Menyimpan plotting...');

        try {
            const selectedPartner = partners.find(p => p.id === formData.partner_id);
            const payload = {
                student_id:   formData.student_id,
                dosen_id:     formData.dosen_id,
                partner_id:   formData.partner_id,
                company_name: selectedPartner?.name,
                start_date:   formData.start_date,
                end_date:     formData.end_date,
            };

            if (editingPlot) {
                const { error } = await supabase.from('internships').update(payload).eq('id', editingPlot.id);
                if (error) throw error;
                toast.success('Plotting berhasil diperbarui!', { id: toastId });
            } else {
                // Cek duplikat
                const existing = internships.find(i => i.student_id === formData.student_id);
                if (existing) throw new Error('Mahasiswa ini sudah memiliki plot. Gunakan tombol Edit untuk memperbarui.');

                const { error } = await supabase.from('internships').insert([{ ...payload, status: 'approved' }]);
                if (error) throw error;
                toast.success('Plotting berhasil disimpan!', { id: toastId });
            }

            setShowModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const toastId = toast.loading('Membatalkan penempatan...');
        const { error } = await supabase.from('internships').delete().eq('id', deleteConfirm.id);
        if (!error) {
            toast.success('Penempatan dibatalkan.', { id: toastId });
            fetchData();
        } else {
            toast.error('Gagal: ' + error.message, { id: toastId });
        }
        setDeleteConfirm(null);
    };

    // Count status
    const activeCount   = internships.filter(i => i.status === 'approved').length;
    const finishedCount = internships.filter(i => i.status === 'finished').length;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Plotting Penempatan Magang</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Atur penempatan Mahasiswa, Dosen Pembimbing, dan Mitra Instansi.</p>
                </div>
                <button onClick={handleOpenAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                    <Plus size={16} /> Tambah Penempatan
                </button>
            </div>

            {/* Summary chips */}
            {!loading && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {[
                        { icon: <User size={13} />,       label: `${internships.length} Total Plotting`, bg: '#F1F5F9',  color: '#475569' },
                        { icon: <CheckCircle size={13} />, label: `${activeCount} Aktif`,                bg: '#D1FAE5',  color: '#059669' },
                        { icon: <Briefcase size={13} />,   label: `${finishedCount} Selesai`,            bg: '#E0E7FF',  color: '#4338CA' },
                    ].map(c => (
                        <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: c.bg, color: c.color }}>
                            {c.icon} {c.label}
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 260px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Cari nama mahasiswa, dosen, atau mitra..."
                        style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
                {search && <button onClick={() => { setSearch(''); setPage(1); }} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '7px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>× Hapus</button>}
                <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{filtered.length} penempatan</span>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                {['Mahasiswa', 'Dosen Pembimbing', 'Mitra / Instansi', 'Periode', 'Status', 'Aksi'].map(h => (
                                    <th key={h} style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
                            ) : paged.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {search ? 'Tidak ada penempatan yang sesuai pencarian.' : 'Belum ada mahasiswa yang ditempatkan.'}
                                </td></tr>
                            ) : paged.map(plot => (
                                <tr key={plot.id} style={{ borderBottom: '1px solid var(--border)' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#E0E7FF', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                                                {plot.student?.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.87rem' }}>{plot.student?.full_name || '—'}</p>
                                                {plot.student?.identifier && <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)' }}>{plot.student.identifier}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.87rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <GraduationCap size={13} color="var(--text-muted)" />
                                            {plot.dosen?.full_name || <span style={{ color: '#CBD5E1' }}>—</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.87rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Building2 size={13} color="var(--text-muted)" />
                                            {plot.partner?.name || plot.company_name || <span style={{ color: '#CBD5E1' }}>—</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.81rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {plot.start_date
                                            ? `${new Date(plot.start_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${plot.end_date ? new Date(plot.end_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}`
                                            : '—'}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}><StatusBadge status={plot.status} /></td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={() => handleOpenEdit(plot)}
                                                style={{ padding: '5px 11px', borderRadius: '5px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                                                <Edit3 size={13} /> Edit
                                            </button>
                                            <button onClick={() => setDeleteConfirm(plot)}
                                                style={{ padding: '5px 11px', borderRadius: '5px', border: '1px solid #FEE2E2', background: '#FFF5F5', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                                                <Trash2 size={13} /> Hapus
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && filtered.length > PAGE_SIZE && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', backgroundColor: '#FAFAFA' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} dari {filtered.length}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ width:'32px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',background:page===1?'#F8FAFC':'white',cursor:page===1?'not-allowed':'pointer',color:page===1?'#CBD5E1':'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                                <ChevronLeft size={15}/>
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ width:'32px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',background:page===totalPages?'#F8FAFC':'white',cursor:page===totalPages?'not-allowed':'pointer',color:page===totalPages?'#CBD5E1':'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                                <ChevronRight size={15}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '28px' }}>
                        <h2 style={{ marginBottom: '6px', fontSize: '1.1rem' }}>
                            {editingPlot ? 'Edit Plotting Magang' : 'Tambah Plotting Mahasiswa'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '20px' }}>
                            {editingPlot ? `Memperbarui penempatan untuk ${editingPlot.student?.full_name}` : 'Tentukan dosen, mitra, dan periode magang.'}
                        </p>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Mahasiswa — hanya bisa diubah saat tambah */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>
                                    Mahasiswa {editingPlot && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tidak dapat diubah)</span>}
                                </label>
                                <select required className="input-field" value={formData.student_id}
                                    onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                                    disabled={!!editingPlot}
                                    style={{ opacity: editingPlot ? 0.6 : 1 }}>
                                    <option value="" disabled>— Pilih Mahasiswa —</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.identifier || 'N/A'})</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Dosen Pembimbing</label>
                                <select required className="input-field" value={formData.dosen_id} onChange={e => setFormData({ ...formData, dosen_id: e.target.value })}>
                                    <option value="" disabled>— Pilih Dosen —</option>
                                    {dosens.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Mitra / Instansi</label>
                                <select required className="input-field" value={formData.partner_id} onChange={e => setFormData({ ...formData, partner_id: e.target.value })}>
                                    <option value="" disabled>— Pilih Mitra —</option>
                                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Tanggal Mulai</label>
                                    <input type="date" required className="input-field" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Tanggal Selesai</label>
                                    <input type="date" required className="input-field" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                                </div>
                            </div>

                            {!editingPlot && (
                                <div style={{ padding: '10px 14px', backgroundColor: '#ECFDF5', color: '#065F46', fontSize: '0.82rem', borderRadius: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <CheckCircle size={14} /> Plotting baru akan langsung berstatus "Aktif".
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.88rem' }}>Batal</button>
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : (editingPlot ? 'Simpan Perubahan' : 'Simpan Plotting')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                        <Trash2 size={36} color="#EF4444" style={{ margin: '0 auto 14px' }} />
                        <p style={{ fontWeight: 600, marginBottom: '6px' }}>Batalkan Penempatan?</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
                            Penempatan <strong>{deleteConfirm.student?.full_name}</strong> di <strong>{deleteConfirm.partner?.name || deleteConfirm.company_name}</strong> akan dihapus.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '9px 22px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Batal</button>
                            <button onClick={executeDelete} style={{ padding: '9px 22px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Ya, Batalkan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
