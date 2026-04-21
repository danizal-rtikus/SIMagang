import React from 'react';
import { User, Menu, ChevronDown, Settings, LogOut, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Build breadcrumb label from path
const getBreadcrumb = (pathname) => {
    const map = {
        '/': 'Dashboard',
        '/profile': 'Kelola Profil',
        '/admin/users': 'Manajemen User',
        '/admin/partners': 'Manajemen Mitra',
        '/admin/plotting': 'Plotting Magang',
        '/admin/announcements': 'Kelola Pengumuman',
        '/admin/daily-reports': 'Laporan Harian',
        '/admin/monthly-reports': 'Laporan Bulanan',
        '/admin/final-reports': 'Laporan Akhir',
        '/admin/report-templates': 'Template Laporan',
        '/admin/map': 'Map Lokasi Mahasiswa',
        '/dosen/announcements': 'Pengumuman',
        '/dosen/daily-reports': 'Laporan Harian',
        '/dosen/monthly-reports': 'Laporan Bulanan',
        '/dosen/final-reports': 'Laporan Akhir',
        '/dosen/map': 'Map Lokasi Mahasiswa',
        '/mahasiswa/announcements': 'Pengumuman',
        '/mahasiswa/attendance': 'Presensi Harian',
        '/mahasiswa/daily-reports': 'Laporan Harian',
        '/mahasiswa/monthly-reports': 'Laporan Bulanan',
        '/mahasiswa/final-reports': 'Laporan Akhir',
    };
    return map[pathname] || 'SIMagang';
};

const roleLabel = { admin: 'Administrator', dosen: 'Dosen Pembimbing', mahasiswa: 'Mahasiswa' };

export default function Header({ userProfile, onMenuClick }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [avatarUrl, setAvatarUrl] = React.useState(null);
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
        if (userProfile?.avatar_url) {
            const { data } = supabase.storage.from('simagang-files').getPublicUrl(userProfile.avatar_url);
            setAvatarUrl(data.publicUrl);
        } else {
            setAvatarUrl(null);
        }
    }, [userProfile]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const currentPage = getBreadcrumb(location.pathname);
    const role = userProfile?.role;

    return (
        <header className="header">
            {/* Left: Mobile menu + Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                    onClick={onMenuClick}
                    className="mobile-only-btn"
                    style={{
                        display: 'none', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '6px', color: 'var(--text-muted)', borderRadius: '6px',
                        transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                    <Menu size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {roleLabel[role] || 'SIMagang'}
                    </span>
                    <span style={{ color: 'var(--border)', fontSize: '0.8rem' }}>/</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {currentPage}
                    </span>
                </div>
            </div>

            {/* Right: Profile dropdown */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                    onClick={() => setDropdownOpen(o => !o)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '5px 10px 5px 5px', borderRadius: '8px', border: '1px solid var(--border)',
                        background: 'white', cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#D1D5DB'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                    {/* Avatar */}
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '6px',
                        backgroundColor: '#1b1b1f', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', flexShrink: 0
                    }}>
                        {avatarUrl
                            ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <User size={16} />
                        }
                    </div>

                    {/* Name */}
                    <div className="header-user-info" style={{ textAlign: 'left', lineHeight: 1.2 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                            {userProfile?.full_name || '—'}
                        </p>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {role || ''}
                        </span>
                    </div>

                    <ChevronDown
                        size={14}
                        color="var(--text-muted)"
                        style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                        backgroundColor: 'white', borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid var(--border)',
                        minWidth: '200px', zIndex: 50, overflow: 'hidden',
                    }}>
                        {/* User info */}
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', backgroundColor: '#FAFAFA' }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                {userProfile?.full_name}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {userProfile?.email}
                            </p>
                        </div>

                        <div style={{ padding: '6px' }}>
                            <button
                                onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 12px', width: '100%', textAlign: 'left',
                                    border: 'none', background: 'none', cursor: 'pointer',
                                    fontSize: '0.84rem', color: 'var(--text-main)', borderRadius: '6px',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                                <Settings size={15} color="var(--text-muted)" /> Kelola Profil
                            </button>

                            <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

                            <button
                                onClick={handleLogout}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 12px', width: '100%', textAlign: 'left',
                                    border: 'none', background: 'none', cursor: 'pointer',
                                    fontSize: '0.84rem', color: '#EF4444', borderRadius: '6px',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                                <LogOut size={15} /> Keluar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .mobile-only-btn { display: flex !important; }
                }
            `}</style>
        </header>
    );
}
