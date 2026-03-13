import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, Building, MapPin, Plus, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ManajemenMitra() {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [formData, setFormData] = useState({ name: '', address: '', quota: 0 });

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .order('name', { ascending: true });

        if (!error && data) setPartners(data);
        setLoading(false);
    };

    const handleOpenAdd = () => {
        setFormData({ name: '', address: '', quota: 0 });
        setIsEditing(false);
        setShowModal(true);
    };

    const handleOpenEdit = (partner) => {
        setFormData({ name: partner.name, address: partner.address, quota: partner.quota });
        setEditingId(partner.id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = (id, name) => {
        setDeleteConfirm({ id, name });
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const { error } = await supabase.from('partners').delete().eq('id', deleteConfirm.id);
        if (!error) {
            toast.success('Mitra berhasil dihapus.');
            fetchPartners();
        } else {
            toast.error("Gagal menghapus: " + error.message);
        }
        setDeleteConfirm(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isEditing) {
            const { error } = await supabase
                .from('partners')
                .update({ name: formData.name, address: formData.address, quota: parseInt(formData.quota) })
                .eq('id', editingId);

            if (!error) {
                setShowModal(false);
                toast.success("Data mitra diperbarui.");
                fetchPartners();
            } else toast.error("Gagal perbarui: " + error.message);
        } else {
            const { error } = await supabase
                .from('partners')
                .insert([{ name: formData.name, address: formData.address, quota: parseInt(formData.quota), quota_used: 0 }]);

            if (!error) {
                setShowModal(false);
                toast.success("Mitra baru ditambahkan.");
                fetchPartners();
            } else toast.error("Gagal menyimpan: " + error.message);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Manajemen Mitra Program Magang</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kelola daftar instansi perusahaan tempat mahasiswa melaksanakan magang.</p>
                </div>
                <button onClick={handleOpenAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Tambah Mitra
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Memuat data mitra...</p>
                ) : partners.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Belum ada mitra instansi terdaftar.</p>
                ) : (
                    partners.map(partner => (
                        <div key={partner.id} className="glass-panel" style={{ padding: '24px', backgroundColor: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', backgroundColor: '#E0E7FF', color: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{partner.name}</h3>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{partner.address || 'Alamat belum diatur'}</span>
                            </div>

                            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Kuota Disediakan</span>
                                    <strong style={{ fontSize: '1.1rem' }}>{partner.quota}</strong>
                                </div>
                                {/*<div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Terisi</span>
                  <strong style={{ fontSize: '1.1rem', color: partner.quota_used >= partner.quota ? '#EF4444' : 'var(--text-main)' }}>{partner.quota_used}</strong>
                </div>*/}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <button onClick={() => handleOpenEdit(partner)} className="input-field" style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                                    <Edit3 size={14} /> Ubah
                                </button>
                                <button onClick={() => handleDelete(partner.id, partner.name)} className="input-field" style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', color: '#EF4444', backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }}>
                                    <Trash2 size={14} /> Hapus
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>{isEditing ? 'Ubah Data Mitra' : 'Tambah Mitra Baru'}</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nama Instansi / Perusahaan</label>
                                <input
                                    type="text" required className="input-field"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Alamat Lengkap</label>
                                <textarea
                                    required className="input-field" rows="3"
                                    value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                ></textarea>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Kuota Mahasiswa</label>
                                <input
                                    type="number" min="0" required className="input-field"
                                    value={formData.quota}
                                    onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                <button type="submit" className="btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px 0', fontWeight: 500, fontSize: '1.05rem', color: '#1e293b' }}>
                            Yakin ingin menghapus {deleteConfirm.name}? Data magang yang terikat mungkin akan kehilangan relasinya.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Batal
                            </button>
                            <button onClick={executeDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
