import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus, Mail, Lock, User, Briefcase } from 'lucide-react';

export default function Register() {
    const [formData, setFormData] = useState({
        fullName: '',
        identifier: '',
        role: 'mahasiswa',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        // 1. Sign up user di auth.users (Memerlukan Konfirmasi Email dimatikan di Supabase)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
        });

        if (authError) {
            setErrorMsg(authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            // 2. Insert ke users_profile
            const { error: profileError } = await supabase
                .from('users_profile')
                .insert([
                    {
                        id: authData.user.id,
                        full_name: formData.fullName,
                        identifier: formData.identifier,
                        role: formData.role
                    }
                ]);

            if (profileError) {
                // Jika insert profile gagal, bisa saja dihapus auth user aslinya atau handling khusus, namun untuk simplifikasi kita error saja
                setErrorMsg('Gagal menyimpan profil: ' + profileError.message);
            } else {
                // Karena email confirmation off, user otomatis login atau bisa login manual
                navigate('/login');
            }
        }

        setLoading(false);
    };

    return (
        <div className="auth-wrapper">
            <div className="glass-panel auth-card" style={{ maxWidth: '500px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <img 
                        src="https://i.ibb.co.com/kgV7WDhF/Logo-SYS.png" 
                        alt="Logo STIKOM Yos Sudarso" 
                        style={{ width: '80px', height: '80px', margin: '0 auto 16px', objectFit: 'contain' }} 
                    />
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Buat Akun</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Daftar untuk menggunakan Sistem Informasi Magang Mitra.</p>
                </div>

                {errorMsg && (
                    <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Nama Lengkap</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '12px', left: '16px', color: 'var(--text-muted)' }}>
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                name="fullName"
                                className="input-field"
                                style={{ paddingLeft: '44px' }}
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Pilih Peran (Role)</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '12px', left: '16px', color: 'var(--text-muted)' }}>
                                <Briefcase size={18} />
                            </div>
                            <div style={{
                                padding: '12px 16px 12px 44px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                color: 'var(--text-main)',
                                fontSize: '0.95rem',
                                fontWeight: 500
                            }}>
                                Mahasiswa
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                            NIM (Nomor Induk Mahasiswa)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '12px', left: '16px', color: 'var(--text-muted)' }}>
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                name="identifier"
                                className="input-field"
                                style={{ paddingLeft: '44px' }}
                                placeholder="Contoh: 21010101"
                                value={formData.identifier}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '12px', left: '16px', color: 'var(--text-muted)' }}>
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                name="email"
                                className="input-field"
                                style={{ paddingLeft: '44px' }}
                                placeholder="nama@email.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '12px', left: '16px', color: 'var(--text-muted)' }}>
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                name="password"
                                className="input-field"
                                style={{ paddingLeft: '44px' }}
                                placeholder="Minimal 6 karakter"
                                minLength="6"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '16px', width: '100%', padding: '14px' }}>
                        {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    Sudah punya akun? <Link to="/login" style={{ fontWeight: 600 }}>Masuk di sini</Link>
                </p>
            </div>
        </div>
    );
}
