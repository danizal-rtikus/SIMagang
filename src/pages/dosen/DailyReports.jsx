import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, CheckCircle, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DosenDailyReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [statusVal, setStatusVal] = useState('approved');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        // Join dengan users_profile untuk dapatkan nama dan nim mahasiswa
        const { data, error } = await supabase
            .from('daily_reports')
            .select('*, users_profile(full_name, identifier)')
            .order('date', { ascending: false });

        if (!error && data) setReports(data);
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
            .from('daily_reports')
            .update({ status: statusVal, note_dosen: feedback })
            .eq('id', selectedReport.id);

        if (!error) {
            setShowModal(false);
            toast.success("Reviu harian berhasil disimpan!");
            fetchReports();
        } else {
            toast.error("Gagal menyimpan reviu: " + error.message);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Logbook Harian Mahasiswa</h1>
                <p style={{ color: 'var(--text-muted)' }}>Periksa dan berikan catatan terkait aktivitas harian mahasiswa bimbingan Anda.</p>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat logbook...</div>
                ) : reports.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada logbook yang dikirimkan.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Tanggal</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Mahasiswa</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Aktivitas Singkat</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report) => (
                                    <tr key={report.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px' }}>{new Date(report.date).toLocaleDateString('id-ID')}</td>
                                        <td style={{ padding: '16px', fontWeight: 500 }}>
                                            {report.users_profile?.full_name || 'Tanpa Nama'} <br/>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{report.users_profile?.identifier || 'N/A'}</span>
                                        </td>
                                        <td style={{ padding: '16px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {report.activity}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span className="badge" style={{
                                                backgroundColor: report.status === 'approved' ? '#D1FAE5' : report.status === 'revision' ? '#FEE2E2' : '#FEF3C7',
                                                color: report.status === 'approved' ? '#10B981' : report.status === 'revision' ? '#EF4444' : '#F59E0B'
                                            }}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <button onClick={() => handleOpenReview(report)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                                Reviu
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && selectedReport && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '8px' }}>Reviu Logbook</h2>
                        <p style={{ color: 'var(--primary)', fontWeight: 500, marginBottom: '24px' }}>
                            {selectedReport.users_profile?.full_name} ({selectedReport.users_profile?.identifier || 'N/A'}) <br/>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{new Date(selectedReport.date).toLocaleDateString('id-ID')}</span>
                        </p>

                        <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', fontSize: '0.95rem', whiteSpace: 'pre-wrap', marginBottom: '24px', border: '1px solid var(--border)' }}>
                            {selectedReport.activity}
                        </div>

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
                                    placeholder="Tambahkan masukan atau arahan untuk mahasiswa..."
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
