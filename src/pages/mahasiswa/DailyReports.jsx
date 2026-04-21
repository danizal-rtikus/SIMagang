import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, MessageSquare, Trash2, Edit3, Printer, ExternalLink, FolderOpen, Link2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ── Deteksi URL & render sebagai hyperlink ────────────────
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+\.[^\s]{2,})/gi;

function renderTextWithLinks(text) {
    if (!text) return null;
    const parts = text.split(URL_REGEX);
    return parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
            URL_REGEX.lastIndex = 0; // reset
            const href = part.startsWith('http') ? part : `https://${part}`;
            return (
                <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: 'var(--primary)',
                        textDecoration: 'underline',
                        wordBreak: 'break-all',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                    }}
                >
                    {part}
                    <ExternalLink size={11} style={{ flexShrink: 0 }} />
                </a>
            );
        }
        return part;
    });
}

// ── Cek apakah link adalah Google Drive ──────────────────
function isGdriveLink(url) {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('sheets.google.com') || url.includes('slides.google.com');
}

export default function DailyReports() {
    const { userProfile } = useOutletContext();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        date: new Date().toISOString().split('T')[0],
        activity: '',
        project_link: '',
    });
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        fetchReports();
    }, [userProfile]);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('daily_reports')
            .select('*')
            .eq('student_id', userProfile.id)
            .order('date', { ascending: false });

        if (!error && data) setReports(data);
        setLoading(false);
    };

    const handleOpenAdd = () => {
        setFormData({ id: null, date: new Date().toISOString().split('T')[0], activity: '', project_link: '' });
        setShowModal(true);
    };

    const handleEditReport = (report) => {
        setFormData({
            id: report.id,
            date: report.date,
            activity: report.activity,
            project_link: report.project_link || '',
        });
        setShowModal(true);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        // Validasi: jika ada project_link, harus berformat URL
        if (formData.project_link && !formData.project_link.match(/^https?:\/\//)) {
            toast.error('Link Project harus diawali dengan https:// atau http://');
            return;
        }

        const payload = {
            date: formData.date,
            activity: formData.activity,
            project_link: formData.project_link || null,
            status: 'submitted',
        };

        let dbError;
        if (formData.id) {
            const { error } = await supabase.from('daily_reports').update(payload).eq('id', formData.id);
            dbError = error;
        } else {
            const { error } = await supabase.from('daily_reports').insert([{
                student_id: userProfile.id,
                ...payload,
            }]);
            dbError = error;
        }

        if (!dbError) {
            setShowModal(false);
            toast.success(formData.id ? 'Laporan harian berhasil dimodifikasi!' : 'Laporan harian berhasil dikirim!');
            fetchReports();
        } else {
            toast.error('Gagal memproses laporan: ' + dbError.message);
        }
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const { error } = await supabase.from('daily_reports').delete().eq('id', deleteConfirm);
        if (!error) {
            toast.success('Laporan harian berhasil dihapus!');
            fetchReports();
        } else {
            toast.error('Gagal menghapus laporan: ' + error.message);
        }
        setDeleteConfirm(null);
    };

    const getStatusBadge = (status) => {
        const specs = {
            submitted: { color: '#D97706', bg: '#FEF3C7', label: 'Terkirim' },
            approved:  { color: '#059669', bg: '#D1FAE5', label: 'Disetujui' },
            revision:  { color: '#DC2626', bg: '#FEE2E2', label: 'Revisi' },
        };
        const s = specs[status] || specs.submitted;
        return (
            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: s.color, backgroundColor: s.bg }}>
                {s.label}
            </span>
        );
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Laporan Harian</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Catatan jurnal kegiatan magang per hari.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/mahasiswa/daily-reports/print" className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', color: 'var(--text-main)', border: '1px solid var(--border)', boxShadow: 'none', fontSize: '0.85rem' }}>
                        <Printer size={16} /> Cetak PDF
                    </Link>
                    <button onClick={handleOpenAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Plus size={16} /> Tambah Kegiatan
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat laporan...</div>
                ) : reports.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <FolderOpen size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px' }} />
                        <p style={{ margin: 0 }}>Belum ada laporan harian. Klik "Tambah Kegiatan" untuk mulai.</p>
                    </div>
                ) : (
                    reports.map((report, idx) => (
                        <div
                            key={report.id}
                            style={{
                                padding: '20px 24px',
                                borderBottom: idx < reports.length - 1 ? '1px solid var(--border)' : 'none',
                            }}
                        >
                            {/* Row: tanggal + status + aksi */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
                                    {new Date(report.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {getStatusBadge(report.status)}
                                    {report.status !== 'approved' && (
                                        <>
                                            <button onClick={() => handleEditReport(report)}
                                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                                                title="Edit Laporan">
                                                <Edit3 size={15} />
                                            </button>
                                            <button onClick={() => setDeleteConfirm(report.id)}
                                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                                                title="Hapus Laporan">
                                                <Trash2 size={15} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Aktivitas — dengan auto-link */}
                            <div style={{
                                backgroundColor: '#F9FAFB', padding: '14px 16px', borderRadius: '6px',
                                fontSize: '0.88rem', whiteSpace: 'pre-wrap',
                                border: '1px solid var(--border)', lineHeight: 1.7,
                                color: 'var(--text-main)',
                            }}>
                                {renderTextWithLinks(report.activity)}
                            </div>

                            {/* Project Link (Google Drive) */}
                            {report.project_link && (
                                <div style={{ marginTop: '10px' }}>
                                    <a
                                        href={report.project_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem',
                                            fontWeight: 600, textDecoration: 'none',
                                            backgroundColor: isGdriveLink(report.project_link) ? '#E8F0FE' : '#F0FDF4',
                                            color: isGdriveLink(report.project_link) ? '#1A73E8' : '#059669',
                                            border: `1px solid ${isGdriveLink(report.project_link) ? '#BFD7FF' : '#BBF7D0'}`,
                                            transition: 'opacity 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        {isGdriveLink(report.project_link)
                                            ? <><img src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" alt="GDrive" style={{ width: '14px', height: '14px', objectFit: 'contain' }} /> Lihat Project di Google Drive</>
                                            : <><Link2 size={13} /> Lihat Link Project</>
                                        }
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            )}

                            {/* Catatan Dosen */}
                            {report.note_dosen && (
                                <div style={{
                                    marginTop: '12px', backgroundColor: '#FEF2F2', padding: '10px 14px',
                                    borderLeft: '3px solid #EF4444', borderRadius: '4px', fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'flex-start', gap: '8px'
                                }}>
                                    <MessageSquare size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <strong style={{ color: '#DC2626', fontSize: '0.8rem' }}>Catatan Pembimbing: </strong>
                                        {report.note_dosen}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* ── Modal Tambah / Edit ──────────────────────────────────── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '6px' }}>{formData.id ? 'Edit Jurnal Harian' : 'Isi Jurnal Hari Ini'}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
                            Link di kolom aktivitas akan otomatis terdeteksi sebagai hyperlink.
                        </p>

                        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Tanggal */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    Tanggal Kegiatan
                                </label>
                                <input
                                    type="date" required className="input-field"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            {/* Aktivitas */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    Aktivitas yang Dilakukan
                                </label>
                                <textarea
                                    required className="input-field" rows="5"
                                    value={formData.activity}
                                    onChange={e => setFormData({ ...formData, activity: e.target.value })}
                                    placeholder="Deskripsikan aktivitas magang Anda. URL yang diketik (https://...) akan otomatis jadi hyperlink."
                                />
                            </div>

                            {/* Project Link */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <img src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" alt="GDrive" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                        Link Project Harian (Opsional)
                                    </span>
                                </label>
                                <input
                                    type="url" className="input-field"
                                    value={formData.project_link}
                                    onChange={e => setFormData({ ...formData, project_link: e.target.value })}
                                    placeholder="https://drive.google.com/... atau link lainnya"
                                />
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                    Lampirkan link Google Drive, Docs, Sheets, atau link project lainnya.
                                </p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)}
                                    style={{ padding: '9px 20px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.88rem' }}>
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary">
                                    {formData.id ? 'Simpan Perubahan' : 'Kirim Laporan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Konfirmasi Hapus ─────────────────────────────────────── */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
                        <Trash2 size={36} color="#EF4444" style={{ margin: '0 auto 14px' }} />
                        <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '1rem' }}>Hapus Laporan Harian?</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>Data laporan dan link project tidak dapat dipulihkan.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirm(null)}
                                style={{ padding: '9px 22px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
                                Batal
                            </button>
                            <button onClick={executeDelete}
                                style={{ padding: '9px 22px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
