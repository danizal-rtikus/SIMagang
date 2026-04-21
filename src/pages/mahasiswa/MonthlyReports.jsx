import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    UploadCloud, CheckCircle, Clock, AlertTriangle,
    FileText, Trash2, Send, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import TemplateSection from '../../components/TemplateSection';

// ── Status helpers (plain language) ──────────────────────────
const STATUS_INFO = {
    submitted: {
        label:   'Menunggu Review Dosen',
        icon:    <Clock size={20} color="#F59E0B" />,
        bg:      '#FFF7ED',
        border:  '#FED7AA',
        textColor: '#C2410C',
        badgeBg: '#FEF3C7',
        badgeColor: '#D97706',
        desc:    'Laporan sudah dikirim dan sedang menunggu diperiksa oleh Dosen Pembimbing.',
    },
    revision: {
        label:   'Perlu Diperbaiki',
        icon:    <AlertTriangle size={20} color="#EF4444" />,
        bg:      '#FEF2F2',
        border:  '#FECACA',
        textColor: '#DC2626',
        badgeBg: '#FEE2E2',
        badgeColor: '#DC2626',
        desc:    'Dosen Pembimbing meminta Anda memperbaiki dan mengunggah ulang laporan.',
    },
    approved: {
        label:   'Disetujui',
        icon:    <CheckCircle size={20} color="#10B981" />,
        bg:      '#F0FDF4',
        border:  '#BBF7D0',
        textColor: '#065F46',
        badgeBg: '#D1FAE5',
        badgeColor: '#059669',
        desc:    'Laporan Anda telah disetujui oleh Dosen Pembimbing.',
    },
};

