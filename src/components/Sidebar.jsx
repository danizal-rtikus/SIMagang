import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Map, Briefcase, FileText, Calendar, LogOut, Camera, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Sidebar({ role, isOpen, setIsOpen }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [openMenus, setOpenMenus] = useState({});

    useEffect(() => {
        const items = getMenuItems();
        const newOpenMenus = { ...openMenus };
        let hasChanges = false;

        items.forEach(item => {
            if (item.subItems) {
                const isActive = item.subItems.some(sub => location.pathname === sub.path);
                if (isActive && !newOpenMenus[item.name]) {
                    newOpenMenus[item.name] = true;
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            setOpenMenus(newOpenMenus);
        }
        
        // Auto-close sidebar on mobile when route changes
        if (isOpen) {
            setIsOpen(false);
        }
    }, [location.pathname, role]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const toggleMenu = (name) => {
        setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const getMenuItems = () => {
        switch (role) {
            case 'admin':
                return [
                    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
                    { 
                        name: 'Kelola Magang', 
                        icon: <Briefcase size={20} />,
                        subItems: [
                            { name: 'Manajemen User', path: '/admin/users', icon: <Users size={18} /> },
                            { name: 'Manajemen Mitra', path: '/admin/partners', icon: <Briefcase size={18} /> },
                            { name: 'Plotting Magang', path: '/admin/plotting', icon: <Briefcase size={18} /> }
                        ]
                    },
                    { 
                        name: 'Lokasi', 
                        icon: <Map size={20} />,
                        subItems: [
                            { name: 'Map Lokasi Mhs', path: '/admin/map', icon: <MapPin size={18} /> }
                        ]
                    }
                ];
            case 'dosen':
                return [
                    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
                    {
                        name: 'Laporan',
                        icon: <FileText size={20} />,
                        subItems: [
                            { name: 'Laporan Harian', path: '/dosen/daily-reports', icon: <FileText size={18} /> },
                            { name: 'Laporan Bulanan', path: '/dosen/monthly-reports', icon: <Calendar size={18} /> },
                            { name: 'Laporan Akhir', path: '/dosen/final-reports', icon: <Briefcase size={18} /> }
                        ]
                    },
                    { 
                        name: 'Lokasi', 
                        icon: <Map size={20} />,
                        subItems: [
                            { name: 'Map Lokasi Mhs', path: '/dosen/map', icon: <MapPin size={18} /> }
                        ]
                    }
                ];
            case 'mahasiswa':
                return [
                    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
                    { name: 'Presensi Harian', path: '/mahasiswa/attendance', icon: <Camera size={20} /> },
                    {
                        name: 'Laporan',
                        icon: <FileText size={20} />,
                        subItems: [
                            { name: 'Laporan Harian', path: '/mahasiswa/daily-reports', icon: <FileText size={18} /> },
                            { name: 'Laporan Bulanan', path: '/mahasiswa/monthly-reports', icon: <Calendar size={18} /> },
                            { name: 'Laporan Akhir', path: '/mahasiswa/final-reports', icon: <Briefcase size={18} /> }
                        ]
                    }
                ];
            default:
                return [];
        }
    };

    const menuItems = getMenuItems();

    return (
        <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
            <div style={{ padding: '0 24px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                        src="https://i.ibb.co.com/kgV7WDhF/Logo-SYS.png" 
                        alt="Logo STIKOM Yos Sudarso" 
                        style={{ width: '45px', height: '45px', objectFit: 'contain' }} 
                    />
                    <div>
                        <h2 style={{ fontSize: '1rem', margin: 0 }}>Sistem Informasi</h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>SIMagang</span>
                    </div>
                </div>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px', overflowY: 'auto' }}>
                {menuItems.map((item) => (
                    <div key={item.name}>
                        {item.subItems ? (
                            <>
                                <button
                                    onClick={() => toggleMenu(item.name)}
                                    className={`nav-link w-full flex justify-between ${openMenus[item.name] ? 'menu-open' : ''}`}
                                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {item.icon}
                                        <span>{item.name}</span>
                                    </div>
                                    {openMenus[item.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                                
                                {openMenus[item.name] && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', paddingLeft: '28px' }}>
                                        {item.subItems.map(sub => (
                                            <NavLink
                                                key={sub.path}
                                                to={sub.path}
                                                className={({ isActive }) => isActive ? 'nav-link active sub-link' : 'nav-link sub-link'}
                                            >
                                                {sub.icon}
                                                <span>{sub.name}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <NavLink
                                to={item.path}
                                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </NavLink>
                        )}
                    </div>
                ))}
            </nav>

            <div style={{ padding: '24px 16px 0', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                <button
                    onClick={handleLogout}
                    className="nav-link"
                    style={{ width: '100%', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                    <LogOut size={20} />
                    <span>Keluar</span>
                </button>
            </div>

            <style>{`
        .sidebar {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          color: var(--text-main);
          font-weight: 500;
          font-size: 0.95rem;
          transition: var(--transition);
          text-decoration: none;
        }
        .nav-link:hover {
          background-color: rgba(79, 70, 229, 0.05);
          color: var(--primary);
        }
        .nav-link.active {
          background-color: var(--primary);
          color: white;
          box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.25);
        }
        .nav-link.sub-link {
          padding: 10px 16px;
          font-size: 0.9rem;
        }
        .menu-open {
          color: var(--primary);
        }
      `}</style>
        </aside>
    );
}
