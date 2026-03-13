import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErrorMsg(error.message);
        } else {
            navigate('/');
        }
        setLoading(false);
    };

    return (
        <div className="auth-wrapper">
            <div className="glass-panel auth-card">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <img 
                        src="https://i.ibb.co.com/kgV7WDhF/Logo-SYS.png" 
                        alt="Logo STIKOM Yos Sudarso" 
                        style={{ width: '80px', height: '80px', margin: '0 auto 16px', objectFit: 'contain' }} 
                    />
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Selamat datang di SIMagang</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Silahkan masuk ke Sistem Informasi Magang Mitra menggunakan Akun Anda</p>
                </div>

                {errorMsg && (
                    <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '12px', left: '16px', color: 'var(--text-muted)' }}>
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                className="input-field"
                                style={{ paddingLeft: '44px' }}
                                placeholder="nama@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                className="input-field"
                                style={{ paddingLeft: '44px' }}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px', width: '100%', padding: '14px' }}>
                        {loading ? 'Masuk...' : 'Masuk'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    Belum punya akun? <Link to="/register" style={{ fontWeight: 600 }}>Daftar di sini</Link>
                </p>
            </div>
        </div>
    );
}
