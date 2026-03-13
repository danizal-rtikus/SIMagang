import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Megaphone, Calendar, Users } from 'lucide-react';

const renderTextWithLinks = (text) => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            const href = part.startsWith('http') ? part : `https://${part}`;
            return <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
        }
        return part;
    });
};

export default function Pengumuman() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAnnouncements(data);
        }
        setLoading(false);
    };

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Megaphone color="var(--primary)" size={32} />
                    Papan Pengumuman
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    Informasi dan pemberitahuan terbaru dari program studi.
                </p>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat pengumuman...</div>
            ) : announcements.length === 0 ? (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'white' }}>
                    <Megaphone size={48} color="var(--border)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>Belum Ada Pengumuman</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Saat ini tidak ada siaran informasi yang aktif.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '24px' }}>
                    {announcements.map((item) => (
                        <div key={item.id} className="glass-panel" style={{ 
                            padding: '32px', 
                            backgroundColor: 'white', 
                            borderLeft: '6px solid var(--primary)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', color: 'var(--text-main)' }}>
                                        {item.title}
                                    </h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={16} />
                                            {new Date(item.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize' }}>
                                            <Users size={16} />
                                            Ditujukan ke: {item.target_role === 'all' ? 'Semua Pengguna' : item.target_role}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ backgroundColor: '#F8FAFC', padding: '24px', borderRadius: '12px', fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                                {renderTextWithLinks(item.content)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
