import React from 'react';
import { User, Menu, ChevronDown, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Header({ userProfile, onMenuClick }) {
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [avatarUrl, setAvatarUrl] = React.useState(null);
    const dropdownRef = React.useRef(null);

    // Deteksi klik diluar dropdown untuk menutup menunya
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load Image Avatar URL jika ada
    const loadAvatar = React.useCallback(() => {
        if (userProfile?.avatar_url) {
            const { data } = supabase.storage
                .from('simagang-files')
                .getPublicUrl(userProfile.avatar_url);
            setAvatarUrl(data.publicUrl);
        } else {
            setAvatarUrl(null);
        }
    }, [userProfile]);

    // Memuat ulang avatar saat komponen mendeteksi perubahan prop userProfile
    React.useEffect(() => {
        loadAvatar();
    }, [loadAvatar]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };
    return (
        <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                    onClick={onMenuClick}
                    className="mobile-only-btn"
                    style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-main)' }}
                >
                    <Menu size={24} />
                </button>
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>
                    Sistem Informasi Magang Mitra
                </h2>
            </div>

            <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s ease' }}
                    className="header-profile-trigger"
                >
                    <div className="header-user-info" style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                            {userProfile?.full_name || 'Loading...'}
                        </p>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {userProfile?.role || 'User'}
                        </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            backgroundColor: 'var(--primary)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <User size={20} />
                            )}
                        </div>
                        <ChevronDown size={16} color="var(--text-muted)" style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </div>
                </div>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: '0',
                        backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: '1px solid var(--border)', minWidth: '200px', zIndex: 50,
                        padding: '8px 0', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{userProfile?.full_name}</p>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{userProfile?.email}</p>
                        </div>
                        
                        <button 
                            onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}
                            className="dropdown-item"
                        >
                            <Settings size={16} /> Kelola Profil
                        </button>
                        
                        <button 
                            onClick={handleLogout}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: '#EF4444' }}
                            className="dropdown-item"
                        >
                            <LogOut size={16} /> Keluar
                        </button>
                    </div>
                )}
            </div>
            <style>{`
                @media (max-width: 768px) {
                    .mobile-only-btn { display: block !important; }
                    .header h2 { font-size: 0.95rem !important; }
                }
                .header-profile-trigger:hover { background-color: #F8FAFC !important; }
                .dropdown-item:hover { background-color: #F8FAFC !important; }
            `}</style>
        </header>
    );
}
