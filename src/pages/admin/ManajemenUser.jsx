import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    User, Shield, Edit3, Trash2, UserPlus, Search,
    ChevronLeft, ChevronRight, Users, GraduationCap, Settings, Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonTableRow } from '../../components/Skeleton';

const PAGE_SIZE = 15;

const PRODI_OPTIONS = [
    'Sistem Informasi',
    'Teknik Informatika',
    'Desain Komunikasi Visual',
    'Komputerisasi Akuntansi',
];

const ROLE_META = {
    admin:     { label: 'Admin',     bg: '#FEF2F2', color: '#DC2626', icon: <Shield size={11} /> },
    dosen:     { label: 'Dosen',     bg: '#E0E7FF', color: '#4338CA', icon: <GraduationCap size={11} /> },
    mitra:     { label: 'Mitra',     bg: '#FEF3C7', color: '#D97706', icon: <User size={11} /> },
    mahasiswa: { label: 'Mahasiswa', bg: '#F0FDF4', color: '#059669', icon: <User size={11} /> },
};

function RoleBadge({ role }) {
    const m = ROLE_META[role] || { label: role, bg: '#F1F5F9', color: '#64748B', icon: null };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 9px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: 700,
            backgroundColor: m.bg, color: m.color
        }}>
            {m.icon} {m.label}
        </span>
    );
}

