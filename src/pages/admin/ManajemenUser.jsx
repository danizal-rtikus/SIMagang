import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
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

            // Jika ada akses ke auth.admin, gabungkan dengan data email
            if (supabaseAdmin) {
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
                if (!authError && authData?.users) {
                    combinedUsers = profileData.map(p => {
                        const authMatch = authData.users.find(u => u.id === p.id);
                        return { ...p, email: authMatch?.email || '' };
                    });
                }
            }
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
        
        if (!supabaseAdmin) {
            toast.error("Tidak dapat menghapus pengguna secara permanen tanpa konfigurasi VITE_SUPABASE_SERVICE_ROLE_KEY di file .env");
            setDeleteConfirm(null);
            return;
        }

        // Hapus pengguna dari auth.users menggunakan admin API (cascade akan menghapus dari users_profile otomatis)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(deleteConfirm.id);
        
        if (!error) {
            toast.success(`Pengguna ${deleteConfirm.full_name} berhasil dihapus.`);
            fetchUsers();
        } else {
            toast.error("Gagal menghapus pengguna: " + error.message);
        }
        setDeleteConfirm(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (isAddMode) {
            if (!supabaseAdmin) {
                toast.error("Penambahan user baru memerlukan konfigurasi VITE_SUPABASE_SERVICE_ROLE_KEY di file .env");
                return;
            }
            if (!formData.password || !formData.email) {
                toast.error("Email dan password wajib diisi untuk mendafarkan pengguna baru!");
                return;
            }

            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: formData.email,
                password: formData.password,
                email_confirm: true // bypass konfirmasi email
            });

            if (authError) {
                toast.error("Gagal mendaftarkan autentikasi: " + authError.message);
                return;
            }

            if (authData.user) {
                const { error: profileError } = await supabase.from('users_profile').insert([{
                    id: authData.user.id,
                    full_name: formData.full_name,
                    identifier: formData.identifier,
                    role: formData.role
                }]);

                if (profileError) {
                    toast.error("Gagal menyimpan profil: " + profileError.message);
                } else {
                    toast.success("Pengguna baru berhasil ditambahkan!");
                    setShowModal(false);
                    fetchUsers();
                }
            }
            return;
        }

        let hasError = false;

        // 1. Update profil di tabel public.users_profile
        const { error: profileError } = await supabase
            .from('users_profile')
            .update({ full_name: formData.full_name, identifier: formData.identifier, role: formData.role })
            .eq('id', editingUser.id);

        if (profileError) {
            toast.error("Gagal memperbarui profil: " + profileError.message);
            hasError = true;
        }

        // 2. Update auth.users (email & password jika diisi) jika memiliki hak akses Service Role
        if (!hasError && (formData.email !== editingUser.email || formData.password)) {
            if (!supabaseAdmin) {
                toast.error("Tidak dapat memperbarui kredensial tanpa SERVICE_ROLE_KEY. Profil tetap tersimpan.");
            } else {
                let updates = {};
                if (formData.email !== editingUser.email) updates.email = formData.email;
                if (formData.password) updates.password = formData.password;

                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                    editingUser.id,
                    updates
                );

                if (authError) {
                    toast.error("Gagal memperbarui autentikasi: " + authError.message);
                    hasError = true;
                }
            }
        }

        if (!hasError) {
            setShowModal(false);
            fetchUsers();
            toast.success("Data pengguna berhasil diperbarui!");
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Manajemen User</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kelola data profil dan hak akses seluruh pengguna sistem.</p>
                </div>
                {supabaseAdmin && (
                    <button onClick={handleAdd} className="btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={18} /> Tambah Pengguna
                    </button>
                )}
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
                                                {supabaseAdmin && (
                                                    <button onClick={() => handleDelete(user)} style={{ background: '#FEF2F2', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem' }} title="Hapus Pengguna">
                                                        <Trash2 size={14} /> Hapus
                                                    </button>
                                                )}
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
                                {!supabaseAdmin && (
                                    <div style={{ marginBottom: '16px', fontSize: '0.8ren', color: '#B45309', backgroundColor: '#FEF3C7', padding: '8px', borderRadius: '6px' }}>
                                        ⚠️ Untuk dapat mengubah Email/Sandi, Anda wajib menambahkan `VITE_SUPABASE_SERVICE_ROLE_KEY` ke dalam file `.env`.
                                    </div>
                                )}
                                
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Ubah Email</label>
                                    <input
                                        type="email" className="input-field"
                                        placeholder="user@email.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={!supabaseAdmin}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Sandi Baru (Optional)</label>
                                    <input
                                        type="password" className="input-field"
                                        placeholder="Kosongkan jika tidak diubah"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        disabled={!supabaseAdmin}
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
