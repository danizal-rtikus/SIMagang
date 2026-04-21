import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    FileText, Eye, Edit3, X, ExternalLink,
    Clock, AlertTriangle, CheckCircle, Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonTableRow } from '../../components/Skeleton';
import TemplateSection from '../../components/TemplateSection';

const STATUS_META = {
    submitted: { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D', label: 'Menunggu',  badgeLabel: '⏳' },
    revision:  { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA', label: 'Perlu Revisi', badgeLabel: '!' },
    approved:  { bg: '#D1FAE5', color: '#059669', border: '#86EFAC', label: 'Disetujui', badgeLabel: '✓' },
};

export default function DosenFinalReports() {
    const [reports, setReports]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');

    // Review modal
    const [showModal, setShowModal]     = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [feedback, setFeedback]       = useState('');
    const [statusVal, setStatusVal]     = useState('approved');
    const [saving, setSaving]           = useState(false);

    // PDF viewer
    const [viewUrl, setViewUrl]         = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: internships } = await supabase
                .from('internships')
                .select('student_id, users_profile!internships_student_id_fkey(full_name, identifier)')
                .eq('dosen_id', user.id)
                .in('status', ['approved', 'finished']);

            if (internships) {
                const studentIds = internships.map(i => i.student_id);
                const studentMap = {};
                internships.forEach(i => {
                    studentMap[i.student_id] = {
                        name: i.users_profile?.full_name || 'Tanpa Nama',
                        nim:  i.users_profile?.identifier || 'N/A',
                    };
                });

                if (studentIds.length > 0) {
                    const { data: rpts } = await supabase
                        .from('final_reports')
                        .select('*')
                        .in('student_id', studentIds);

                    // Gabungkan dengan data mahasiswa yang belum submit juga
                    const reportMap = {};
                    (rpts || []).forEach(r => { reportMap[r.student_id] = r; });

                    const merged = internships.map(i => ({
                        student_id:   i.student_id,
                        student_name: studentMap[i.student_id].name,
                        student_nim:  studentMap[i.student_id].nim,
                        report:       reportMap[i.student_id] || null,
                    }));
                    setReports(merged);
                } else {
                    setReports([]);
                }
            }
        }
        setLoading(false);
    };

    const handleView = (report) => {
        if (!report?.file_url) return toast.error('Tidak ada file PDF.');
        if (report.file_url.startsWith('http')) setViewUrl(report.file_url);
        else {
            const { data } = supabase.storage.from('simagang-files').getPublicUrl(report.file_url);
            setViewUrl(data.publicUrl);
        }
    };

    const handleOpenReview = (item) => {
        if (!item.report) return toast.error('Mahasiswa belum mengunggah laporan akhir.');
        setSelectedReport({ ...item.report, student_name: item.student_name, student_nim: item.student_nim });
        setFeedback(item.report.note_dosen || '');
        setStatusVal(item.report.status === 'submitted' ? 'approved' : item.report.status);
        setShowModal(true);
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (statusVal === 'revision' && !feedback.trim()) {
            toast.error('Catatan wajib diisi saat minta revisi!'); return;
        }
        setSaving(true);
        const { error } = await supabase.from('final_reports')
            .update({ status: statusVal, note_dosen: feedback || null })
            .eq('id', selectedReport.id);
        setSaving(false);
        if (!error) {
            setShowModal(false);
            toast.success('Reviu berhasil disimpan!');
            fetchData();
        } else {
            toast.error('Gagal: ' + error.message);
        }
    };

    const filtered = reports.filter(r =>
        r.student_name.toLowerCase().includes(search.toLowerCase()) ||
        r.student_nim.toLowerCase().includes(search.toLowerCase())
    );

    const submitted = reports.filter(r => r.report && r.report.status === 'submitted').length;
    const approved  = reports.filter(r => r.report && r.report.status === 'approved').length;
    const revision  = reports.filter(r => r.report && r.report.status === 'revision').length;
    const noReport  = reports.filter(r => !r.report).length;

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>Laporan Akhir Mahasiswa</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Reviu laporan akhir magang setiap mahasiswa bimbingan.</p>
            </div>

            <TemplateSection type="final" title="📋 Template Laporan Akhir" />

            {/* Summary + Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                        { label: `${approved} Disetujui`,    bg: '#D1FAE5', color: '#059669' },
                        { label: `${submitted} Menunggu`,    bg: '#FEF3C7', color: '#D97706' },
                        { label: `${revision} Perlu Revisi`, bg: '#FEE2E2', color: '#DC2626' },
                        { label: `${noReport} Belum Upload`, bg: '#F1F5F9', color: '#64748B' },
                    ].map((b, i) => (
                        <span key={i} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: b.bg, color: b.color }}>
                            {b.label}
                        </span>
                    ))}
                </div>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari mahasiswa..."
                        style={{ width: '100%', padding: '7px 12px 7px 30px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.84rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border)' }}>
                                {['Mahasiswa', 'Status', 'Revisi', 'Tanggal Upload', 'File', 'Aksi'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {reports.length === 0 ? 'Belum ada mahasiswa bimbingan aktif.' : 'Tidak ada hasil pencarian.'}
                                </td></tr>
                            ) : (
                                filtered.map(item => {
                                    const sm = item.report ? (STATUS_META[item.report.status] || STATUS_META.submitted) : null;
                                    const history = Array.isArray(item.report?.revision_history) ? item.report.revision_history : [];
                                    return (
                                        <tr key={item.student_id} style={{ borderBottom: '1px solid var(--border)' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>

                                            {/* Nama */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E0E7FF', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                                                        {item.student_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>{item.student_name}</p>
                                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.student_nim}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '12px 16px' }}>
                                                {sm ? (
                                                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
                                                        {sm.badgeLabel} {sm.label}
                                                    </span>
                                                ) : (
                                                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#F1F5F9', color: '#94A3B8' }}>
                                                        Belum Diunggah
                                                    </span>
                                                )}
                                            </td>

                                            {/* Revisi count */}
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {history.length > 0 ? (
                                                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                                                        {history.length}x
                                                    </span>
                                                ) : <span style={{ color: '#CBD5E1', fontSize: '0.82rem' }}>—</span>}
                                            </td>

                                            {/* Tanggal */}
                                            <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {item.report?.created_at
                                                    ? new Date(item.report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : '—'}
                                            </td>

                                            {/* File */}
                                            <td style={{ padding: '12px 16px' }}>
                                                {item.report?.file_url ? (
                                                    <button onClick={() => handleView(item.report)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, padding: 0 }}>
                                                        <Eye size={14} /> Lihat PDF
                                                    </button>
                                                ) : <span style={{ color: '#CBD5E1', fontSize: '0.82rem' }}>—</span>}
                                            </td>

                                            {/* Aksi */}
                                            <td style={{ padding: '12px 16px' }}>
                                                {item.report ? (
                                                    <button onClick={() => handleOpenReview(item)}
                                                        style={{
                                                            padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px',
                                                            ...(item.report.status === 'submitted'
                                                                ? { background: 'var(--primary)', color: 'white' }
                                                                : { background: '#F1F5F9', color: 'var(--text-main)', border: '1px solid var(--border)' })
                                                        }}>
                                                        <Edit3 size={13} />
                                                        {item.report.status === 'submitted' ? 'Reviu' : 'Ubah Reviu'}
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>Menunggu upload</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modal Reviu ─── */}
            {showModal && selectedReport && (() => {
                const history = Array.isArray(selectedReport.revision_history) ? selectedReport.revision_history : [];
                return (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', backgroundColor: 'white', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Reviu Laporan Akhir</h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '18px', fontSize: '0.85rem', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <strong>{selectedReport.student_name}</strong> · {selectedReport.student_nim}
                                {history.length > 0 && (
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700 }}>
                                        Sudah revisi {history.length}x
                                    </span>
                                )}
                            </p>

                            {/* Buka PDF */}
                            {selectedReport.file_url && (
                                <button onClick={() => handleView(selectedReport)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '18px', padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: '#F8FAFC', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 500 }}>
                                    <Eye size={14} /> Buka PDF Laporan
                                </button>
                            )}

                            {/* Riwayat revisi */}
                            {history.length > 0 && (
                                <div style={{ marginBottom: '18px', backgroundColor: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px' }}>
                                    <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} /> Riwayat Catatan Revisi
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {[...history].reverse().map((h, i) => (
                                            <div key={i} style={{ padding: '8px 10px', backgroundColor: 'white', borderRadius: '6px', borderLeft: '3px solid #FECACA' }}>
                                                <p style={{ margin: '0 0 2px', fontSize: '0.68rem', color: '#DC2626', fontWeight: 700 }}>
                                                    Revisi ke-{h.round} · {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{h.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.88rem' }}>Keputusan</label>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', borderRadius: '8px', border: `2px solid ${statusVal === 'approved' ? '#10B981' : 'var(--border)'}`, backgroundColor: statusVal === 'approved' ? '#F0FDF4' : 'white', flex: 1, justifyContent: 'center', transition: 'all 0.15s' }}>
                                            <input type="radio" value="approved" checked={statusVal === 'approved'} onChange={e => setStatusVal(e.target.value)} style={{ display: 'none' }} />
                                            <CheckCircle size={16} color="#10B981" /> <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#059669' }}>Setujui</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', borderRadius: '8px', border: `2px solid ${statusVal === 'revision' ? '#EF4444' : 'var(--border)'}`, backgroundColor: statusVal === 'revision' ? '#FEF2F2' : 'white', flex: 1, justifyContent: 'center', transition: 'all 0.15s' }}>
                                            <input type="radio" value="revision" checked={statusVal === 'revision'} onChange={e => setStatusVal(e.target.value)} style={{ display: 'none' }} />
                                            <Edit3 size={16} color="#EF4444" /> <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#DC2626' }}>Minta Revisi</span>
                                        </label>
                                    </div>
                                </div>

                                {statusVal === 'revision' && (
                                    <div style={{ padding: '9px 12px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '6px', fontSize: '0.8rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertTriangle size={13} /> Catatan Anda akan dikirim ke mahasiswa sebagai instruksi perbaikan.
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>
                                        Catatan {statusVal === 'revision' ? <span style={{ color: '#EF4444' }}>*wajib</span> : <span style={{ color: 'var(--text-muted)' }}>(opsional)</span>}
                                    </label>
                                    <textarea className="input-field" rows="3"
                                        value={feedback} onChange={e => setFeedback(e.target.value)}
                                        placeholder={statusVal === 'revision' ? 'Jelaskan apa yang perlu diperbaiki...' : 'Masukan tambahan untuk mahasiswa...'}
                                        required={statusVal === 'revision'} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" onClick={() => setShowModal(false)}
                                        style={{ padding: '9px 18px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.88rem' }}>
                                        Batal
                                    </button>
                                    <button type="submit" disabled={saving} className="btn-primary">
                                        {saving ? 'Menyimpan...' : 'Simpan Reviu'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* PDF Viewer */}
            {viewUrl && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 60, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: '#1E293B', color: 'white' }}>
                        <span style={{ fontWeight: 600 }}>📄 Pratinjau Laporan Akhir</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <a href={viewUrl} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93C5FD', fontSize: '0.85rem', textDecoration: 'none' }}>
                                <ExternalLink size={15} /> Buka di Tab Baru
                            </a>
                            <button onClick={() => setViewUrl(null)}
                                style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={20} /> Tutup
                            </button>
                        </div>
                    </div>
                    <iframe src={viewUrl} style={{ flex: 1, border: 'none', backgroundColor: 'white' }} title="PDF Viewer" />
                </div>
            )}
        </div>
    );
}
