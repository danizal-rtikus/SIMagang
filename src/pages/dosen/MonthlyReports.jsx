import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, CheckCircle, Edit3, Eye, X, ExternalLink, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton } from '../../components/Skeleton';
import TemplateSection from '../../components/TemplateSection';

export default function DosenMonthlyReports() {
    const [students, setStudents] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [statusVal, setStatusVal] = useState('approved');
    const [viewUrl, setViewUrl] = useState(null); // PDF iframe viewer
    const [historyOpen, setHistoryOpen] = useState({}); // { studentId_month: bool }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // 1. Dapatkan daftar mahasiswa bimbingannya dari tabel internships
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Ambil data student dan join dari attendances dll
            const { data: internships } = await supabase
                .from('internships')
                .select('student_id, users_profile!internships_student_id_fkey(full_name, identifier)')
                .eq('dosen_id', user.id)
                .in('status', ['approved', 'finished']);

            if (internships) {
                setStudents(internships.map(i => ({
                    id: i.student_id,
                    name: i.users_profile?.full_name || 'Tanpa Nama',
                    nim: i.users_profile?.identifier || 'N/A'
                })));
            }

            // 2. Ambil data laporan bulanan
            const { data: reports } = await supabase
                .from('monthly_reports')
                .select('*');

            if (reports) setMonthlyData(reports);
        }

        setLoading(false);
    };

    const handleView = (report) => {
        if (!report.file_url) return toast.error('Tidak ada file PDF.');
        // Jika file_url sudah berupa full URL (https://), gunakan langsung
        // Jika hanya path storage, baru panggil getPublicUrl
        if (report.file_url.startsWith('http')) {
            setViewUrl(report.file_url);
        } else {
            const { data } = supabase.storage.from('simagang-files').getPublicUrl(report.file_url);
            setViewUrl(data.publicUrl);
        }
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
            .from('monthly_reports')
            .update({ status: statusVal, note_dosen: feedback })
            .eq('id', selectedReport.id);

        if (!error) {
            setShowModal(false);
            toast.success("Reviu Laporan Bulanan berhasil disimpan!");
            fetchData();
        } else {
            toast.error("Gagal menyimpan reviu: " + error.message);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Progress Tracking Laporan Bulanan</h1>
                <p style={{ color: 'var(--text-muted)' }}>Pantau kelengkapan laporan mahasiswa per bulan (Bulan 1 - 6).</p>
            </div>

            <TemplateSection type="monthly" title="📋 Template Laporan Bulanan" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {[1,2,3].map(i => (
                            <div key={i} className="glass-panel" style={{ backgroundColor: 'white', padding: '20px 24px' }}>
                                <Skeleton height="20px" width="40%" style={{ marginBottom: '8px' }} />
                                <Skeleton height="12px" width="25%" style={{ marginBottom: '16px' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
                                    {[1,2,3,4,5,6].map(n => (
                                        <div key={n} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'8px' }}>
                                            <Skeleton circle width="48px" height="48px" />
                                            <Skeleton height="12px" width="50px" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : students.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada mahasiswa bimbingan yang aktif.</div>
                ) : (
                    students.map(student => {
                        const studentReports = monthlyData.filter(r => r.student_id === student.id);
                        const progress = Math.round((studentReports.length / 6) * 100);

                        return (
                            <div key={student.id} className="glass-panel" style={{ backgroundColor: 'white' }}>
                                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>
                                            {student.name} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({student.nim})</span>
                                        </h3>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{studentReports.length} dari 6 Laporan Terkumpul</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '100px', backgroundColor: 'var(--border)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${progress}%`, backgroundColor: progress === 100 ? '#10B981' : 'var(--primary)' }}></div>
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{progress}%</span>
                                    </div>
                                </div>

                                <div style={{ padding: '24px 24px 40px', position: 'relative' }}>
                                    {/* Garis latar belakang stepper */}
                                    <div style={{ position: 'absolute', top: '48px', left: '8%', right: '8%', height: '4px', backgroundColor: 'var(--border)', zIndex: 0 }}></div>
                                    
                                    {/* Garis progres aktif */}
                                    <div style={{ 
                                        position: 'absolute', top: '48px', left: '8%', 
                                        width: `calc(${(studentReports.length / 5) * 84}%)`, 
                                        height: '4px', backgroundColor: '#10B981', zIndex: 0,
                                        transition: 'width 0.5s ease'
                                    }}></div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                                        {[1, 2, 3, 4, 5, 6].map(month => {
                                            const report = studentReports.find(r => r.month_number === month);
                                            const isSubmitted = !!report;
                                            const isApproved = report?.status === 'approved';
                                            const isRevision = report?.status === 'revision';
                                            
                                            let circleColor = 'white';
                                            let borderColor = 'var(--border)';
                                            let iconColor = 'var(--text-muted)';
                                            
                                            if (isApproved) {
                                                circleColor = '#10B981'; borderColor = '#10B981'; iconColor = 'white';
                                            } else if (isRevision) {
                                                circleColor = '#EF4444'; borderColor = '#EF4444'; iconColor = 'white';
                                            } else if (isSubmitted) {
                                                circleColor = '#F59E0B'; borderColor = '#F59E0B'; iconColor = 'white'; // Menunggu Reviu
                                            }

                                            return (
                                                <div key={month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px' }}>
                                                    {/* Lingkaran Angka/Ikon */}
                                                    <div style={{ 
                                                        width: '48px', height: '48px', borderRadius: '50%', 
                                                        backgroundColor: circleColor,
                                                        border: `4px solid ${isSubmitted ? 'transparent' : borderColor}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: iconColor, fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '8px',
                                                        boxShadow: isSubmitted ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                                                        transition: 'all 0.3s ease', position: 'relative'
                                                    }}>
                                                        {isApproved ? <CheckCircle size={24} /> : month}
                                                    </div>

                                                    {/* Badge revisi */}
                                                    {report && Array.isArray(report.revision_history) && report.revision_history.length > 0 && (
                                                        <span style={{ fontSize: '0.62rem', backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1px 6px', borderRadius: '10px', fontWeight: 700, marginBottom: '4px' }}>
                                                            Revisi {report.revision_history.length}x
                                                        </span>
                                                    )}

                                                    {/* Detail Teks dan Tombol */}
                                                    <div style={{ textAlign: 'center' }}>
                                                        <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: isSubmitted ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                                            Bulan {month}
                                                        </h4>
                                                        
                                                        {report ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                                                <span className="badge" style={{ 
                                                                    backgroundColor: isApproved ? '#D1FAE5' : isRevision ? '#FEE2E2' : '#FEF3C7',
                                                                    color: isApproved ? '#059669' : isRevision ? '#DC2626' : '#D97706',
                                                                    fontSize: '0.75rem', padding: '2px 8px'
                                                                }}>
                                                                    {isApproved ? 'Disetujui' : isRevision ? 'Revisi' : 'Menunggu'}
                                                                </span>
                                                                
                                                                <button onClick={() => handleOpenReview(report)} className={report.status === 'submitted' ? "btn-primary" : "input-field"} style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                                    {report.status === 'submitted' ? 'Reviu Sekarang' : 'Ubah Reviu'} 
                                                                </button>
                                                                
                                                                <button onClick={() => handleView(report)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px', textDecoration: 'underline', padding: 0 }}>
                                                                    <Eye size={13}/> Lihat PDF
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--border)' }}>Menunggu data</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal Reviu */}
            {showModal && selectedReport && (() => {
                const history = Array.isArray(selectedReport.revision_history) ? selectedReport.revision_history : [];
                const student = students.find(s => s.id === selectedReport.student_id);
                return (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', backgroundColor: 'white', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
                            <h2 style={{ marginBottom: '4px' }}>Reviu Laporan Bulanan</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.88rem' }}>
                                {student?.name} ({student?.nim}) · Bulan ke-{selectedReport.month_number}
                                {history.length > 0 && (
                                    <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.75rem', fontWeight: 700 }}>
                                        Sudah revisi {history.length}x
                                    </span>
                                )}
                            </p>

                            {/* Riwayat revisi (jika ada) */}
                            {history.length > 0 && (
                                <div style={{ marginBottom: '20px', backgroundColor: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px' }}>
                                    <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Clock size={13} /> Riwayat Catatan Revisi
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {[...history].reverse().map((h, i) => (
                                            <div key={i} style={{ padding: '10px 12px', backgroundColor: 'white', borderRadius: '6px', borderLeft: '3px solid #FECACA' }}>
                                                <p style={{ margin: '0 0 3px', fontSize: '0.72rem', color: '#DC2626', fontWeight: 700 }}>
                                                    Catatan Revisi ke-{h.round} · {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{h.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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

                                {statusVal === 'revision' && (
                                    <div style={{ padding: '10px 14px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '6px', fontSize: '0.82rem', color: '#92400E', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                                        Catatan yang Anda tulis di bawah akan terlihat oleh mahasiswa sebagai instruksi perbaikan.
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                        Catatan Pembimbing {statusVal === 'revision' ? <span style={{ color: '#EF4444' }}>(wajib diisi)</span> : '(Opsional)'}
                                    </label>
                                    <textarea
                                        className="input-field" rows="3"
                                        value={feedback} onChange={(e) => setFeedback(e.target.value)}
                                        placeholder={statusVal === 'revision' ? 'Jelaskan apa yang perlu diperbaiki mahasiswa...' : 'Tambahkan masukan atau arahan perbaikan file PDF...'}
                                        required={statusVal === 'revision'}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                    <button type="submit" className="btn-primary">Simpan Reviu</button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* PDF Viewer iframe */}
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
        </div>
    );
}
