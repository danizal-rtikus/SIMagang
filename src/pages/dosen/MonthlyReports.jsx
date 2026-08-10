import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, Edit3, Eye, X, ExternalLink, Clock, AlertTriangle, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonTableRow } from '../../components/Skeleton';
import TemplateSection from '../../components/TemplateSection';

// ── Status cell config ────────────────────────────────────────
const CELL_STATUS = {
    approved: { bg: '#D1FAE5', color: '#059669', border: '#86EFAC', label: '✓',     title: 'Disetujui',       cursor: 'pointer' },
    submitted: { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D', label: '●',    title: 'Menunggu Reviu',  cursor: 'pointer' },
    revision:  { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA', label: '!',    title: 'Perlu Revisi',    cursor: 'pointer' },
    empty:     { bg: '#F1F5F9', color: '#94A3B8', border: '#E2E8F0', label: '–',    title: 'Belum Diunggah', cursor: 'default'  },
};

const progressColor = (pct) => pct === 100 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#E2E8F0';

export default function DosenMonthlyReports() {
    const [students, setStudents]     = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState('');

    // Review modal
    const [showModal, setShowModal]   = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [feedback, setFeedback]     = useState('');
    const [statusVal, setStatusVal]   = useState('approved');
    const [saving, setSaving]         = useState(false);

    // PDF viewer
    const [viewUrl, setViewUrl]       = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const [{ data: internships }, { data: reports }] = await Promise.all([
                supabase.from('internships')
                    .select('student_id, users_profile!internships_student_id_fkey(full_name, identifier)')
                    .eq('dosen_id', user.id)
                    .in('status', ['approved', 'finished']),
                supabase.from('monthly_reports').select('*'),
            ]);
            if (internships) setStudents(internships.map(i => ({
                id: i.student_id,
                name: i.users_profile?.full_name || 'Tanpa Nama',
                nim:  i.users_profile?.identifier || 'N/A',
            })));
            if (reports) setMonthlyData(reports);
        }
        setLoading(false);
    };

    const handleView = (report) => {
        if (!report.file_url) return toast.error('Tidak ada file PDF.');
        if (report.file_url.startsWith('http')) setViewUrl(report.file_url);
        else {
            const { data } = supabase.storage.from('simagang-files').getPublicUrl(report.file_url);
            setViewUrl(data.publicUrl);
        }
    };

    const handleOpenReview = (report, student) => {
        setSelectedReport(report);
        setSelectedStudent(student);
        setFeedback(report.note_dosen || '');
        setStatusVal(report.status === 'submitted' ? 'approved' : report.status);
        setShowModal(true);
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (statusVal === 'revision' && !feedback.trim()) {
            toast.error('Catatan wajib diisi saat minta revisi!'); return;
        }
        setSaving(true);
        const { error } = await supabase.from('monthly_reports')
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

    // Filter students
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.nim.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>Laporan Bulanan Mahasiswa</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Klik sel bulan untuk membuka reviu. Warna menunjukkan status laporan.</p>
            </div>

            <TemplateSection type="monthly" title="📋 Template Laporan Bulanan" />

            {/* Legend + Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.entries(CELL_STATUS).map(([k, v]) => (
                        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            <span style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: v.bg, border: `1px solid ${v.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: v.color }}>{v.label}</span>
                            {v.title}
                        </span>
                    ))}
                </div>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari mahasiswa..."
                        style={{ width: '100%', padding: '7px 12px 7px 30px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.84rem', fontFamily: 'inherit', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
            </div>

            {/* Matrix Table */}
            <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC' }}>
                            <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '200px' }}>Mahasiswa</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', width: '80px' }}>Progress</th>
                                {[1,2,3,4,5,6].map(m => (
                                    <th key={m} style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', width: '80px' }}>Bulan {m}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)
                            ) : filteredStudents.length === 0 ? (
                                <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {students.length === 0 ? 'Belum ada mahasiswa bimbingan yang aktif.' : 'Tidak ada hasil pencarian.'}
                                </td></tr>
                            ) : (
                                filteredStudents.map((student, idx) => {
                                    const studentReports = monthlyData.filter(r => r.student_id === student.id);
                                    const approvedCount = studentReports.filter(r => r.status === 'approved').length;
                                    const pct = Math.round((approvedCount / 6) * 100);
                                    const totalSubmitted = studentReports.length;

                                    return (
                                        <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>

                                            {/* Student name + NIM */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E0E7FF', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{student.name}</p>
                                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.nim}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Progress bar */}
                                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: pct === 100 ? '#059669' : 'var(--text-muted)', marginBottom: '4px' }}>
                                                    {approvedCount}/6
                                                </div>
                                                <div style={{ width: '56px', height: '6px', borderRadius: '3px', backgroundColor: '#E2E8F0', margin: '0 auto', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: progressColor(pct), transition: 'width 0.4s ease' }} />
                                                </div>
                                                {totalSubmitted > approvedCount && (
                                                    <div style={{ fontSize: '0.65rem', color: '#D97706', marginTop: '3px' }}>{totalSubmitted - approvedCount} pending</div>
                                                )}
                                            </td>

                                            {/* Month cells */}
                                            {[1,2,3,4,5,6].map(month => {
                                                const report = studentReports.find(r => r.month_number === month);
                                                const s = report ? CELL_STATUS[report.status] || CELL_STATUS.submitted : CELL_STATUS.empty;
                                                const revHistory = Array.isArray(report?.revision_history) ? report.revision_history : [];
                                                const canReview = report && report.status !== 'revision'; // can open review if submitted or approved

                                                return (
                                                    <td key={month} style={{ padding: '8px 8px', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            {/* Status cell — clickable */}
                                                            <div
                                                                onClick={() => report && handleOpenReview(report, student)}
                                                                title={s.title + (report ? ` · Klik untuk reviu` : '')}
                                                                style={{
                                                                    width: '36px', height: '36px', borderRadius: '8px',
                                                                    backgroundColor: s.bg, border: `1px solid ${s.border}`,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontWeight: 800, fontSize: '0.9rem', color: s.color,
                                                                    cursor: report ? 'pointer' : 'default',
                                                                    transition: 'all 0.15s',
                                                                }}
                                                                onMouseEnter={e => { if (report) e.currentTarget.style.filter = 'brightness(0.9)'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
                                                            >
                                                                {s.label}
                                                            </div>
                                                            {/* Lihat PDF + revisi badge */}
                                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                {report && (
                                                                    <button onClick={() => handleView(report)} title="Lihat PDF"
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '1px', display: 'flex', alignItems: 'center' }}>
                                                                        <Eye size={12} />
                                                                    </button>
                                                                )}
                                                                {revHistory.length > 0 && (
                                                                    <span style={{ fontSize: '0.6rem', backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1px 5px', borderRadius: '8px', fontWeight: 700 }}>
                                                                        R{revHistory.length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer summary */}
                {!loading && filteredStudents.length > 0 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', backgroundColor: '#FAFAFA', display: 'flex', gap: '16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>👥 {filteredStudents.length} mahasiswa</span>
                        <span>📋 {monthlyData.filter(r => filteredStudents.some(s => s.id === r.student_id)).length} laporan total</span>
                        <span>✅ {monthlyData.filter(r => r.status === 'approved' && filteredStudents.some(s => s.id === r.student_id)).length} disetujui</span>
                        <span>⏳ {monthlyData.filter(r => r.status === 'submitted' && filteredStudents.some(s => s.id === r.student_id)).length} menunggu</span>
                        <span>🔴 {monthlyData.filter(r => r.status === 'revision' && filteredStudents.some(s => s.id === r.student_id)).length} perlu revisi</span>
                    </div>
                )}
            </div>

            {/* ── Modal Reviu ─── */}
            {showModal && selectedReport && (() => {
                const history = Array.isArray(selectedReport.revision_history) ? selectedReport.revision_history : [];
                return (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', backgroundColor: 'white', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Reviu Laporan Bulanan</h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <strong>{selectedStudent?.name}</strong> · {selectedStudent?.nim} · Bulan ke-{selectedReport.month_number}
                                {history.length > 0 && (
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700 }}>
                                        Sudah revisi {history.length}x
                                    </span>
                                )}
                            </p>

                            {/* PDF preview link */}
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
                        <span style={{ fontWeight: 600 }}>📄 Pratinjau Laporan Bulanan</span>
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
