import React from 'react';
import { User, Menu } from 'lucide-react';

export default function Header({ userProfile, onMenuClick }) {
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="header-user-info" style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                        {userProfile?.full_name || 'Loading...'}
                    </p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {userProfile?.role || 'User'}
                    </span>
                </div>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <User size={20} />
                </div>
            </div>
            <style>{`
                @media (max-width: 768px) {
                    .mobile-only-btn { display: block !important; }
                    .header h2 { font-size: 0.95rem !important; }
                }
            `}</style>
        </header>
    );
}
