import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Plus, Check, MessageSquare } from 'lucide-react';

export default function Logbooks() {
    const { userProfile } = useOutletContext();
    const [logbooks, setLogbooks] = useState([]);
    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [activeLog, setActiveLog] = useState(null);

    const [formData, setFormData] = useState({ internship_id: '', date: '', activity: '' });
    const [noteData, setNoteData] = useState('');

    useEffect(() => {
        fetchData();
    }, [userProfile]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch Internships first to get active ones
        let intQuery = supabase.from('internships').select('id, company_name, student:student_id(full_name)');
        if (userProfile.role === 'mahasiswa') {
            intQuery = intQuery.eq('student_id', userProfile.id).in('status', ['approved', 'finished']);
        } else if (userProfile.role === 'dosen') {
            intQuery = intQuery.eq('dosen_id', userProfile.id);
        }

        const { data: intData } = await intQuery;
        if (intData) setInternships(intData);

        // Fetch Logbooks
        if (intData && intData.length > 0) {
            const internshipIds = intData.map(i => i.id);
            const { data: logData } = await supabase
                .from('logbooks')
                .select(`*, internship:internship_id(company_name, student:student_id(full_name))`)
                .in('internship_id', internshipIds)
                .order('date', { ascending: false });

            if (logData) setLogbooks(logData);
        }

        setLoading(false);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('logbooks').insert([{
            internship_id: formData.internship_id,
            date: formData.date,
            activity: formData.activity,
            status: 'submitted'
        }]);

        if (!error) {
            setShowModal(false);
            setFormData({ internship_id: '', date: '', activity: '' });
            fetchData();
        } else {
            toast.error('Gagal menambahkan logbook: ' + error.message);
        }
    };

    const handleSaveNote = async () => {
        const { error } = await supabase.from('logbooks').update({
            dosen_notes: noteData,
            status: 'revision'
        }).eq('id', activeLog.id);

        if (!error) {
            setShowNoteModal(false);
            fetchData();
        }
    };

    const handleApprove = async (id) => {
        const { error } = await supabase.from('logbooks').update({ status: 'approved' }).eq('id', id);
        if (!error) fetchData();
    };

    const getStatusBadge = (status) => {
        const specs = {
            draft: { color: '#64748B', bg: '#F1F5F9', label: 'Draft' },
            submitted: { color: '#F59E0B', bg: '#FEF3C7', label: 'Terkirim' },
            approved: { color: '#10B981', bg: '#D1FAE5', label: 'Disetujui' },
            revision: { color: '#EF4444', bg: '#FEE2E2', label: 'Revisi' }
        };
        const s = specs[status] || specs.draft;
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
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Logbook Harian</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Catatan kegiatan magang harian.</p>
                </div>

                {userProfile.role === 'mahasiswa' && internships.length > 0 && (
                    <button onClick={() => setShowModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Isi Logbook
                    </button>
                )}
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
                ) : logbooks.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada catatan logbook.</div>
                ) : (
                    <div style={{ display: 'grid', gap: '1px', backgroundColor: 'var(--border)' }}>
                        {logbooks.map((log) => (
                            <div key={log.id} style={{ padding: '24px', backgroundColor: 'white', display: 'flex', gap: '24px', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
                                            {new Date(log.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {userProfile.role !== 'mahasiswa' ? `${log.internship.student.full_name} - ` : ''}
                                            {log.internship.company_name}
                                        </p>
                                    </div>
                                    <div>{getStatusBadge(log.status)}</div>
                                </div>

                                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                                    {log.activity}
                                </div>

                                {log.dosen_notes && (
                                    <div style={{ backgroundColor: '#FEF2F2', padding: '12px 16px', borderLeft: '4px solid #EF4444', borderRadius: '4px', fontSize: '0.9rem' }}>
                                        <strong>Catatan Dosen:</strong> {log.dosen_notes}
                                    </div>
                                )}

                                {userProfile.role === 'dosen' && log.status !== 'approved' && (
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                                        <button
                                            onClick={() => { setActiveLog(log); setNoteData(log.dosen_notes || ''); setShowNoteModal(true); }}
                                            className="input-field" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', color: '#EF4444', backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
                                        >
                                            <MessageSquare size={16} /> Beri Revisi
                                        </button>
                                        <button
                                            onClick={() => handleApprove(log.id)}
                                            className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#10B981' }}
                                        >
                                            <Check size={16} /> Setujui
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Tambah Logbook */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Isi Logbook Hari Ini</h2>
                        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Pilih Magang</label>
                                    <select required className="input-field" value={formData.internship_id} onChange={(e) => setFormData({ ...formData, internship_id: e.target.value })}>
                                        <option value="">-- Pilih --</option>
                                        {internships.map(i => <option key={i.id} value={i.id}>{i.company_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tanggal Kegiatan</label>
                                    <input type="date" required className="input-field" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Aktivitas yang dilakukan</label>
                                <textarea
                                    required className="input-field" rows="5"
                                    value={formData.activity} onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                                    placeholder="Ceritakan aktivitas magang Anda hari ini..."
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                                <button type="submit" className="btn-primary">Simpan Laporan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Catatan Revisi */}
            {showNoteModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Beri Catatan Revisi</h2>
                        <textarea
                            className="input-field" rows="4"
                            value={noteData} onChange={(e) => setNoteData(e.target.value)}
                            placeholder="Tuliskan catatan perbaikan untuk logbook ini..."
                        ></textarea>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowNoteModal(false)} className="input-field" style={{ width: 'auto', backgroundColor: '#f1f5f9' }}>Batal</button>
                            <button onClick={handleSaveNote} className="btn-primary" style={{ backgroundColor: '#EF4444' }}>Kirim Revisi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
