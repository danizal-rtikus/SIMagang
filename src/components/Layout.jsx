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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Toggle State

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users_profile')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                setUserProfile(data);
            }
            if (error) {
                console.error('Error fetching profile:', error);
                if (error.message?.includes('recursion')) {
                    toast.error("Terdapat error RLS (Infinite Recursion) pada tabel users_profile. Mohon jalankan script fix_rls_recursion.sql.");
                } else if (error.code === 'PGRST116') {
                    toast.error("Profil tidak ditemukan! Anda belum memiliki record profile. Silakan Register ulang.");
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
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner">Memuat...</div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="app-container">
            <Sidebar role={userProfile?.role} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="main-content">
                <Header userProfile={userProfile} onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="page-wrapper">
                    <Outlet context={{ session, userProfile }} />
                </main>
            </div>
            {/* Backdrop ketika sidebar terbuka di mobile */}
            {isSidebarOpen && (
                <div 
                    className="sidebar-backdrop" 
                    onClick={() => setIsSidebarOpen(false)}
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
                />
            )}
        </div>
    );
}
