import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Megaphone, Plus, Edit3, Trash2, Eye, EyeOff, Users, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const renderTextWithLinks = (text) => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            const href = part.startsWith('http') ? part : `https://${part}`;
            return <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', wordBreak: 'break-all' }} onClick={(e) => e.stopPropagation()}>{part}</a>;
        }
        return part;
    });
};

export default function ManajemenPengumuman() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        target_role: 'all',
        is_active: true
    });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('announcements')
            .select(`
                *,
                author:users_profile(full_name)
            `)
            .order('created_at', { ascending: false });

        if (!error && data) setAnnouncements(data);
        setLoading(false);
    };

    const handleOpenAdd = () => {
        setFormData({ title: '', content: '', target_role: 'all', is_active: true });
        setIsEditing(false);
        setShowModal(true);
    };

    const handleOpenEdit = (item) => {
        setFormData({
            title: item.title,
            content: item.content,
            target_role: item.target_role,
            is_active: item.is_active
        });
        setEditingId(item.id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = (id, title) => {
        setDeleteConfirm({ id, title });
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const { error } = await supabase.from('announcements').delete().eq('id', deleteConfirm.id);
        if (!error) {
            toast.success('Pengumuman berhasil dihapus.');
            fetchAnnouncements();
        } else {
            toast.error("Gagal menghapus: " + error.message);
        }
        setDeleteConfirm(null);
    };

    const handleToggleActive = async (id, currentStatus) => {
        const { error } = await supabase
            .from('announcements')
            .update({ is_active: !currentStatus })
            .eq('id', id);
        
        if (!error) {
            toast.success(`Pengumuman di${!currentStatus ? 'aktif' : 'non-aktif'}kan`);
            fetchAnnouncements();
        } else {
            toast.error("Gagal mengubah status: " + error.message);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isEditing) {
            const { error } = await supabase
                .from('announcements')
                .update({
                    title: formData.title,
                    content: formData.content,
                    target_role: formData.target_role,
                    is_active: formData.is_active,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingId);

            if (!error) {
                setShowModal(false);
                toast.success("Pengumuman diperbarui.");
                fetchAnnouncements();
            } else toast.error("Gagal perbarui: " + error.message);
        } else {
            const { error } = await supabase
                .from('announcements')
                .insert([{
                    title: formData.title,
                    content: formData.content,
                    target_role: formData.target_role,
                    is_active: formData.is_active,
                    created_by: session.user.id
                }]);

            if (!error) {
                setShowModal(false);
                toast.success("Pengumuman berhasil disiarkan.");
                fetchAnnouncements();
            } else toast.error("Gagal menyimpan: " + error.message);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Pengumuman Sistem</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kelola papan siaran pesan/informasi (Broadcast) kepada Mahasiswa dan Dosen.</p>
                </div>
                <button onClick={handleOpenAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Buat Pengumuman
                </button>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat pengumuman...</div>
                ) : announcements.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada pengumuman disiarkan.</div>
                ) : (
                    <div className="table-responsive-wrapper">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Judul Info</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Target Siaran</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Tanggal Dibuat</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {announcements.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '16px' }}>
                                            <button 
                                                onClick={() => handleToggleActive(item.id, item.is_active)}
                                                style={{ 
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 500,
                                                    backgroundColor: item.is_active ? '#ECFDF5' : '#F1F5F9',
                                                    color: item.is_active ? '#10B981' : '#64748B'
                                                }}
                                                title="Klik untuk ubah status"
                                            >
                                                {item.is_active ? <><CheckCircle size={14}/> Aktif</> : <><EyeOff size={14}/> Diarsipkan</>}
                                            </button>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: 500, color: 'var(--text-main)', marginBottom: '4px' }}>
                                                {item.title}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {renderTextWithLinks(item.content)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                                                {item.target_role === 'all' ? <Megaphone size={16}/> : <Users size={16}/>}
                                                {item.target_role === 'all' ? 'Semua User' : item.target_role}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleOpenEdit(item)} style={{ background: '#EFF6FF', border: 'none', color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '6px' }} title="Edit Pengumuman">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id, item.title)} style={{ background: '#FEF2F2', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '6px' }} title="Hapus Pengumuman">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>{isEditing ? 'Ubah Pengumuman' : 'Buat Pengumuman Baru'}</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Target Penerima Info</label>
                                <select 
                                    className="input-field"
                                    value={formData.target_role}
                                    onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                                >
                                    <option value="all">Semua Pengguna (Broadcast Publik)</option>
                                    <option value="mahasiswa">Hanya Mahasiswa Terdaftar</option>
                                    <option value="dosen">Hanya Dosen Pendamping</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Judul Pengumuman</label>
                                <input
                                    type="text" required className="input-field"
                                    placeholder="Contoh: Jadwal Pengumpulan Laporan Dipercepat"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Isi Pesan Detail</label>
                                <textarea
                                    required className="input-field" rows="5"
                                    placeholder="Tuliskan instruksi atau informasi rinci di sini..."
                                    value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                <button type="submit" className="btn-primary">
                                    {isEditing ? 'Simpan Peubahan' : 'Siarkan Pengumuman'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal Konfirmasi Hapus */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px 0', fontWeight: 500, fontSize: '1.05rem', color: '#1e293b' }}>
                            Yakin ingin menghapus seluruh jejak pengumuman berjudul "{deleteConfirm.title}"?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Batal
                            </button>
                            <button onClick={executeDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Hapus Acara
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
