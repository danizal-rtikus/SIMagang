import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    UploadCloud, CheckCircle, Clock, AlertTriangle,
    FileText, Send, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import TemplateSection from '../../components/TemplateSection';

// ── Status helpers (plain language) ──────────────────────────
const STATUS_INFO = {
    submitted: {
        icon:       <Clock size={52} color="#F59E0B" />,
        label:      'Menunggu Review Dosen',
        badgeBg:    '#FEF3C7', badgeColor: '#D97706',
        bg:         '#FFFBEB', border:     '#FDE68A',
        desc:       'Laporan sudah dikirim dan sedang menunggu diperiksa oleh Dosen Pembimbing.',
    },
    revision: {
        icon:       <AlertTriangle size={52} color="#EF4444" />,
        label:      'Perlu Diperbaiki',
        badgeBg:    '#FEE2E2', badgeColor: '#DC2626',
        bg:         '#FEF2F2', border:     '#FECACA',
        desc:       'Dosen Pembimbing meminta Anda memperbaiki dan mengunggah ulang laporan akhir.',
    },
    approved: {
        icon:       <CheckCircle size={52} color="#10B981" />,
        label:      'Disetujui ✓',
        badgeBg:    '#D1FAE5', badgeColor: '#059669',
        bg:         '#F0FDF4', border:     '#86EFAC',
        desc:       'Laporan Akhir Anda telah disetujui oleh Dosen Pembimbing.',
    },
};

