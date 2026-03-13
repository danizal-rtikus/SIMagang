import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Check, MessageSquare, Trash2, Edit3, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DailyReports() {
    const { userProfile } = useOutletContext();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ id: null, date: new Date().toISOString().split('T')[0], activity: '' });
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

    const handleEditReport = (report) => {
        setFormData({ id: report.id, date: report.date, activity: report.activity });
        setShowModal(true);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        let dbError;

        if (formData.id) {
            const { error } = await supabase.from('daily_reports')
                .update({ date: formData.date, activity: formData.activity, status: 'submitted' })
                .eq('id', formData.id);
            dbError = error;
        } else {
            const { error } = await supabase.from('daily_reports').insert([{
                student_id: userProfile.id,
                date: formData.date,
                activity: formData.activity,
                status: 'submitted'
            }]);
            dbError = error;
        }

        if (!dbError) {
            setShowModal(false);
            setFormData({ id: null, date: new Date().toISOString().split('T')[0], activity: '' });
            toast.success(formData.id ? 'Laporan harian berhasil dimodifikasi!' : 'Laporan harian berhasil dikirim!');
            fetchReports();
        } else {
            toast.error('Gagal memproses laporan: ' + dbError.message);
        }
    };

    const handleDeleteReport = (id) => {
        setDeleteConfirm(id);
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
            submitted: { color: '#F59E0B', bg: '#FEF3C7', label: 'Terkirim' },
            approved: { color: '#10B981', bg: '#D1FAE5', label: 'Disetujui' },
            revision: { color: '#EF4444', bg: '#FEE2E2', label: 'Revisi' }
        };
        const s = specs[status] || specs.submitted;
        return (
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: s.color, backgroundColor: s.bg }}>
                {s.label}
            </span>
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Laporan Harian</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Catatan jurnal kegiatan magang per hari.</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link to="/mahasiswa/daily-reports/print" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F8FAFC', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                        <Printer size={18} /> Cetak PDF
                    </Link>
                    <button onClick={() => { setFormData({ id: null, date: new Date().toISOString().split('T')[0], activity: '' }); setShowModal(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Tambah Kegiatan
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat laporan...</div>
                ) : reports.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada laporan harian.</div>
                ) : (
                    <div className="table-responsive-wrapper">
                        <div style={{ display: 'grid', gap: '1px', backgroundColor: 'var(--border)', minWidth: '600px' }}>
                            {reports.map((report) => (
                                <div key={report.id} style={{ padding: '24px', backgroundColor: 'white', display: 'flex', gap: '16px', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                                            {new Date(report.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div>{getStatusBadge(report.status)}</div>
                                            {report.status !== 'approved' && (
                                                <>
                                                    <button onClick={() => handleEditReport(report)} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Edit Laporan">
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteReport(report.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Hapus Laporan">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                                        {report.activity}
                                    </div>

                                    {report.note_dosen && (
                                        <div style={{ backgroundColor: '#FEF2F2', padding: '12px 16px', borderLeft: '4px solid #EF4444', borderRadius: '4px', fontSize: '0.9rem' }}>
                                            <strong><MessageSquare size={14} /> Catatan Pembimbing:</strong> {report.note_dosen}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>{formData.id ? 'Edit Jurnal Harian' : 'Isi Jurnal Hari Ini'}</h2>
                        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tanggal Kegiatan</label>
                                <input type="date" required className="input-field" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Aktivitas yang dilakukan</label>
                                <textarea
                                    required className="input-field" rows="5"
                                    value={formData.activity} onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                                    placeholder="Deskripsikan aktivitas magang Anda pada tanggal tersebut..."
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                <button type="submit" className="btn-primary">{formData.id ? 'Simpan Perubahan' : 'Kirim Laporan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px 0', fontWeight: 500, fontSize: '1.05rem', color: '#1e293b' }}>
                            Yakin ingin menghapus laporan harian ini?
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
