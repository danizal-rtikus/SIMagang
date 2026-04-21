import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Eye, Edit3, Trash2, Upload, X, ChevronLeft, ChevronRight, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton, SkeletonTableRow } from '../../components/Skeleton';

const PAGE_SIZE = 10;
const MONTH_NAMES = ['Bulan ke-1','Bulan ke-2','Bulan ke-3','Bulan ke-4','Bulan ke-5','Bulan ke-6'];

export default function AdminMonthlyReports() {
    const [reports, setReports] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    // View PDF
    const [viewUrl, setViewUrl] = useState(null);

    // Upload/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editingReport, setEditingReport] = useState(null); // null = add
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadMonth, setUploadMonth] = useState(1);
    const [uploadStudentId, setUploadStudentId] = useState('');
    const [uploadStatus, setUploadStatus] = useState('submitted');
    const [saving, setSaving] = useState(false);

    // Delete confirm
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Semua mahasiswa yang punya internship
            const { data: internships } = await supabase
                .from('internships')
                .select('student_id, users_profile!internships_student_id_fkey(full_name, identifier)')
                .in('status', ['approved', 'finished']);

            const studentList = (internships || []).map(i => ({
                id: i.student_id,
                name: i.users_profile?.full_name || 'Tanpa Nama',
                nim: i.users_profile?.identifier || 'N/A'
            }));
            setStudents(studentList);

            // Semua laporan bulanan
            const { data: rpts } = await supabase
                .from('monthly_reports')
                .select('*, users_profile(full_name, identifier)')
                .order('created_at', { ascending: false });

            setReports(rpts || []);
        } finally {
            setLoading(false);
        }
    };

    // Pagination
    const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
    const pagedReports = useMemo(() => reports.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE), [reports, page]);

    // Helper: ekstrak path storage dari full URL atau gunakan langsung jika sudah path
    const getStoragePath = (fileUrl) => {
        if (!fileUrl) return null;
        if (fileUrl.startsWith('http')) {
            // Ambil path setelah '/simagang-files/'
            const marker = '/simagang-files/';
            const idx = fileUrl.indexOf(marker);
            return idx >= 0 ? fileUrl.slice(idx + marker.length) : null;
        }
        return fileUrl;
    };

    // View PDF
    const handleView = (report) => {
        if (!report.file_url) return toast.error('Tidak ada file PDF.');
        if (report.file_url.startsWith('http')) {
            setViewUrl(report.file_url);
        } else {
            const { data } = supabase.storage.from('simagang-files').getPublicUrl(report.file_url);
            setViewUrl(data.publicUrl);
        }
    };

    // Open modal Add
    const handleOpenAdd = () => {
        setEditingReport(null);
        setUploadFile(null);
        setUploadMonth(1);
        setUploadStudentId(students[0]?.id || '');
        setUploadStatus('submitted');
        setShowModal(true);
    };

    // Open modal Edit
    const handleOpenEdit = (report) => {
        setEditingReport(report);
        setUploadFile(null);
        setUploadMonth(report.month_number);
        setUploadStudentId(report.student_id);
        setUploadStatus(report.status);
        setShowModal(true);
    };

    // Save (Add or Edit)
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading('Menyimpan...');
        try {
            let filePath = editingReport?.file_url || null;

            if (uploadFile) {
                const ext = uploadFile.name.split('.').pop();
                const path = `monthly_reports/${uploadStudentId}_bulan${uploadMonth}_${Date.now()}.${ext}`;
                const { error: upErr, data } = await supabase.storage
                    .from('simagang-files').upload(path, uploadFile, { upsert: true });
                if (upErr) throw upErr;
                filePath = data.path;
            }

            if (editingReport) {
                // Update
                const { error } = await supabase.from('monthly_reports')
                    .update({ month_number: uploadMonth, student_id: uploadStudentId, status: uploadStatus, file_url: filePath })
                    .eq('id', editingReport.id);
                if (error) throw error;
                toast.success('Laporan diperbarui!', { id: toastId });
            } else {
                // Insert
                if (!uploadFile) throw new Error('Pilih file PDF terlebih dahulu.');
                const { error } = await supabase.from('monthly_reports')
                    .insert({ month_number: uploadMonth, student_id: uploadStudentId, status: uploadStatus, file_url: filePath });
                if (error) throw error;
                toast.success('Laporan berhasil diunggah!', { id: toastId });
            }

            setShowModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    // Delete
    const handleDelete = async (report) => {
        const toastId = toast.loading('Menghapus...');
        try {
            const storagePath = getStoragePath(report.file_url);
            if (storagePath) {
                await supabase.storage.from('simagang-files').remove([storagePath]);
            }
            const { error } = await supabase.from('monthly_reports').delete().eq('id', report.id);
            if (error) throw error;
            toast.success('Laporan dihapus.', { id: toastId });
            fetchData();
        } catch (err) {
            toast.error(err.message, { id: toastId });
        } finally {
            setDeleteConfirm(null);
        }
    };

    const statusColor = (s) => ({
        submitted: { bg: '#FEF3C7', text: '#D97706' },
        approved:  { bg: '#D1FAE5', text: '#059669' },
        revision:  { bg: '#FEE2E2', text: '#EF4444' },
    }[s] || { bg: '#F1F5F9', text: '#64748B' });

    return (
        <div>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Laporan Bulanan Mahasiswa</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kelola unggahan laporan PDF bulanan seluruh mahasiswa magang.</p>
                </div>
                <button onClick={handleOpenAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} /> Unggah Laporan
                </button>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                {loading ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>{Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</tbody>
                    </table>
                ) : reports.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <FileText size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px' }} />
                        <p style={{ margin: 0 }}>Belum ada laporan bulanan yang diunggah.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                        {['Mahasiswa', 'Bulan Ke', 'Status', 'Tanggal Unggah', 'File', 'Aksi'].map(h => (
                                            <th key={h} style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.88rem' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedReports.map(rpt => {
                                        const sc = statusColor(rpt.status);
                                        return (
                                            <tr key={rpt.id} style={{ borderBottom: '1px solid var(--border)' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor='#F8FAFC'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor=''}>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{rpt.users_profile?.full_name || '-'}</p>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rpt.users_profile?.identifier || ''}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', fontWeight: 500 }}>{MONTH_NAMES[(rpt.month_number||1)-1]}</td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, backgroundColor: sc.bg, color: sc.text }}>
                                                        {rpt.status === 'approved' ? 'Disetujui' : rpt.status === 'revision' ? 'Revisi' : 'Menunggu'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {new Date(rpt.created_at).toLocaleDateString('id-ID', { day:'numeric',month:'short',year:'numeric' })}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    {rpt.file_url ? (
                                                        <button onClick={() => handleView(rpt)} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}>
                                                            <Eye size={15} /> Lihat PDF
                                                        </button>
                                                    ) : <span style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button onClick={() => handleOpenEdit(rpt)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--primary)', display:'flex', alignItems:'center', gap:'4px', fontSize:'0.82rem' }}>
                                                            <Edit3 size={14}/> Edit
                                                        </button>
                                                        <button onClick={() => setDeleteConfirm(rpt)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #FEE2E2', background: '#FFF5F5', cursor: 'pointer', color: '#EF4444', display:'flex', alignItems:'center', gap:'4px', fontSize:'0.82rem' }}>
                                                            <Trash2 size={14}/> Hapus
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {reports.length > PAGE_SIZE && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', backgroundColor: '#FAFAFA' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, reports.length)} dari {reports.length} laporan
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ width:'32px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',background:page===1?'#F8FAFC':'white',cursor:page===1?'not-allowed':'pointer',color:page===1?'#CBD5E1':'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronLeft size={16}/></button>
                                    <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ width:'32px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',background:page===totalPages?'#F8FAFC':'white',cursor:page===totalPages?'not-allowed':'pointer',color:page===totalPages?'#CBD5E1':'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronRight size={16}/></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── PDF VIEWER ── */}
            {viewUrl && (
                <div style={{ position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.75)',zIndex:60,display:'flex',flexDirection:'column' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',backgroundColor:'#1E293B',color:'white' }}>
                        <span style={{ fontWeight:600 }}>📄 Pratinjau Laporan Bulanan</span>
                        <div style={{ display:'flex',gap:'10px' }}>
                            <a href={viewUrl} target="_blank" rel="noopener noreferrer" style={{ display:'flex',alignItems:'center',gap:'6px',color:'#93C5FD',fontSize:'0.85rem',textDecoration:'none' }}>
                                <ExternalLink size={15}/> Buka di Tab Baru
                            </a>
                            <button onClick={() => setViewUrl(null)} style={{ color:'white',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px' }}>
                                <X size={20}/> Tutup
                            </button>
                        </div>
                    </div>
                    <iframe src={viewUrl} style={{ flex:1,border:'none',backgroundColor:'white' }} title="PDF Viewer" />
                </div>
            )}

            {/* ── UPLOAD / EDIT MODAL ── */}
            {showModal && (
                <div style={{ position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px' }}>
                    <div className="glass-panel" style={{ width:'100%',maxWidth:'500px',backgroundColor:'white',padding:'32px' }}>
                        <h2 style={{ marginBottom:'20px' }}>{editingReport ? 'Edit Laporan Bulanan' : 'Unggah Laporan Bulanan'}</h2>
                        <form onSubmit={handleSave} style={{ display:'flex',flexDirection:'column',gap:'16px' }}>
                            <div>
                                <label style={{ display:'block',marginBottom:'8px',fontWeight:500,fontSize:'0.9rem' }}>Mahasiswa</label>
                                <select className="input-field" value={uploadStudentId} onChange={e => setUploadStudentId(e.target.value)} required>
                                    <option value="">-- Pilih Mahasiswa --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.nim})</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display:'block',marginBottom:'8px',fontWeight:500,fontSize:'0.9rem' }}>Bulan Ke</label>
                                <select className="input-field" value={uploadMonth} onChange={e => setUploadMonth(Number(e.target.value))}>
                                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Bulan ke-{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display:'block',marginBottom:'8px',fontWeight:500,fontSize:'0.9rem' }}>Status</label>
                                <select className="input-field" value={uploadStatus} onChange={e => setUploadStatus(e.target.value)}>
                                    <option value="submitted">Menunggu</option>
                                    <option value="approved">Disetujui</option>
                                    <option value="revision">Perlu Revisi</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display:'block',marginBottom:'8px',fontWeight:500,fontSize:'0.9rem' }}>
                                    File PDF {editingReport && <span style={{ color:'var(--text-muted)',fontWeight:400 }}>(kosongkan jika tidak diubah)</span>}
                                </label>
                                <input type="file" accept=".pdf" onChange={e => setUploadFile(e.target.files?.[0]||null)}
                                    className="input-field" required={!editingReport} style={{ padding:'8px' }} />
                            </div>
                            <div style={{ display:'flex',justifyContent:'flex-end',gap:'12px',marginTop:'8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding:'10px 20px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer' }}>Batal</button>
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRM ── */}
            {deleteConfirm && (
                <div style={{ position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px' }}>
                    <div className="glass-panel" style={{ width:'100%',maxWidth:'420px',backgroundColor:'white',padding:'32px',textAlign:'center' }}>
                        <Trash2 size={40} color="#EF4444" style={{ margin:'0 auto 16px' }} />
                        <h3 style={{ marginBottom:'8px' }}>Hapus Laporan?</h3>
                        <p style={{ color:'var(--text-muted)',marginBottom:'24px' }}>File PDF akan dihapus permanen dari storage.</p>
                        <div style={{ display:'flex',gap:'12px',justifyContent:'center' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding:'10px 24px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer' }}>Batal</button>
                            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding:'10px 24px',borderRadius:'8px',background:'#EF4444',color:'white',border:'none',cursor:'pointer',fontWeight:600 }}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
