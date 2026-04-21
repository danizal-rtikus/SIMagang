import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, CheckCircle, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton, SkeletonTableRow } from '../../components/Skeleton';

const PAGE_SIZE = 10;

export default function DosenDailyReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [statusVal, setStatusVal] = useState('approved');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('daily_reports')
            .select('*, users_profile(full_name, identifier)')
            .order('date', { ascending: false });

        if (!error && data) setReports(data);
        setLoading(false);
    };

    // Pagination
    const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
    const pagedReports = useMemo(
        () => reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [reports, page]
    );

    const handlePageChange = (newPage) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleOpenReview = (report) => {
        setSelectedReport(report);
        setFeedback(report.note_dosen || '');
        setStatusVal(report.status === 'submitted' ? 'approved' : report.status);
        setShowModal(true);
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase
            .from('daily_reports')
            .update({ status: statusVal, note_dosen: feedback })
            .eq('id', selectedReport.id);

        if (!error) {
            setShowModal(false);
            toast.success("Reviu harian berhasil disimpan!");
            fetchReports();
        } else {
            toast.error("Gagal menyimpan reviu: " + error.message);
        }
    };

    // Komponen pagination yang dapat digunakan kembali
    const PaginationBar = () => (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderTop: '1px solid var(--border)',
            backgroundColor: '#FAFAFA'
        }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Menampilkan <strong>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, reports.length)}</strong> dari <strong>{reports.length}</strong> logbook
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {/* Prev */}
                <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '32px', height: '32px', borderRadius: '6px',
                        border: '1px solid var(--border)', cursor: page === 1 ? 'not-allowed' : 'pointer',
                        backgroundColor: page === 1 ? '#F8FAFC' : 'white',
                        color: page === 1 ? '#CBD5E1' : 'var(--primary)'
                    }}
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                    }, [])
                    .map((item, idx) => item === '...' ? (
                        <span key={`dots-${idx}`} style={{ padding: '0 4px', color: '#94A3B8', fontSize: '0.85rem' }}>…</span>
                    ) : (
                        <button
                            key={item}
                            onClick={() => handlePageChange(item)}
                            style={{
                                width: '32px', height: '32px', borderRadius: '6px',
                                border: '1px solid', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: item === page ? 700 : 400,
                                borderColor: item === page ? 'var(--primary)' : 'var(--border)',
                                backgroundColor: item === page ? 'var(--primary)' : 'white',
                                color: item === page ? 'white' : 'var(--text-main)',
                            }}
                        >
                            {item}
                        </button>
                    ))
                }

                {/* Next */}
                <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '32px', height: '32px', borderRadius: '6px',
                        border: '1px solid var(--border)', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                        backgroundColor: page === totalPages ? '#F8FAFC' : 'white',
                        color: page === totalPages ? '#CBD5E1' : 'var(--primary)'
                    }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Logbook Harian Mahasiswa</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Periksa dan berikan catatan terkait aktivitas harian mahasiswa bimbingan Anda.</p>
                </div>
                {!loading && reports.length > 0 && (
                    <div style={{ backgroundColor: '#E0E7FF', color: 'var(--primary)', borderRadius: '20px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600, alignSelf: 'center' }}>
                        {reports.length} Logbook
                    </div>
                )}
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                    {['Tanggal', 'Mahasiswa', 'Aktivitas Singkat', 'Status', 'Aksi'].map(h => (
                                        <th key={h} style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}
                            </tbody>
                        </table>
                    </div>
                ) : reports.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <MessageSquare size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px' }} />
                        <p style={{ margin: 0 }}>Belum ada logbook yang dikirimkan.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Tanggal</th>
                                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Mahasiswa</th>
                                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Aktivitas Singkat</th>
                                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedReports.map((report) => (
                                        <tr key={report.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                                        >
                                            <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                                                {new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '16px', fontWeight: 500 }}>
                                                {report.users_profile?.full_name || 'Tanpa Nama'} <br />
                                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                                                    {report.users_profile?.identifier || 'N/A'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {report.activity}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                                                    backgroundColor: report.status === 'approved' ? '#D1FAE5' : report.status === 'revision' ? '#FEE2E2' : '#FEF3C7',
                                                    color: report.status === 'approved' ? '#10B981' : report.status === 'revision' ? '#EF4444' : '#F59E0B'
                                                }}>
                                                    {report.status === 'approved' ? 'Disetujui' : report.status === 'revision' ? 'Revisi' : 'Menunggu'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <button
                                                    onClick={() => handleOpenReview(report)}
                                                    className="btn-primary"
                                                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                                >
                                                    Reviu
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {reports.length > PAGE_SIZE && <PaginationBar />}
                    </>
                )}
            </div>

            {/* Modal Reviu */}
            {showModal && selectedReport && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '8px' }}>Reviu Logbook</h2>
                        <p style={{ color: 'var(--primary)', fontWeight: 500, marginBottom: '24px' }}>
                            {selectedReport.users_profile?.full_name} ({selectedReport.users_profile?.identifier || 'N/A'}) <br />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {new Date(selectedReport.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        </p>

                        <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', fontSize: '0.95rem', whiteSpace: 'pre-wrap', marginBottom: '24px', border: '1px solid var(--border)', maxHeight: '200px', overflowY: 'auto', lineHeight: 1.7 }}>
                            {selectedReport.activity}
                        </div>

                        <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Keputusan Status</label>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="radio" value="approved" checked={statusVal === 'approved'} onChange={(e) => setStatusVal(e.target.value)} />
                                        <CheckCircle size={18} color="#10B981" /> Setujui
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="radio" value="revision" checked={statusVal === 'revision'} onChange={(e) => setStatusVal(e.target.value)} />
                                        <Edit3 size={18} color="#EF4444" /> Minta Revisi
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Catatan Pembimbing (Opsional)</label>
                                <textarea
                                    className="input-field" rows="3"
                                    value={feedback} onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Tambahkan masukan atau arahan untuk mahasiswa..."
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', cursor: 'pointer' }}>
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary">Simpan Reviu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
