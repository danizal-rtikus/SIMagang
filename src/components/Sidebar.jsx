import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Map, Briefcase, FileText, Calendar,
    Camera, ChevronDown, MapPin, Megaphone, BookOpen,
    PanelLeftClose, PanelLeft, Award, Star, BookMarked, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Sidebar({ role, isOpen, setIsOpen, collapsed, setCollapsed }) {
    const location = useLocation();
    const [openMenus, setOpenMenus] = useState({});

    // Auto-open parent menu when sub-route is active
    useEffect(() => {
        const items = getMenuItems();
        const updates = {};
        items.forEach(item => {
            if (item.subItems) {
                const isActive = item.subItems.some(sub => location.pathname === sub.path);
                if (isActive) updates[item.name] = true;
            }
        });
        if (Object.keys(updates).length) setOpenMenus(prev => ({ ...prev, ...updates }));

        // Close mobile sidebar on route change
        if (isOpen) setIsOpen(false);
    }, [location.pathname, role]);

    const toggleMenu = (name) => {
        if (collapsed) return; // Don't toggle in collapsed mode
        setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const getMenuItems = () => {
        switch (role) {
            case 'admin':
                return [
                    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
                    {
                        name: 'Kelola Magang',
                        icon: <Briefcase size={18} />,
                        subItems: [
                            { name: 'Manajemen User', path: '/admin/users', icon: <Users size={16} /> },
                            { name: 'Manajemen Mitra', path: '/admin/partners', icon: <Briefcase size={16} /> },
                            { name: 'Plotting Magang', path: '/admin/plotting', icon: <Briefcase size={16} /> },
                            { name: 'Periode Akademik', path: '/admin/periode', icon: <BookMarked size={16} /> },
                        ]
                    },
                    { name: 'Pengumuman', path: '/admin/announcements', icon: <Megaphone size={18} /> },
                    {
                        name: 'Laporan',
                        icon: <FileText size={18} />,
                        subItems: [
                            { name: 'Laporan Harian', path: '/admin/daily-reports', icon: <FileText size={16} /> },
                            { name: 'Laporan Bulanan', path: '/admin/monthly-reports', icon: <Calendar size={16} /> },
                            { name: 'Laporan Akhir', path: '/admin/final-reports', icon: <Briefcase size={16} /> },
                            { name: 'Template Laporan', path: '/admin/report-templates', icon: <BookOpen size={16} /> },
                        ]
                    },
                    {
                        name: 'Penilaian',
                        icon: <Award size={18} />,
                        subItems: [
                            { name: 'Aspek & Butir', path: '/admin/penilaian-aspek', icon: <Star size={16} /> },
                            { name: 'Sesi Penilaian', path: '/admin/sesi-penilaian', icon: <Lock size={16} /> },
                        ]
                    },
                    {
                        name: 'Lokasi',
                        icon: <Map size={18} />,
                        subItems: [
                            { name: 'Map Lokasi Mhs', path: '/admin/map', icon: <MapPin size={16} /> },
                        ]
                    },
                ];
            case 'dosen':
                return [
                    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
                    { name: 'Pengumuman', path: '/dosen/announcements', icon: <Megaphone size={18} /> },
                    {
                        name: 'Laporan',
                        icon: <FileText size={18} />,
                        subItems: [
                            { name: 'Laporan Harian', path: '/dosen/daily-reports', icon: <FileText size={16} /> },
                            { name: 'Laporan Bulanan', path: '/dosen/monthly-reports', icon: <Calendar size={16} /> },
                            { name: 'Laporan Akhir', path: '/dosen/final-reports', icon: <Briefcase size={16} /> },
                        ]
                    },
                    {
                        name: 'Penilaian',
                        icon: <Award size={18} />,
                        subItems: [
                            { name: 'Input Nilai', path: '/dosen/input-nilai', icon: <Star size={16} /> },
                        ]
                    },
                    {
                        name: 'Lokasi',
                        icon: <Map size={18} />,
                        subItems: [
                            { name: 'Map Lokasi Mhs', path: '/dosen/map', icon: <MapPin size={16} /> },
                        ]
                    },
                ];
            case 'mitra':
                return [
                    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
                    { name: 'Pengumuman', path: '/mitra/announcements', icon: <Megaphone size={18} /> },
                    {
                        name: 'Penilaian',
                        icon: <Award size={18} />,
                        subItems: [
                            { name: 'Input Nilai', path: '/mitra/input-nilai', icon: <Star size={16} /> },
                        ]
                    },
                ];
            case 'mahasiswa':
                return [
                    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
                    { name: 'Pengumuman', path: '/mahasiswa/announcements', icon: <Megaphone size={18} /> },
                    { name: 'Presensi Harian', path: '/mahasiswa/attendance', icon: <Camera size={18} /> },
                    {
                        name: 'Laporan',
                        icon: <FileText size={18} />,
                        subItems: [
                            { name: 'Laporan Harian', path: '/mahasiswa/daily-reports', icon: <FileText size={16} /> },
                            { name: 'Laporan Bulanan', path: '/mahasiswa/monthly-reports', icon: <Calendar size={16} /> },
                            { name: 'Laporan Akhir', path: '/mahasiswa/final-reports', icon: <Briefcase size={16} /> },
                        ]
                    },
                    { name: 'Nilai Magang', path: '/mahasiswa/nilai', icon: <Award size={18} /> },
                ];
            default:
                return [];
        }
    };

    const menuItems = getMenuItems();

    return (
        <aside className={`sidebar ${isOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>

            {/* Logo */}
            <div className="sidebar-logo">
                <img src="https://i.ibb.co.com/kgV7WDhF/Logo-SYS.png" alt="Logo" />
                <div className="sidebar-logo-text">
                    <h2>Sistem Informasi</h2>
                    <span>SIMagang</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <div key={item.name} style={{ marginBottom: '2px' }}>
                        {item.subItems ? (
                            <>
                                <button
                                    className={`nav-group-btn ${openMenus[item.name] ? 'open' : ''}`}
                                    onClick={() => toggleMenu(item.name)}
                                    title={collapsed ? item.name : undefined}
                                >
                                    <span className="nav-group-left">
                                        {item.icon}
                                        <span style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.15s' }}>{item.name}</span>
                                    </span>
                                    <ChevronDown
                                        size={14}
                                        className={`chevron ${openMenus[item.name] ? 'open' : ''}`}
                                    />
                                </button>

                                {openMenus[item.name] && !collapsed && (
                                    <div className="sub-nav">
                                        {item.subItems.map(sub => (
                                            <NavLink
                                                key={sub.path}
                                                to={sub.path}
                                                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
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
                                end
                                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                                title={collapsed ? item.name : undefined}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </NavLink>
                        )}
                    </div>
                ))}
            </nav>

            {/* Collapse toggle button (desktop only) */}
            <button
                className="sidebar-collapse-btn no-print"
                onClick={() => setCollapsed(c => !c)}
                title={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
                style={{ display: 'flex' }}
            >
                {collapsed
                    ? <PanelLeft size={18} />
                    : <PanelLeftClose size={18} />
                }
            </button>
        </aside>
    );
}
