import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Eye, X, ExternalLink, FileText } from 'lucide-react';
import { Skeleton } from './Skeleton';

/**
 * Komponen section template laporan yang bisa di-embed di halaman mana saja.
 * Props:
 *   - type: 'monthly' | 'final'  — filter jenis template yang ditampilkan
 *   - title: string               — judul section (opsional)
 */
export default function TemplateSection({ type, title }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewUrl, setViewUrl] = useState(null);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true);
            let query = supabase.from('report_templates').select('*').order('created_at', { ascending: false });
            if (type) query = query.eq('type', type);
            const { data } = await query;
            setTemplates(data || []);
            setLoading(false);
        };
        fetchTemplates();
    }, [type]);

    const handleView = (tmpl) => {
        if (!tmpl.file_url) return;
        const { data } = supabase.storage.from('simagang-files').getPublicUrl(tmpl.file_url);
        setViewUrl(data.publicUrl);
    };

    if (!loading && templates.length === 0) return null;

    return (
        <>
            <div style={{
                backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE',
                borderRadius: '12px', marginBottom: '24px', overflow: 'hidden'
            }}>
                {/* Header */}
                <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setCollapsed(c => !c)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BookOpen size={18} color="#4F46E5" />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#3730A3' }}>
                            {title || 'Template Laporan'}
                        </span>
                        {!loading && (
                            <span style={{ backgroundColor: '#C7D2FE', color: '#4338CA', borderRadius: '20px', padding: '1px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                                {templates.length}
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#6366F1' }}>{collapsed ? 'Tampilkan ▼' : 'Sembunyikan ▲'}</span>
                </div>

                {/* Content */}
                {!collapsed && (
                    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {loading ? (
                            [1, 2].map(i => (
                                <div key={i} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '12px 16px' }}>
                                    <Skeleton height="14px" width="55%" style={{ marginBottom: '6px' }} />
                                    <Skeleton height="11px" width="75%" />
                                </div>
                            ))
                        ) : (
                            templates.map(tmpl => (
                                <div key={tmpl.id} style={{
                                    backgroundColor: 'white', borderRadius: '8px',
                                    padding: '12px 16px', border: '1px solid #E0E7FF',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                        <FileText size={18} color="#6366F1" style={{ flexShrink: 0 }} />
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {tmpl.title}
                                            </p>
                                            {tmpl.description && (
                                                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {tmpl.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {tmpl.file_url && (
                                        <button onClick={() => handleView(tmpl)} style={{
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            padding: '6px 14px', borderRadius: '6px',
                                            backgroundColor: '#4F46E5', color: 'white',
                                            border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                            flexShrink: 0, whiteSpace: 'nowrap'
                                        }}>
                                            <Eye size={14} /> Lihat PDF
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* PDF Viewer */}
            {viewUrl && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 60, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: '#1E293B', color: 'white' }}>
                        <span style={{ fontWeight: 600 }}>📄 Template Laporan</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <a href={viewUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93C5FD', fontSize: '0.85rem', textDecoration: 'none' }}>
                                <ExternalLink size={15} /> Buka di Tab Baru
                            </a>
                            <button onClick={() => setViewUrl(null)} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={20} /> Tutup
                            </button>
                        </div>
                    </div>
                    <iframe src={viewUrl} style={{ flex: 1, border: 'none', backgroundColor: 'white' }} title="PDF Template" />
                </div>
            )}
        </>
    );
}
