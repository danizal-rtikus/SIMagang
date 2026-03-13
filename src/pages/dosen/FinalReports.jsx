import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, CheckCircle, Edit3, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DosenFinalReports() {
    const [reports, setReports] = useState([]);
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
                const studentIds = internships.map(i => i.student_id);
                const studentMap = {};
                internships.forEach(i => {
                    studentMap[i.student_id] = {
                        name: i.users_profile?.full_name || 'Tanpa Nama',
                        nim: i.users_profile?.identifier || 'N/A'
                    };
                });

                // 2. Ambil data laporan akhir dari mahasiswa ini
                if (studentIds.length > 0) {
                    const { data: reportData } = await supabase
                        .from('final_reports')
                        .select('*')
                        .in('student_id', studentIds);

                    if (reportData) {
                        // Masukkan nama & nim mahasiswa ke data laporan agar mudah
                        const mergedReports = reportData.map(r => ({
                            ...r,
                            student_name: studentMap[r.student_id]?.name,
                            student_nim: studentMap[r.student_id]?.nim
                        }));
                        setReports(mergedReports);
                    }
                }
            }
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
            .from('final_reports')
            .update({ status: statusVal, note_dosen: feedback })
            .eq('id', selectedReport.id);

        if (!error) {
            setShowModal(false);
            toast.success("Evaluasi Laporan Akhir berhasil disimpan!");
            fetchData();
        } else {
            toast.error("Gagal menyimpan reviu: " + error.message);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Pemeriksaan Laporan Akhir</h1>
                <p style={{ color: 'var(--text-muted)' }}>Mengevaluasi dokumen komprehensif dari kegiatan akhir magang.</p>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data laporan akhir...</div>
                ) : reports.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada laporan akhir yang diunggah oleh mahasiswa bimbingan Anda.</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', padding: '24px' }}>
                        {reports.map((report) => (
                            <div key={report.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', backgroundColor: '#F8FAFC' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>
                                            {report.student_name} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({report.student_nim})</span>
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Diunggah: {new Date(report.created_at).toLocaleDateString('id-ID')}
                                        </p>
                                    </div>
                                    <span className="badge" style={{
                                        backgroundColor: report.status === 'approved' ? '#D1FAE5' : report.status === 'revision' ? '#FEE2E2' : '#FEF3C7',
                                        color: report.status === 'approved' ? '#10B981' : report.status === 'revision' ? '#EF4444' : '#F59E0B'
                                    }}>
                                        {report.status}
                                    </span>
                                </div>

                                <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                                    <a href={report.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 500, fontSize: '0.95rem' }}>
                                        <FileText size={18} /> UNDUH PDF LAPORAN
                                    </a>
                                </div>

                                {report.note_dosen && (
                                    <div style={{ fontSize: '0.85rem', backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '4px', marginBottom: '16px', color: '#B91C1C' }}>
                                        <strong>Catatan:</strong> {report.note_dosen}
                                    </div>
                                )}

                                <button onClick={() => handleOpenReview(report)} className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                    <Edit3 size={16} /> Berikan Reviu / Evaluasi
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Reviu */}
            {showModal && selectedReport && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '8px' }}>Keputusan Laporan Akhir</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Mahasiswa: {selectedReport.student_name} ({selectedReport.student_nim})</p>

                        <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Status Laporan Akhir</label>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="radio" value="approved" checked={statusVal === 'approved'} onChange={(e) => setStatusVal(e.target.value)} />
                                        <CheckCircle size={18} color="#10B981" /> Lulus / Setujui
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="radio" value="revision" checked={statusVal === 'revision'} onChange={(e) => setStatusVal(e.target.value)} />
                                        <Edit3 size={18} color="#EF4444" /> Minta Revisi
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Catatan Evaluasi / Komentar (Opsional)</label>
                                <textarea
                                    className="input-field" rows="4"
                                    value={feedback} onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Tambahkan masukan komprehensif atau arahan revisi..."
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                <button type="submit" className="btn-primary">Simpan Keputusan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