export default function MonthlyReports() {
    const { userProfile } = useOutletContext();
    const [reports, setReports]   = useState([]);
    const [loading, setLoading]   = useState(true);

    // Modal: Upload baru
    const [showModal, setShowModal]   = useState(false);
    const [formData, setFormData]     = useState({ id: null, month_number: 1 });
    const [file, setFile]             = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    // Modal: Kirim Revisi  
    const [showRevisiModal, setShowRevisiModal]   = useState(false);
    const [revisiTarget, setRevisiTarget]         = useState(null);
    const [revisiFile, setRevisiFile]             = useState(null);
    const [revisiLoading, setRevisiLoading]       = useState(false);

    // Delete confirm
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // History expand state: { [reportId]: bool }
    const [historyOpen, setHistoryOpen] = useState({});

    useEffect(() => { fetchReports(); }, [userProfile]);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('monthly_reports')
            .select('*')
            .eq('student_id', userProfile.id)
            .order('month_number', { ascending: true });
        if (!error && data) setReports(data);
        setLoading(false);
    };

    const currentMonthsReported = reports.map(r => r.month_number);
    const availableMonths = [1, 2, 3, 4, 5, 6].filter(m => !currentMonthsReported.includes(m));

    // ── Upload laporan baru ──────────────────────────────────
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploadLoading(true);
        try {
            const fileName = `monthly/${userProfile.id}/bulan_${formData.month_number}_${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('simagang-files')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('simagang-files').getPublicUrl(fileName);
            const { error: dbError } = await supabase.from('monthly_reports').insert([{
                student_id:   userProfile.id,
                month_number: parseInt(formData.month_number),
                file_url:     urlData.publicUrl,
                status:       'submitted',
                revision_history: [],
            }]);
            if (dbError) throw dbError;
            setShowModal(false);
            setFile(null);
            fetchReports();
            toast.success('Laporan berhasil diunggah!');
        } catch (err) {
            toast.error('Gagal mengunggah: ' + err.message);
        } finally {
            setUploadLoading(false);
        }
    };

    // ── Kirim Revisi ─────────────────────────────────────────
    const handleOpenRevisi = (report) => {
        setRevisiTarget(report);
        setRevisiFile(null);
        setShowRevisiModal(true);
    };

    const handleSubmitRevisi = async (e) => {
        e.preventDefault();
        if (!revisiFile) { toast.error('Pilih file PDF revisi terlebih dahulu.'); return; }
        setRevisiLoading(true);
        try {
            // 1. Upload file baru
            const fileName = `monthly/${userProfile.id}/bulan_${revisiTarget.month_number}_rev_${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('simagang-files')
                .upload(fileName, revisiFile, { cacheControl: '3600', upsert: false });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('simagang-files').getPublicUrl(fileName);

            // 2. Simpan catatan lama ke revision_history, kemudian update record
            const existingHistory = Array.isArray(revisiTarget.revision_history) ? revisiTarget.revision_history : [];
            const newHistoryEntry = {
                round: existingHistory.length + 1,
                note:  revisiTarget.note_dosen || '(Tidak ada catatan)',
                date:  new Date().toISOString(),
            };
            const updatedHistory = [...existingHistory, newHistoryEntry];

            const { error: dbError } = await supabase.from('monthly_reports').update({
                file_url:          urlData.publicUrl,
                status:            'submitted',
                note_dosen:        null,
                revision_history:  updatedHistory,
            }).eq('id', revisiTarget.id);
            if (dbError) throw dbError;

            setShowRevisiModal(false);
            setRevisiTarget(null);
            fetchReports();
            toast.success('Revisi berhasil dikirim! Menunggu review ulang dosen.');
        } catch (err) {
            toast.error('Gagal mengirim revisi: ' + err.message);
        } finally {
            setRevisiLoading(false);
        }
    };

    // ── Hapus laporan ────────────────────────────────────────
    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const { error } = await supabase.from('monthly_reports').delete().eq('id', deleteConfirm.id);
        if (!error) {
            toast.success('Laporan bulanan berhasil dihapus!');
            fetchReports();
        } else {
            toast.error('Gagal menghapus: ' + error.message);
        }
        setDeleteConfirm(null);
    };

    const toggleHistory = (id) => setHistoryOpen(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Laporan Bulanan</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Progres dokumen laporan dari bulan 1 sampai 6.</p>
                </div>
                {availableMonths.length > 0 && (
                    <button
                        onClick={() => { setFormData({ id: null, month_number: availableMonths[0] }); setFile(null); setShowModal(true); }}
                        className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UploadCloud size={18} /> Unggah Laporan
                    </button>
                )}
            </div>

            <TemplateSection type="monthly" title="📋 Template Laporan Bulanan" />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {[1, 2, 3, 4, 5, 6].map((month) => {
                    const report = reports.find(r => r.month_number === month);
                    const si = report ? (STATUS_INFO[report.status] || STATUS_INFO.submitted) : null;
                    const history = Array.isArray(report?.revision_history) ? report.revision_history : [];
                    const isHistoryOpen = historyOpen[report?.id];

                    return (
                        <div key={month} className="glass-panel" style={{
                            padding: '0', backgroundColor: report ? 'white' : '#F8FAFC',
                            border: report ? `1px solid ${si?.border}` : '1px solid var(--border)',
                            overflow: 'hidden'
                        }}>
                            {/* Card Header */}
                            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '8px',
                                        backgroundColor: si ? si.bg : '#F1F5F9',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        {si ? si.icon : <FileText size={18} color="#94A3B8" />}
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Bulan ke-{month}</p>
                                        {si && (
                                            <span style={{ padding: '1px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: si.badgeBg, color: si.badgeColor }}>
                                                {si.label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {report && history.length > 0 && (
                                    <span style={{ fontSize: '0.72rem', backgroundColor: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                        Revisi ke-{history.length}
                                    </span>
                                )}
                            </div>

                            {/* Card Body */}
                            <div style={{ padding: '16px 20px' }}>
                                {!report ? (
                                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '12px 0' }}>
                                        Belum ada laporan diunggah.
                                    </p>
                                ) : (
                                    <>
                                        {/* Status description (plain language) */}
                                        <p style={{ fontSize: '0.83rem', color: si?.textColor, margin: '0 0 14px', lineHeight: 1.5 }}>
                                            {si?.desc}
                                        </p>

                                        {/* Catatan revisi (hanya jika status revision) */}
                                        {report.status === 'revision' && report.note_dosen && (
                                            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                                                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.8rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <AlertTriangle size={12} /> Catatan dari Dosen Pembimbing:
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.84rem', color: '#7F1D1D', whiteSpace: 'pre-wrap' }}>{report.note_dosen}</p>
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: history.length > 0 ? '12px' : 0 }}>
                                            {/* Lihat PDF */}
                                            <a href={report.file_url} target="_blank" rel="noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', fontWeight: 500, border: '1px solid currentColor', padding: '6px 12px', borderRadius: '16px', fontSize: '0.82rem', textDecoration: 'none' }}>
                                                <ExternalLink size={12} /> Lihat PDF
                                            </a>

                                            {/* Kirim Revisi — hanya jika revision */}
                                            {report.status === 'revision' && (
                                                <button
                                                    onClick={() => handleOpenRevisi(report)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '16px', border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                                                    <Send size={12} /> Kirim Revisi
                                                </button>
                                            )}

                                            {/* Hapus — hanya jika belum disetujui dan belum ada revisi aktif */}
                                            {report.status !== 'approved' && report.status !== 'revision' && (
                                                <button onClick={() => setDeleteConfirm({ id: report.id, month: report.month_number })}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '16px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontSize: '0.82rem' }}>
                                                    <Trash2 size={12} /> Hapus
                                                </button>
                                            )}
                                        </div>

                                        {/* Riwayat Revisi */}
                                        {history.length > 0 && (
                                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                                <button onClick={() => toggleHistory(report.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                                                    {isHistoryOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                    Riwayat Revisi ({history.length})
                                                </button>
                                                {isHistoryOpen && (
                                                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {[...history].reverse().map((h, i) => (
                                                            <div key={i} style={{ padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', borderLeft: '3px solid #CBD5E1' }}>
                                                                <p style={{ margin: '0 0 3px', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                                    Revisi ke-{h.round} · {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </p>
                                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{h.note}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Modal: Upload Laporan Baru ─── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Unggah Laporan Bulanan</h2>
                        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Pilih Periode Laporan</label>
                                <select className="input-field" value={formData.month_number} onChange={(e) => setFormData({ ...formData, month_number: e.target.value })}>
                                    {availableMonths.map(m => <option key={m} value={m}>Laporan Bulan ke-{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>File Dokumen (PDF)</label>
                                <input type="file" accept=".pdf" required className="input-field"
                                    onChange={(e) => setFile(e.target.files[0])} style={{ padding: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }} disabled={uploadLoading}>Batal</button>
                                <button type="submit" className="btn-primary" disabled={uploadLoading}>
                                    {uploadLoading ? 'Mengunggah...' : 'Simpan Laporan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Kirim Revisi ─── */}
            {showRevisiModal && revisiTarget && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '6px', fontSize: '1.15rem' }}>Kirim Revisi Laporan Bulan ke-{revisiTarget.month_number}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Unggah file laporan yang sudah diperbaiki sesuai catatan dosen.</p>

                        {/* Catatan dosen sebagai konteks */}
                        {revisiTarget.note_dosen && (
                            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }}>
                                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.82rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <AlertTriangle size={13} /> Catatan yang Harus Diperbaiki:
                                </p>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: '#7F1D1D', whiteSpace: 'pre-wrap' }}>{revisiTarget.note_dosen}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmitRevisi} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>File Revisi (PDF) <span style={{ color: '#EF4444' }}>*</span></label>
                                <input type="file" accept=".pdf" required className="input-field"
                                    onChange={(e) => setRevisiFile(e.target.files[0])} style={{ padding: '8px' }} />
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                    📌 Setelah dikirim, status akan kembali ke "Menunggu Review Dosen". Catatan sebelumnya akan tersimpan di riwayat.
                                </p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => { setShowRevisiModal(false); setRevisiTarget(null); }}
                                    style={{ padding: '10px 18px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }} disabled={revisiLoading}>
                                    Batal
                                </button>
                                <button type="submit" disabled={revisiLoading}
                                    style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Send size={15} /> {revisiLoading ? 'Mengirim...' : 'Kirim Revisi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Konfirmasi Hapus ─── */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px 0', fontWeight: 500, fontSize: '1.05rem', color: '#1e293b' }}>
                            Yakin ingin menghapus laporan bulan ke-{deleteConfirm.month}?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Batal</button>
                            <button onClick={executeDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontWeight: 500 }}>Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
