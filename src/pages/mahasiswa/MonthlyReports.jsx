import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { UploadCloud, CheckCircle, Clock, AlertTriangle, FileText, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MonthlyReports() {
    const { userProfile } = useOutletContext();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ id: null, month_number: 1 });
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [file, setFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    useEffect(() => {
        fetchReports();
    }, [userProfile]);

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

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploadLoading(true);

        try {
            // 1. Upload ke Storage
            const fileName = `monthly/${userProfile.id}/bulan_${formData.month_number}_${Date.now()}.pdf`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('simagang-files')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            // 2. Dapatkan public URL
            const { data: urlData } = supabase.storage.from('simagang-files').getPublicUrl(fileName);

            // 3. Simpan di tabel atau update jika id ada
            if (formData.id) {
                const { error: updateError } = await supabase.from('monthly_reports')
                    .update({ file_url: urlData.publicUrl, status: 'submitted' })
                    .eq('id', formData.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('monthly_reports').insert([{
                    student_id: userProfile.id,
                    month_number: parseInt(formData.month_number),
                    file_url: urlData.publicUrl,
                    status: 'submitted'
                }]);
                if (insertError) throw insertError;
            }

            setShowModal(false);
            setFile(null);
            fetchReports();
            toast.success(formData.id ? "Laporan berhasil diperbarui!" : "Laporan berhasil diunggah!");

        } catch (err) {
            toast.error("Gagal mengunggah laporan: " + err.message);
        } finally {
            setUploadLoading(false);
        }
    };

    const handleDeleteReport = (id, month) => {
        setDeleteConfirm({ id, month });
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const { error } = await supabase.from('monthly_reports').delete().eq('id', deleteConfirm.id);
        if (!error) {
            toast.success('Laporan bulanan berhasil dihapus!');
            fetchReports();
        } else {
            toast.error('Gagal menghapus laporan: ' + error.message);
        }
        setDeleteConfirm(null);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Laporan Bulanan</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Progres dokumen laporan dari bulan 1 sampai 6.</p>
                </div>

                {availableMonths.length > 0 && (
                    <button onClick={() => { setFormData({ id: null, month_number: availableMonths[0] }); setFile(null); setShowModal(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UploadCloud size={18} /> Unggah Laporan
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {[1, 2, 3, 4, 5, 6].map((month) => {
                    const report = reports.find(r => r.month_number === month);
                    return (
                        <div key={month} className="glass-panel" style={{ padding: '24px', backgroundColor: report ? 'white' : '#F8FAFC', opacity: report ? 1 : 0.6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Bulan ke-{month}</h3>
                                {report ? (
                                    report.status === 'approved' ? <CheckCircle size={24} color="#10B981" /> :
                                        report.status === 'revision' ? <AlertTriangle size={24} color="#EF4444" /> :
                                            <Clock size={24} color="#F59E0B" />
                                ) : (
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--border)' }}></div>
                                )}
                            </div>

                            {report ? (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <a href={report.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 500, border: '1px solid currentColor', padding: '6px 12px', borderRadius: '16px', fontSize: '0.85rem' }}>
                                            <FileText size={14} /> Lihat PDF
                                        </a>
                                        {report.status !== 'approved' && (
                                            <>
                                                <button onClick={() => { setFormData({ id: report.id, month_number: report.month_number }); setFile(null); setShowModal(true); }} style={{ background: 'none', border: '1px solid #DBEAFE', backgroundColor: '#EFF6FF', color: '#3B82F6', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} title="Re-upload PDF">
                                                    <Edit3 size={14} /> Edit
                                                </button>
                                                <button onClick={() => handleDeleteReport(report.id, report.month_number)} style={{ background: 'none', border: '1px solid #FEE2E2', backgroundColor: '#FEF2F2', color: '#EF4444', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} title="Hapus Laporan Bulan Ini">
                                                    <Trash2 size={14} /> Hapus
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {report.note_dosen && (
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#EF4444', backgroundColor: '#FEF2F2', padding: '8px', borderRadius: '4px' }}>
                                            Catatan: {report.note_dosen}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>Belum disubmit.</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Unggah Laporan Bulanan</h2>
                        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Pilih Periode Laporan</label>
                                <select
                                    className="input-field"
                                    value={formData.month_number}
                                    onChange={(e) => setFormData({ ...formData, month_number: e.target.value })}
                                    disabled={!!formData.id}
                                >
                                    {formData.id ? (
                                        <option value={formData.month_number}>Laporan Bulan ke-{formData.month_number}</option>
                                    ) : (
                                        availableMonths.map(m => <option key={m} value={m}>Laporan Bulan ke-{m}</option>)
                                    )}
                                </select>
                            </div>
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
                                    {uploadLoading ? 'Mengunggah...' : 'Simpan Laporan'}
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
                            Yakin ingin menghapus laporan bulan ke-{deleteConfirm.month}?
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
