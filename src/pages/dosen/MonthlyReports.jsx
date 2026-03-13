import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, CheckCircle, Edit3, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DosenMonthlyReports() {
    const [students, setStudents] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [statusVal, setStatusVal] = useState('approved');

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data progres...</div>
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
                                                        color: iconColor, fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '16px',
                                                        boxShadow: isSubmitted ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        {isApproved ? <CheckCircle size={24} /> : month}
                                                    </div>

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
                                                                
                                                                <a href={report.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px', textDecoration: 'underline' }}>
                                                                    Buka PDF
                                                                </a>
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
            {showModal && selectedReport && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '8px' }}>Reviu Laporan Bulanan</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Mahasiswa: {students.find(s => s.id === selectedReport.student_id)?.name} (Bulan ke-{selectedReport.month_number})</p>

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
                                    placeholder="Tambahkan masukan atau arahan perbaikan file PDF..."
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                <button type="submit" className="btn-primary">Simpan Reviu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
