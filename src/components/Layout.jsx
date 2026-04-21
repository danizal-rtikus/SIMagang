import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function Layout() {
    const [session, setSession] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);        // Mobile
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);   // Desktop collapse

    useEffect(() => {
        let currentSession = null;

        supabase.auth.getSession().then(({ data: { session: initSession } }) => {
            currentSession = initSession;
            setSession(initSession);
            if (initSession) fetchProfile(initSession.user.id);
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            currentSession = session;
            setSession(session);
            if (session) fetchProfile(session.user.id);
        });

        const handleProfileUpdate = () => {
            if (currentSession?.user?.id) fetchProfile(currentSession.user.id);
        };
        window.addEventListener('profileUpdated', handleProfileUpdate);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('profileUpdated', handleProfileUpdate);
        };
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users_profile')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) setUserProfile(data);
            if (error) {
                if (error.message?.includes('recursion')) {
                    toast.error('Terdapat error RLS (Infinite Recursion). Mohon jalankan script fix_rls_recursion.sql.');
                } else if (error.code === 'PGRST116') {
                    toast.error('Profil tidak ditemukan! Silakan Register ulang.');
                }
            }
        } catch (err) {
            console.error('Error fetching profile', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--sidebar-bg)', flexDirection: 'column', gap: '16px'
            }}>
                <div style={{
                    width: '36px', height: '36px', border: '3px solid rgba(246,130,31,0.3)',
                    borderTop: '3px solid #F6821F', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Memuat...</p>
            </div>
        );
    }

    if (!session) return <Navigate to="/login" replace />;

    return (
        <div className="app-container">
            <Sidebar
                role={userProfile?.role}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
            />

            <div className="main-content">
                <Header
                    userProfile={userProfile}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <main className="page-wrapper">
                    <Outlet context={{ session, userProfile }} />
                </main>
            </div>

            {/* Mobile backdrop */}
            {isSidebarOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
}