export default function ManajemenUser() {
    const [users, setUsers]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [page, setPage]         = useState(1);

    const [showModal, setShowModal]       = useState(false);
    const [isAddMode, setIsAddMode]       = useState(false);
    const [editingUser, setEditingUser]   = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [formData, setFormData]         = useState({ full_name: '', identifier: '', role: 'mahasiswa', prodi: 'Sistem Informasi', email: '', password: '' });
    const [saving, setSaving]             = useState(false);

    // Kaprodi Settings Modal state
    const [showKaprodiModal, setShowKaprodiModal] = useState(false);
    const [prodiSettings, setProdiSettings]       = useState([]);
    const [savingKaprodi, setSavingKaprodi]         = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('users_profile').select('*').order('created_at', { ascending: false });
        if (!error && data) setUsers(data);
        setLoading(false);
    };

    // ── Filter + Search + Pagination ──────────────────────
    const filtered = useMemo(() => {
        let list = users;
        if (filterRole !== 'all') list = list.filter(u => u.role === filterRole);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(u =>
                u.full_name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                u.identifier?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [users, filterRole, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const resetPage = () => setPage(1);

    // Counts per role  
    const counts = useMemo(() => ({
        all:       users.length,
        admin:     users.filter(u => u.role === 'admin').length,
        dosen:     users.filter(u => u.role === 'dosen').length,
        mitra:     users.filter(u => u.role === 'mitra').length,
        mahasiswa: users.filter(u => u.role === 'mahasiswa').length,
    }), [users]);

    const fetchProdiSettings = async () => {
        const { data } = await supabase.from('prodi_settings').select('*').order('prodi_name');
        if (data && data.length > 0) {
            setProdiSettings(data);
        } else {
            // Default 4 prodi if empty
            setProdiSettings(PRODI_OPTIONS.map(p => ({ prodi_name: p, kaprodi_name: '', kaprodi_nidn: '' })));
        }
    };

    const handleOpenKaprodiModal = async () => {
        await fetchProdiSettings();
        setShowKaprodiModal(true);
    };

    const handleSaveKaprodi = async (e) => {
        e.preventDefault();
        setSavingKaprodi(true);
        const toastId = toast.loading('Menyimpan pengaturan Kaprodi...');
        try {
            for (const item of prodiSettings) {
                const { error } = await supabase.from('prodi_settings').upsert({
                    prodi_name: item.prodi_name,
                    kaprodi_name: item.kaprodi_name,
                    kaprodi_nidn: item.kaprodi_nidn,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'prodi_name' });
                if (error) throw error;
            }
            toast.success('Pengaturan Kaprodi berhasil disimpan!', { id: toastId });
            setShowKaprodiModal(false);
        } catch (err) {
            toast.error('Gagal menyimpan Kaprodi: ' + err.message, { id: toastId });
        } finally {
            setSavingKaprodi(false);
        }
    };

    // ── Modal handlers ─────────────────────────────────────
    const handleAdd = () => {
        setIsAddMode(true); setEditingUser(null);
        setFormData({ full_name: '', identifier: '', role: 'mahasiswa', prodi: 'Sistem Informasi', email: '', password: '' });
        setShowModal(true);
    };

    const handleEdit = (user) => {
        setIsAddMode(false); setEditingUser(user);
        setFormData({ full_name: user.full_name || '', identifier: user.identifier || '', role: user.role || 'mahasiswa', prodi: user.prodi || 'Sistem Informasi', email: user.email || '', password: '' });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading(isAddMode ? 'Mendaftarkan pengguna...' : 'Menyimpan perubahan...');

        try {
            if (isAddMode) {
                if (!formData.password || !formData.email)
                    throw new Error('Email dan password wajib diisi!');
                const { data, error } = await supabase.functions.invoke('admin-user-manage', {
                    body: { action: 'createUser', payload: { email: formData.email, password: formData.password, full_name: formData.full_name, identifier: formData.identifier, role: formData.role, prodi: formData.prodi } }
                });
                if (!data?.success || error) throw new Error(data?.error || error?.message || 'Gagal mendaftar');
                
                // Update prodi & email info jika id tersedia
                if (data.data?.id) {
                    await supabase.from('users_profile').update({ prodi: formData.prodi, email: formData.email }).eq('id', data.data.id);
                }
                
                toast.success('Pengguna baru berhasil ditambahkan!', { id: toastId });
            } else {
                const profilePayload = {
                    full_name: formData.full_name,
                    identifier: formData.identifier,
                    role: formData.role,
                    prodi: formData.prodi
                };
                if (formData.email) profilePayload.email = formData.email;

                const { error: pErr } = await supabase.from('users_profile')
                    .update(profilePayload)
                    .eq('id', editingUser.id);
                if (pErr) {
                    if (pErr.message?.includes('check constraint') || pErr.code === '23514') {
                        throw new Error('Database menolak role "mitra". Harap jalankan script SQL supabase_schema_v12.sql di Supabase SQL Editor.');
                    }
                    throw pErr;
                }

                if ((formData.email && formData.email !== editingUser.email) || formData.password) {
                    const { data, error } = await supabase.functions.invoke('admin-user-manage', {
                        body: { action: 'updateUser', payload: { userId: editingUser.id, email: (formData.email && formData.email !== editingUser.email) ? formData.email : undefined, password: formData.password || undefined } }
                    });
                    if (!data?.success || error) throw new Error(data?.error || error?.message);
                }
                toast.success('Data pengguna berhasil diperbarui!', { id: toastId });
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat menyimpan', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const toastId = toast.loading('Menghapus pengguna...');
        try {
            const { data, error } = await supabase.functions.invoke('admin-user-manage', {
                body: { action: 'deleteUser', payload: { userId: deleteConfirm.id } }
            });
            if (!data?.success || error) throw new Error(data?.error || error?.message || 'Gagal menghapus');
            toast.success(`${deleteConfirm.full_name} berhasil dihapus.`, { id: toastId });
            fetchUsers(); setDeleteConfirm(null);
        } catch (err) {
            toast.error(err.message, { id: toastId });
        }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Manajemen User</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Kelola data profil, prodi, dan hak akses seluruh pengguna sistem.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleOpenKaprodiModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', backgroundColor: '#1b1b1f' }}>
                        <Award size={16} /> Pengaturan Kaprodi
                    </button>
                    <button onClick={handleAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                        <UserPlus size={16} /> Tambah Pengguna
                    </button>
                </div>
            </div>

            {/* Role tab filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {[
                    { value: 'all',       label: 'Semua',     icon: <Users size={13} /> },
                    { value: 'admin',     label: 'Admin',     icon: <Shield size={13} /> },
                    { value: 'dosen',     label: 'Dosen',     icon: <GraduationCap size={13} /> },
                    { value: 'mitra',     label: 'Mitra',     icon: <User size={13} /> },
                    { value: 'mahasiswa', label: 'Mahasiswa', icon: <User size={13} /> },
                ].map(tab => (
                    <button key={tab.value}
                        onClick={() => { setFilterRole(tab.value); resetPage(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 14px', borderRadius: '20px', border: '1px solid',
                            cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, transition: 'all 0.15s',
                            borderColor: filterRole === tab.value ? 'var(--primary)' : 'var(--border)',
                            backgroundColor: filterRole === tab.value ? 'var(--primary)' : 'white',
                            color: filterRole === tab.value ? 'white' : 'var(--text-muted)',
                        }}>
                        {tab.icon} {tab.label}
                        <span style={{
                            marginLeft: '4px', fontSize: '0.7rem', fontWeight: 700,
                            backgroundColor: filterRole === tab.value ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                            color: filterRole === tab.value ? 'white' : 'var(--text-muted)',
                            padding: '1px 6px', borderRadius: '10px'
                        }}>
                            {counts[tab.value]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search + info */}
            <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        type="text" value={search}
                        onChange={e => { setSearch(e.target.value); resetPage(); }}
                        placeholder="Cari nama, email, atau nomor identitas..."
                        style={{
                            width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px',
                            border: '1px solid var(--border)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>
                {search && (
                    <button onClick={() => { setSearch(''); resetPage(); }} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '7px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
                        × Hapus
                    </button>
                )}
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {filtered.length} pengguna ditemukan
                </span>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '660px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC' }}>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Nama & Email', 'No. Identitas', 'Role', 'Terdaftar', 'Aksi'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)
                            ) : paged.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Tidak ada pengguna yang sesuai filter.
                                </td></tr>
                            ) : paged.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                                                backgroundColor: ROLE_META[user.role]?.bg || '#F1F5F9',
                                                color: ROLE_META[user.role]?.color || '#64748B',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 700, fontSize: '0.9rem'
                                            }}>
                                                {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{user.full_name}</p>
                                                {user.email && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                                        {user.identifier
                                            ? <><p style={{ margin: 0, fontWeight: 600 }}>{user.identifier}</p>
                                                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    {user.role === 'mahasiswa' ? 'NIM' : user.role === 'dosen' ? 'NIDN' : 'ID'}
                                                </p></>
                                            : <span style={{ color: '#CBD5E1', fontStyle: 'italic', fontSize: '0.8rem' }}>—</span>
                                        }
                                    </td>
                                    <td style={{ padding: '12px 16px' }}><RoleBadge role={user.role} /></td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={() => handleEdit(user)} style={{ padding: '5px 11px', borderRadius: '5px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                                                <Edit3 size={13} /> Edit
                                            </button>
                                            <button onClick={() => setDeleteConfirm(user)} style={{ padding: '5px 11px', borderRadius: '5px', border: '1px solid #FEE2E2', background: '#FFF5F5', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
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
                            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                                style={{ width:'32px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',background:page===1?'#F8FAFC':'white',cursor:page===1?'not-allowed':'pointer',color:page===1?'#CBD5E1':'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                                <ChevronLeft size={15}/>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i+1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
                                .map((item, idx) => item === '…'
                                    ? <span key={`d${idx}`} style={{ padding: '0 4px', color: '#94A3B8', fontSize: '0.85rem', alignSelf: 'center' }}>…</span>
                                    : <button key={item} onClick={() => setPage(item)} style={{ width:'32px',height:'32px',borderRadius:'6px',border:'1px solid',cursor:'pointer',fontSize:'0.82rem',fontWeight:item===page?700:400,borderColor:item===page?'var(--primary)':'var(--border)',backgroundColor:item===page?'var(--primary)':'white',color:item===page?'white':'var(--text-main)' }}>{item}</button>
                                )
                            }
                            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                                style={{ width:'32px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',background:page===totalPages?'#F8FAFC':'white',cursor:page===totalPages?'not-allowed':'pointer',color:page===totalPages?'#CBD5E1':'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                                <ChevronRight size={15}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', backgroundColor: 'white', padding: '28px' }}>
                        <h2 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>{isAddMode ? 'Tambah Pengguna Baru' : 'Edit Data Pengguna'}</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Nama Lengkap</label>
                                <input type="text" required className="input-field" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>No. Identitas (NIM / NIDN)</label>
                                <input type="text" className="input-field" placeholder="NIM atau NIDN" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Hak Akses (Role)</label>
                                <select className="input-field" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                    <option value="mahasiswa">Mahasiswa</option>
                                    <option value="dosen">Dosen</option>
                                    <option value="mitra">Pendamping Lapangan (Mitra)</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {formData.role === 'mahasiswa' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Program Studi (Prodi)</label>
                                    <select className="input-field" value={formData.prodi} onChange={e => setFormData({...formData, prodi: e.target.value})}>
                                        {PRODI_OPTIONS.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '7px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>🔐 Login & Keamanan</p>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.82rem' }}>Email Login</label>
                                    <input type="email" className="input-field" required={isAddMode} placeholder="user@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.82rem' }}>
                                        {isAddMode ? 'Password' : 'Password Baru'} {!isAddMode && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opsional)</span>}
                                    </label>
                                    <input type="password" className="input-field" required={isAddMode} placeholder={isAddMode ? 'Min. 6 karakter' : 'Kosongkan jika tidak diubah'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.88rem' }}>Batal</button>
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Kaprodi Settings Modal */}
            {showKaprodiModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <Award size={24} color="var(--primary)" />
                            <div>
                                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Pengaturan Ketua Program Studi (Kaprodi)</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Atur Nama & NIDN Kaprodi yang akan tercantum pada pengesahan cetak dokumen.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveKaprodi} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {prodiSettings.map((item, index) => (
                                <div key={item.prodi_name} style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <p style={{ margin: '0 0 10px 0', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                                        🎓 {item.prodi_name}
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>Nama Kaprodi</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="Contoh: Dr. Nama Kaprodi, M.Kom"
                                                value={item.kaprodi_name || ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setProdiSettings(prev => prev.map((p, i) => i === index ? { ...p, kaprodi_name: val } : p));
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>NIDN Kaprodi</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="Contoh: 0601018801"
                                                value={item.kaprodi_nidn || ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setProdiSettings(prev => prev.map((p, i) => i === index ? { ...p, kaprodi_nidn: val } : p));
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowKaprodiModal(false)} style={{ padding: '9px 18px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.88rem' }}>Batal</button>
                                <button type="submit" disabled={savingKaprodi} className="btn-primary">{savingKaprodi ? 'Menyimpan...' : 'Simpan Pengaturan Kaprodi'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', maxWidth: '400px', width: '100%' }}>
                        <Trash2 size={36} color="#EF4444" style={{ margin: '0 auto 14px', display: 'block' }} />
                        <p style={{ textAlign: 'center', fontWeight: 600, marginBottom: '6px' }}>Hapus "{deleteConfirm.full_name}"?</p>
                        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#EF4444', marginBottom: '24px' }}>Tindakan ini permanen dan tidak dapat dibatalkan.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '9px 22px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Batal</button>
                            <button onClick={executeDelete} style={{ padding: '9px 22px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Hapus Permanen</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
