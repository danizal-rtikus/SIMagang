import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Camera, Mail, Lock, CheckCircle, Save, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Profile() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        full_name: '',
        identifier: '',
        role: '',
        avatar_url: '',
        email: ''
    });
    
    const [passwords, setPasswords] = useState({
        new: '',
        confirm: ''
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [userAuthId, setUserAuthId] = useState(null);

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Tidak ada sesi yang aktif");
            
            setUserAuthId(user.id);

            const { data: profileData, error } = await supabase
                .from('users_profile')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            setProfile({
                ...profileData,
                email: user.email // Ambil email langsung dari auth object
            });
            
            if (profileData.avatar_url) {
                // Konversi path storage menjadi public URL
                const { data } = supabase.storage
                    .from('simagang-files')
                    .getPublicUrl(profileData.avatar_url);
                setAvatarPreview(data.publicUrl);
            }

        } catch (error) {
            toast.error("Gagal memuat profil: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) { // Max 2MB
            toast.error("Ukuran maksimal foto profil adalah 2MB");
            return;
        }

        setAvatarFile(file);
        
        // Buat local preview temporary sebelum diupload
        const objectUrl = URL.createObjectURL(file);
        setAvatarPreview(objectUrl);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading('Menyimpan pembaruan profil...');

        try {
            let newAvatarPath = profile.avatar_url;

            // 1. Upload Avatar jika ada file baru yang dipilih
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `avatars/${userAuthId}_${Math.random()}.${fileExt}`;
                
                const { error: uploadError, data } = await supabase.storage
                    .from('simagang-files')
                    .upload(fileName, avatarFile, { upsert: true });

                if (uploadError) throw uploadError;
                newAvatarPath = data.path;
            }

            // 2. Update Data di tabel users_profile
            const { error: profileError } = await supabase
                .from('users_profile')
                .update({
                    full_name: profile.full_name,
                    identifier: profile.identifier,
                    avatar_url: newAvatarPath
                })
                .eq('id', userAuthId);

            if (profileError) throw profileError;

            // 3. Update Password jika input password terisi
            if (passwords.new) {
                if (passwords.new !== passwords.confirm) {
                    throw new Error("Kata sandi yang Anda ketik tidak cocok!");
                }
                if (passwords.new.length < 6) {
                    throw new Error("Kata sandi minimal harus 6 karakter!");
                }

                const { error: passwordError } = await supabase.auth.updateUser({
                    password: passwords.new
                });

                if (passwordError) throw passwordError;
                
                // Kosongkan form password setelah berhasil
                setPasswords({ new: '', confirm: '' });
                toast.success('Pembaruan kata sandi berhasil!', { id: toastId });
            } else {
                toast.success('Profil berhasil diperbarui!', { id: toastId });
            }

            // Tembak event "profileUpdated" agar Komponen Header Navbar.jsx menangkap sinyal ini
            window.dispatchEvent(new Event("profileUpdated"));

        } catch (error) {
            toast.error(error.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader className="spin" size={32} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 0' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Pengaturan Akun</h1>
                <p style={{ color: 'var(--text-muted)' }}>Kelola data profil, foto identitas, dan preferensi keamanan Anda.</p>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white', padding: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* HEAD & AVATAR SECTION */}
                <div style={{ padding: '32px 32px 24px', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--primary)',
                                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '4px solid white', position: 'relative', zIndex: 1
                            }}>
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={48} color="white" />
                                )}
                            </div>
                            
                            {/* Tombol Kamera Mengambang */}
                            <label style={{
                                position: 'absolute', bottom: '0', right: '0', zIndex: 2,
                                backgroundColor: 'white', borderRadius: '50%', padding: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', border: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
                                transition: 'all 0.2s ease'
                            }} className="hover:bg-gray-50">
                                <span style={{ srOnly: true, display: 'none' }}>Pilih Foto</span>
                                <Camera size={18} />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleAvatarChange} 
                                    style={{ display: 'none' }} 
                                />
                            </label>
                        </div>

                        <div>
                            <h2 style={{ fontSize: '1.4rem', margin: '0 0 6px 0' }}>{profile.full_name || 'User Tanpa Nama'}</h2>
                            <span style={{ 
                                display: 'inline-block', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', 
                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' 
                            }}>
                                {profile.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* FORM SECTION */}
                <form onSubmit={handleSaveProfile} style={{ padding: '0 32px 32px' }}>
                    
                    {/* Data Pribadi */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B' }}>
                            <User size={18} /> Informasi Dasar
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Nama Lengkap</label>
                                <input
                                    type="text" className="input-field" required
                                    value={profile.full_name}
                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    {profile.role === 'mahasiswa' ? 'NIM' : (profile.role === 'dosen' ? 'NIDN/NIP' : 'ID Nomor Induk')}
                                </label>
                                <input
                                    type="text" className="input-field" required
                                    value={profile.identifier}
                                    onChange={(e) => setProfile({ ...profile, identifier: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 -32px 32px' }} />

                    {/* Autentikasi */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B' }}>
                            <Lock size={18} /> Keamanan & Akses
                        </h3>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Alamat Email (Tidak bisa diubah)</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94A3B8' }} />
                                <input
                                    type="email" className="input-field" 
                                    style={{ paddingLeft: '40px', backgroundColor: '#F1F5F9', color: '#64748B', cursor: 'not-allowed' }}
                                    value={profile.email} disabled
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Ganti Kata Sandi</label>
                                <input
                                    type="password" className="input-field"
                                    placeholder="Biarkan kosong jika tidak diubah"
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Konfirmasi Sandi Baru</label>
                                <input
                                    type="password" className="input-field"
                                    placeholder="Ketik ulang pola kunci"
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', width: 'auto' }}>
                            {saving ? <Loader className="spin" size={20} /> : <Save size={20} />}
                            {saving ? "Menyimpan..." : "Simpan Pembaruan Profil"}
                        </button>
                    </div>

                </form>
            </div>
            
            <style>{`
                .hover\\:bg-gray-50:hover { background-color: #F8FAFC !important; }
            `}</style>
        </div>
    );
}
