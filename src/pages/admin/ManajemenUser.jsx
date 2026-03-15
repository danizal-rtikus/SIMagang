import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Shield, Edit3, MapPin, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ManajemenUser() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [formData, setFormData] = useState({ full_name: '', identifier: '', role: 'mahasiswa', email: '', password: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data: profileData, error: profileError } = await supabase
            .from('users_profile')
            .select('*')
            .order('created_at', { ascending: false });

        if (!profileError && profileData) {
            let combinedUsers = profileData;

            setUsers(combinedUsers);
        }
        setLoading(false);
    };

    const handleAdd = () => {
        setIsAddMode(true);
        setEditingUser(null);
        setFormData({ 
            full_name: '', 
            identifier: '',
            role: 'dosen',
            email: '',
            password: ''
        });
        setShowModal(true);
    };

    const handleEdit = (user) => {
        setIsAddMode(false);
        setEditingUser(user);
        setFormData({ 
            full_name: user.full_name, 
            identifier: user.identifier || '',
            role: user.role,
            email: user.email || '',
            password: '' // Kosongkan, hanya diisi kalau mau memgubah pass
        });
        setShowModal(true);
    };

    const handleDelete = (user) => {
        setDeleteConfirm(user);
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;

        toast.loading('Sedang menghapus pengguna secara permanen...', { id: 'delete' });
        
        try {
            const { error, data } = await supabase.functions.invoke('admin-user-manage', {
                body: { action: 'deleteUser', payload: { userId: deleteConfirm.id } }
            });
            
            if (!data?.success || error) {
                throw new Error(data?.error || error?.message || 'Gagal menghapus');
            }

            toast.success(`Pengguna ${deleteConfirm.full_name} berhasil dihapus.`, { id: 'delete' });
            fetchUsers();
            setDeleteConfirm(null);
        } catch (err) {
            toast.error(err.message, { id: 'delete' });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        toast.loading(isAddMode ? 'Mendaftarkan pengguna...' : 'Menyimpan perubahan...', { id: 'save' });

        if (isAddMode) {
            if (!formData.password || !formData.email) {
                toast.error("Email dan password wajib diisi untuk mendafarkan pengguna baru!", { id: 'save' });
                return;
            }

            try {
                const { data, error } = await supabase.functions.invoke('admin-user-manage', {
                    body: { 
                        action: 'createUser', 
                        payload: { 
                            email: formData.email, 
                            password: formData.password, 
                            full_name: formData.full_name,
                            identifier: formData.identifier,
                            role: formData.role
                        } 
                    }
                });

                if (!data?.success || error) {
                    throw new Error(data?.error || error?.message || 'Gagal mendaftar');
                }

                toast.success("Pengguna baru berhasil ditambahkan!", { id: 'save' });
                setShowModal(false);
                fetchUsers();
            } catch (err) {
                toast.error(err.message, { id: 'save' });
            }
            return;
        }

        let hasError = false;

        // 1. Update profil dasar di tabel public.users_profile
        const { error: profileError } = await supabase
            .from('users_profile')
            .update({ full_name: formData.full_name, identifier: formData.identifier, role: formData.role })
            .eq('id', editingUser.id);

        if (profileError) {
            toast.error("Gagal memperbarui profil: " + profileError.message, { id: 'save' });
            hasError = true;
        }

        // 2. Update kredensial via secure Edge Function (jika email atau password diisi)
        if (!hasError && (formData.email !== editingUser.email || formData.password)) {
            try {
                const { data, error } = await supabase.functions.invoke('admin-user-manage', {
                    body: {
                        action: 'updateUser',
                        payload: {
                            userId: editingUser.id,
                            email: formData.email !== editingUser.email ? formData.email : undefined,
                            password: formData.password ? formData.password : undefined
                        }
                    }
                });

                if (!data?.success || error) {
                    throw new Error(data?.error || error?.message || 'Gagal update auth');
                }
            } catch (err) {
                toast.error(err.message, { id: 'save' });
                hasError = true;
            }
        }

        if (!hasError) {
            setShowModal(false);
            fetchUsers();
            toast.success("Data pengguna berhasil diperbarui!", { id: 'save' });
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Manajemen User</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kelola data profil dan hak akses seluruh pengguna sistem.</p>
                </div>
                <button onClick={handleAdd} className="btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserPlus size={18} /> Tambah Pengguna
                </button>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat pengguna...</div>
                ) : (
                    <div className="table-responsive-wrapper">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Nama & Email</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>No. Identitas</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Hak Akses (Role)</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Terdaftar Pada</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <div>{user.full_name}</div>
                                                    {user.email && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>{user.email}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                            {user.identifier ? (
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span>{user.identifier}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                                                        {user.role === 'mahasiswa' ? 'NIM' : user.role === 'dosen' ? 'NIDN/NPK' : 'ID'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>Belum diatur</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span className="badge" style={{
                                                backgroundColor: user.role === 'admin' ? '#FEF2F2' : user.role === 'dosen' ? '#E0E7FF' : '#F3F4F6',
                                                color: user.role === 'admin' ? '#EF4444' : user.role === 'dosen' ? '#4F46E5' : '#374151'
                                            }}>
                                                {user.role === 'admin' && <Shield size={12} style={{ marginRight: '4px' }} />}
                                                {user.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '0.9rem' }}>{new Date(user.created_at).toLocaleDateString('id-ID')}</td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => handleEdit(user)} className="input-field" style={{ width: 'auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                                    <Edit3 size={14} /> Ubah
                                                </button>
                                                <button onClick={() => handleDelete(user)} style={{ background: '#FEF2F2', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem' }} title="Hapus Pengguna">
                                                    <Trash2 size={14} /> Hapus
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

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>{isAddMode ? 'Tambah Pengguna Baru' : 'Ubah Data Pengguna'}</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nama Lengkap</label>
                                <input
                                    type="text" required className="input-field"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>No. Identitas (NIM / NIDN)</label>
                                <input
                                    type="text" required className="input-field"
                                    placeholder="Masukkan NIM atau NIP/NIDN Dosen"
                                    value={formData.identifier}
                                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Hak Akses</label>
                                <select
                                    className="input-field"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="mahasiswa">Mahasiswa</option>
                                    <option value="dosen">Dosen</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#EF4444' }}>Perhatian: Mengubah role dapat berdampak pada hak akses dan menu pengguna!</p>
                            </div>

                            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>Login & Keamanan</h4>
                                
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Email Login Pilihan</label>
                                    <input
                                        type="email" className="input-field" required={isAddMode}
                                        placeholder="user@email.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>{isAddMode ? 'Sandi Baru' : 'Sandi Baru (Optional)'}</label>
                                    <input
                                        type="password" className="input-field" required={isAddMode}
                                        placeholder={isAddMode ? "Ketik kata sandi (min. 6 karakter)" : "Kosongkan jika tidak diubah"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>


                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                <button type="submit" className="btn-primary">Simpan</button>
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
                            Yakin ingin menghapus pengguna "{deleteConfirm.full_name}" secara permanen?
                        </p>
                        <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#EF4444' }}>
                            Tindakan ini tidak dapat dibatalkan dan akan menghapus semua file serta riwayat yang terhubung!
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Batal
                            </button>
                            <button onClick={executeDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Hapus Permanen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
