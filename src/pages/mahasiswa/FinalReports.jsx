import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { UploadCloud, CheckCircle, Clock, AlertTriangle, FileText, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function FinalReports() {
    const { userProfile } = useOutletContext();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [file, setFile] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [userProfile]);

    const fetchReport = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('final_reports')
            .select('*')
            .eq('student_id', userProfile.id)
            .single();

        if (!error && data) setReport(data);
        setLoading(false);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploadLoading(true);

        try {
            // 1. Upload ke Storage
            const fileName = `final/${userProfile.id}/laporan_akhir_${Date.now()}.pdf`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('simagang-files')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            // 2. Dapatkan public URL
            const { data: urlData } = supabase.storage.from('simagang-files').getPublicUrl(fileName);

            // 3. Simpan di tabel
            if (report) {
                const { error: updateError } = await supabase.from('final_reports')
                    .update({ file_url: urlData.publicUrl, status: 'submitted' })
                    .eq('id', report.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('final_reports').insert([{
                    student_id: userProfile.id,
                    file_url: urlData.publicUrl,
                    status: 'submitted'
                }]);
                if (insertError) throw insertError;
            }

            setShowModal(false);
            setFile(null);
            toast.success(report ? "Laporan Akhir berhasil diperbarui!" : "Laporan Akhir berhasil diunggah!");
            fetchReport();

        } catch (err) {
            toast.error("Gagal mengunggah laporan akhir: " + err.message);
        } finally {
            setUploadLoading(false);
        }
    };

    const handleDeleteReport = (id) => {
        setDeleteConfirm(id);
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const { error } = await supabase.from('final_reports').delete().eq('id', deleteConfirm);
        if (!error) {
            toast.success('Laporan Akhir berhasil dihapus!');
            setReport(null);
        } else {
            toast.error('Gagal menghapus laporan: ' + error.message);
        }
        setDeleteConfirm(null);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Laporan Akhir</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Dokumen evaluasi dan laporan komprehensif akhir magang.</p>
                </div>

                {!report && (
                    <button onClick={() => setShowModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UploadCloud size={18} /> Unggah Laporan
                    </button>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '32px', backgroundColor: 'white', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Memuat data...</p>
                ) : report ? (
                    <>
                        <div style={{ marginBottom: '24px' }}>
                            {report.status === 'approved' ? <CheckCircle size={64} color="#10B981" style={{ margin: '0 auto' }} /> :
                                report.status === 'revision' ? <AlertTriangle size={64} color="#EF4444" style={{ margin: '0 auto' }} /> :
                                    <Clock size={64} color="#F59E0B" style={{ margin: '0 auto' }} />}
                        </div>

                        <h2 style={{ marginBottom: '8px' }}>
                            Status: {report.status === 'approved' ? 'Disetujui' : report.status === 'revision' ? 'Revisi Diperlukan' : 'Menunggu Pengecekan'}
                        </h2>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                            <a href={report.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, padding: '12px 24px', borderRadius: '24px', backgroundColor: 'rgba(79, 70, 229, 0.1)' }}>
                                <FileText size={20} /> Buka PDF Laporan Akhir
                            </a>

                            {report.status !== 'approved' && (
                                <>
                                    <button onClick={() => { setFile(null); setShowModal(true); }} className="input-field" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3B82F6', borderColor: '#DBEAFE', backgroundColor: '#EFF6FF', padding: '12px 24px', borderRadius: '24px' }}>
                                        <Edit3 size={20} /> Re-upload
                                    </button>
                                    <button onClick={() => handleDeleteReport(report.id)} className="input-field" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#EF4444', borderColor: '#FEE2E2', backgroundColor: '#FEF2F2', padding: '12px 24px', borderRadius: '24px' }}>
                                        <Trash2 size={20} /> Hapus Laporan
                                    </button>
                                </>
                            )}
                        </div>

                        {report.note_dosen && (
                            <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#FEF2F2', borderLeft: '4px solid #EF4444', borderRadius: '8px', textAlign: 'left' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#B91C1C' }}>Catatan dari Dosen:</h4>
                                <p style={{ margin: 0, fontSize: '0.95rem' }}>{report.note_dosen}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ padding: '40px 0' }}>
                        <FileText size={48} color="var(--border)" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ marginBottom: '8px' }}>Laporan Belum Diunggah</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Anda belum mengumpulkan laporan akhir magang. Klik tombol di kanan atas untuk mengunggah PDF.</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Unggah Laporan Akhir</h2>
                        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>File Dokumen (PDF)</label>
                                <input
                                    type="file" accept=".pdf" required
                                    className="input-field"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    style={{ padding: '8px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }} disabled={uploadLoading}>Batal</button>
                                <button type="submit" className="btn-primary" disabled={uploadLoading}>
                                    {uploadLoading ? 'Mengunggah...' : 'Kirim Laporan Akhir'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px 0', fontWeight: 500, fontSize: '1.05rem', color: '#1e293b' }}>
                            Yakin ingin menghapus laporan akhir magang ini?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Batal
                            </button>
                            <button onClick={executeDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