export default function FinalReports() {
    const { userProfile } = useOutletContext();
    const [report, setReport]             = useState(null);
    const [loading, setLoading]           = useState(true);

    // Upload modal
    const [showModal, setShowModal]       = useState(false);
    const [file, setFile]                 = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    // Revisi modal
    const [showRevisiModal, setShowRevisiModal] = useState(false);
    const [revisiFile, setRevisiFile]           = useState(null);
    const [revisiLoading, setRevisiLoading]     = useState(false);

    // History expand
    const [historyOpen, setHistoryOpen]  = useState(false);

    useEffect(() => { fetchReport(); }, [userProfile]);

    const fetchReport = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('final_reports')
            .select('*')
            .eq('student_id', userProfile.id)
            .maybeSingle();
        setReport(data || null);
        setLoading(false);
    };

    // ── Upload laporan baru ──────────────────────────────────
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploadLoading(true);
        try {
            const fileName = `final/${userProfile.id}/laporan_akhir_${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('simagang-files').upload(fileName, file, { cacheControl: '3600', upsert: false });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('simagang-files').getPublicUrl(fileName);
            const { error: dbError } = await supabase.from('final_reports').insert([{
                student_id: userProfile.id,
                file_url:   urlData.publicUrl,
                status:     'submitted',
                revision_history: [],
            }]);
            if (dbError) throw dbError;
            setShowModal(false);
            setFile(null);
            fetchReport();
            toast.success('Laporan Akhir berhasil diunggah!');
        } catch (err) {
            toast.error('Gagal mengunggah: ' + err.message);
        } finally {
            setUploadLoading(false);
        }
    };

    // ── Kirim Revisi ─────────────────────────────────────────
    const handleSubmitRevisi = async (e) => {
        e.preventDefault();
        if (!revisiFile) { toast.error('Pilih file PDF revisi.'); return; }
        setRevisiLoading(true);
        try {
            const fileName = `final/${userProfile.id}/laporan_akhir_rev_${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('simagang-files').upload(fileName, revisiFile, { cacheControl: '3600', upsert: false });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('simagang-files').getPublicUrl(fileName);

            const existingHistory = Array.isArray(report.revision_history) ? report.revision_history : [];
            const newEntry = {
                round: existingHistory.length + 1,
                note:  report.note_dosen || '(Tidak ada catatan)',
                date:  new Date().toISOString(),
            };
            const { error: dbError } = await supabase.from('final_reports').update({
                file_url:         urlData.publicUrl,
                status:           'submitted',
                note_dosen:       null,
                revision_history: [...existingHistory, newEntry],
            }).eq('id', report.id);
            if (dbError) throw dbError;

            setShowRevisiModal(false);
            setRevisiFile(null);
            fetchReport();
            toast.success('Revisi berhasil dikirim! Menunggu review ulang dosen.');
        } catch (err) {
            toast.error('Gagal mengirim revisi: ' + err.message);
        } finally {
            setRevisiLoading(false);
        }
    };

    const si = report ? (STATUS_INFO[report.status] || STATUS_INFO.submitted) : null;
    const history = Array.isArray(report?.revision_history) ? report.revision_history : [];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Laporan Akhir</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Dokumen evaluasi komprehensif akhir masa magang.</p>
                </div>
                {!report && !loading && (
                    <button onClick={() => { setFile(null); setShowModal(true); }}
                        className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UploadCloud size={18} /> Unggah Laporan
                    </button>
                )}
            </div>

            <TemplateSection type="final" title="📋 Template Laporan Akhir" />

            {/* Main card */}
            <div className="glass-panel" style={{ backgroundColor: 'white', maxWidth: '640px', margin: '0 auto', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
                ) : !report ? (
                    <div style={{ padding: '56px 40px', textAlign: 'center' }}>
                        <FileText size={56} color="var(--border)" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ marginBottom: '8px', color: 'var(--text-main)' }}>Laporan Belum Diunggah</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Klik tombol di kanan atas untuk mengunggah laporan akhir magang Anda.</p>
                        <button onClick={() => { setFile(null); setShowModal(true); }}
                            className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <UploadCloud size={16} /> Unggah Sekarang
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Status banner */}
                        <div style={{ padding: '28px 32px', backgroundColor: si.bg, borderBottom: `1px solid ${si.border}`, textAlign: 'center' }}>
                            <div style={{ marginBottom: '12px' }}>{si.icon}</div>
                            <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: si.badgeBg, color: si.badgeColor, marginBottom: '10px' }}>
                                {si.label}
                            </span>
                            {history.length > 0 && (
                                <span style={{ marginLeft: '8px', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                                    Revisi ke-{history.length}
                                </span>
                            )}
                            <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: si.badgeColor, lineHeight: 1.6 }}>{si.desc}</p>
                        </div>

                        {/* Catatan dosen (hanya saat revision) */}
                        {report.status === 'revision' && report.note_dosen && (
                            <div style={{ margin: '20px 24px 0', padding: '14px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
                                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.82rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <AlertTriangle size={13} /> Catatan dari Dosen Pembimbing:
                                </p>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: '#7F1D1D', whiteSpace: 'pre-wrap' }}>{report.note_dosen}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ padding: '20px 24px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <a href={report.file_url} target="_blank" rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '8px', backgroundColor: 'rgba(79,70,229,0.08)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', border: '1px solid rgba(79,70,229,0.2)' }}>
                                <ExternalLink size={15} /> Buka PDF
                            </a>

                            {report.status === 'revision' && (
                                <button onClick={() => { setRevisiFile(null); setShowRevisiModal(true); }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700 }}>
                                    <Send size={15} /> Kirim Revisi
                                </button>
                            )}
                        </div>

                        {/* Riwayat Revisi */}
                        {history.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--border)', padding: '12px 24px' }}>
                                <button onClick={() => setHistoryOpen(v => !v)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
                                    {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    Riwayat Revisi ({history.length})
                                </button>
                                {historyOpen && (
                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {[...history].reverse().map((h, i) => (
                                            <div key={i} style={{ padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', borderLeft: '3px solid #FECACA' }}>
                                                <p style={{ margin: '0 0 3px', fontSize: '0.72rem', color: '#DC2626', fontWeight: 700 }}>
                                                    Revisi ke-{h.round} · {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{h.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal: Upload Laporan Baru ─── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '8px' }}>Unggah Laporan Akhir</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Unggah dokumen PDF laporan akhir magang Anda.</p>
                        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>File Dokumen (PDF)</label>
                                <input type="file" accept=".pdf" required className="input-field"
                                    onChange={e => setFile(e.target.files[0])} style={{ padding: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 18px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }} disabled={uploadLoading}>Batal</button>
                                <button type="submit" className="btn-primary" disabled={uploadLoading}>
                                    {uploadLoading ? 'Mengunggah...' : 'Kirim Laporan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Kirim Revisi ─── */}
            {showRevisiModal && report && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '6px', fontSize: '1.15rem' }}>Kirim Revisi Laporan Akhir</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Unggah file laporan yang sudah diperbaiki sesuai catatan dosen.</p>

                        {report.note_dosen && (
                            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }}>
                                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.82rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <AlertTriangle size={13} /> Catatan yang Harus Diperbaiki:
                                </p>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: '#7F1D1D', whiteSpace: 'pre-wrap' }}>{report.note_dosen}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmitRevisi} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>File Revisi (PDF) <span style={{ color: '#EF4444' }}>*</span></label>
                                <input type="file" accept=".pdf" required className="input-field"
                                    onChange={e => setRevisiFile(e.target.files[0])} style={{ padding: '8px' }} />
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                    📌 Setelah dikirim, status akan kembali ke "Menunggu Review Dosen". Catatan sebelumnya tersimpan di riwayat.
                                </p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowRevisiModal(false)}
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
        </div>
    );
}
