import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, User, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { convertToFinalScore, getGrade } from '../../lib/grading';

const SKALA = [
    { value: 1, label: 'SK', title: 'Sangat Kurang',  color: '#DC2626', bg: '#FEE2E2' },
    { value: 2, label: 'K',  title: 'Kurang',         color: '#D97706', bg: '#FEF3C7' },
    { value: 3, label: 'C',  title: 'Cukup',          color: '#2563EB', bg: '#DBEAFE' },
    { value: 4, label: 'B',  title: 'Baik',           color: '#059669', bg: '#D1FAE5' },
    { value: 5, label: 'BS', title: 'Baik Sekali',    color: '#7C3AED', bg: '#EDE9FE' },
];

export default function DosenInputNilai() {
    const context = useOutletContext();
    const userProfile = context?.userProfile || null;
    const [students, setStudents]   = useState([]);
    const [aspeks, setAspeks]       = useState([]);
    const [loading, setLoading]     = useState(true);
    const [scaleType, setScaleType] = useState('5'); // '5' or '8'

    const [selectedStudent, setSelectedStudent] = useState('');
    const [internshipId, setInternshipId]       = useState('');
    const [existingNilai, setExistingNilai]     = useState({});  // { butir_id: nilai }
    const [scores, setScores]                   = useState({});  // { butir_id: nilai }
    const [saving, setSaving]                   = useState(false);
    const [closingSession, setClosingSession]   = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const role = userProfile?.role || 'dosen';
        const filterCol = role === 'mitra' ? 'mitra_id' : 'dosen_id';

        const [{ data: intData }, { data: aspekData }] = await Promise.all([
            supabase.from('internships').select(`
                id, student_id, penilaian_status,
                student:users_profile!internships_student_id_fkey(full_name, identifier)
            `).eq(filterCol, user.id).eq('status', 'approved'),
            supabase.from('aspek_penilaian')
                .select('*, butir_penilaian(id, nomor, deskripsi, urutan)')
                .order('urutan'),
        ]);

        if (intData) setStudents(intData.map(i => ({ ...i, ...i.student })));
        if (aspekData) {
            setAspeks(aspekData.map(a => ({
                ...a,
                butir_penilaian: (a.butir_penilaian || []).sort((x,y) => x.urutan - y.urutan)
            })));
        }
        setLoading(false);
    };

    const handleSelectStudent = async (internship) => {
        setSelectedStudent(internship.id);
        setInternshipId(internship.id);
        const role = userProfile?.role || 'dosen';
        const evaluatorRole = role === 'mitra' ? 'mitra' : 'dosen';

        // Load existing nilai untuk evaluator ini
        const { data } = await supabase.from('penilaian_magang')
            .select('butir_id, nilai')
            .eq('internship_id', internship.id)
            .eq('evaluator_role', evaluatorRole);

        const map = {};
        if (data) data.forEach(n => { map[n.butir_id] = n.nilai; });
        setExistingNilai(map);
        setScores({ ...map });
    };

    const setScore = (butirId, val) => setScores(prev => ({ ...prev, [butirId]: val }));

    const totalButir = aspeks.reduce((s, a) => s + (a.butir_penilaian?.length || 0), 0);
    const rawSum     = Object.values(scores).reduce((s, v) => s + v, 0);
    const answeredCount = Object.keys(scores).length;
    const finalScore  = answeredCount === totalButir ? convertToFinalScore(rawSum, totalButir) : null;
    const gradeLabel  = finalScore !== null ? getGrade(finalScore, scaleType) : null;

    const handleSave = async () => {
        if (!internshipId) { toast.error('Pilih mahasiswa terlebih dahulu!'); return; }
        if (answeredCount < totalButir) {
            toast.error(`Masih ada ${totalButir - answeredCount} butir yang belum dinilai!`); return;
        }

        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const studentInternship = students.find(s => s.id === internshipId);
        const role = userProfile?.role || 'dosen';
        const evaluatorRole = role === 'mitra' ? 'mitra' : 'dosen';

        try {
            // Upsert semua nilai
            const upsertData = Object.entries(scores).map(([butir_id, nilai]) => ({
                internship_id:  internshipId,
                student_id:     studentInternship.student_id,
                dosen_id:       user.id,
                evaluator_role: evaluatorRole,
                butir_id,
                nilai,
                updated_at:     new Date().toISOString(),
            }));

            const { error } = await supabase.from('penilaian_magang').upsert(upsertData, { onConflict: 'internship_id,butir_id,evaluator_role' });
            if (error) throw error;

            setExistingNilai({ ...scores });
            toast.success(`Nilai berhasil disimpan! Skor akhir: ${finalScore}`);
        } catch (err) {
            toast.error('Gagal menyimpan nilai: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCloseSession = () => {
        setShowConfirmClose(true);
    };

    const executeCloseSession = async () => {
        setClosingSession(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const studentInternship = students.find(s => s.id === internshipId);

            const role = userProfile?.role || 'dosen';
            const evaluatorRole = role === 'mitra' ? 'mitra' : 'dosen';

            // 1. Simpan nilai terlebih dahulu agar up-to-date
            const upsertData = Object.entries(scores).map(([butir_id, nilai]) => ({
                internship_id:  internshipId,
                student_id:     studentInternship.student_id,
                dosen_id:       user.id,
                evaluator_role: evaluatorRole,
                butir_id,
                nilai,
                updated_at:     new Date().toISOString(),
            }));

            const { error: upsertError } = await supabase.from('penilaian_magang').upsert(upsertData, { onConflict: 'internship_id,butir_id,evaluator_role' });
            if (upsertError) throw upsertError;

            // 2. Update status penilaian di tabel internships
            const { error: updateError } = await supabase.from('internships')
                .update({ penilaian_status: 'closed' })
                .eq('id', internshipId);
            
            if (updateError) throw updateError;

            // 3. Update local state
            setStudents(prev => prev.map(s => s.id === internshipId ? { ...s, penilaian_status: 'closed' } : s));
            setExistingNilai({ ...scores });
            setShowConfirmClose(false);
            toast.success(`Sesi penilaian berhasil ditutup dan nilai dipublikasikan!`);
        } catch (err) {
            toast.error('Gagal menutup sesi: ' + err.message);
        } finally {
            setClosingSession(false);
        }
    };

    const selectedStudentData = students.find(s => s.id === selectedStudent);
    const isClosed = selectedStudentData?.penilaian_status === 'closed';

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Input Nilai Magang</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Berikan penilaian untuk setiap butir per mahasiswa bimbingan Anda.</p>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'flex-start' }}>

                    {/* Left: pilih mahasiswa */}
                    <div>
                        <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden', position: 'sticky', top: '80px' }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', backgroundColor: '#F8FAFC' }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>Mahasiswa Bimbingan</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{students.length} mahasiswa aktif</p>
                            </div>
                            {students.length === 0 ? (
                                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <AlertCircle size={28} style={{ margin: '0 auto 8px' }} strokeWidth={1.5} />
                                    Belum ada mahasiswa bimbingan aktif.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {students.map(st => {
                                        const isSelected = selectedStudent === st.id;
                                        return (
                                            <button key={st.id} onClick={() => handleSelectStudent(st)}
                                                style={{
                                                    padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                                    borderBottom: '1px solid var(--border)',
                                                    backgroundColor: isSelected ? 'var(--primary-light, #FFF0E6)' : 'white',
                                                    borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'white'; }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: isSelected ? 'var(--primary)' : '#1b1b1f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>
                                                        {st.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {st.full_name}
                                                        </p>
                                                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{st.identifier || 'N/A'}</p>
                                                    </div>
                                                     {st.penilaian_status === 'closed' ? (
                                                         <Lock size={13} color="#7C3AED" style={{ flexShrink: 0, marginLeft: 'auto' }} title="Sesi Penilaian Ditutup" />
                                                     ) : isSelected && Object.keys(existingNilai).length > 0 ? (
                                                         <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0, marginLeft: 'auto' }} />
                                                     ) : null}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: form penilaian */}
                    <div>
                        {!selectedStudent ? (
                            <div className="glass-panel" style={{ backgroundColor: 'white', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <User size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px' }} />
                                <p>Pilih mahasiswa dari panel kiri untuk mulai memberi nilai.</p>
                            </div>
                        ) : (
                            <>
                                {/* Score summary bar */}
                                <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{selectedStudentData?.full_name}</p>
                                        <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--text-muted)' }}>NIM: {selectedStudentData?.identifier}</p>
                                    </div>
                                     <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px 6px', borderRadius: '6px' }}>
                                             <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Skala:</span>
                                             <button type="button" onClick={() => setScaleType('5')} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: scaleType === '5' ? 'var(--primary)' : 'transparent', color: scaleType === '5' ? 'white' : 'var(--text-muted)' }}>5 S</button>
                                             <button type="button" onClick={() => setScaleType('8')} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: scaleType === '8' ? 'var(--primary)' : 'transparent', color: scaleType === '8' ? 'white' : 'var(--text-muted)' }}>8 S</button>
                                         </div>
                                         <div style={{ textAlign: 'center' }}>
                                             <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Diisi</p>
                                             <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: answeredCount === totalButir ? '#059669' : 'var(--primary)' }}>{answeredCount}/{totalButir}</p>
                                         </div>
                                         <div style={{ textAlign: 'center' }}>
                                             <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Skor Mentah</p>
                                             <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>{rawSum}</p>
                                         </div>
                                         <div style={{ textAlign: 'center' }}>
                                             <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Nilai Akhir</p>
                                             <p style={{ margin: 0, fontWeight: 700, fontSize: '1.3rem', color: gradeLabel?.color || 'var(--text-muted)' }}>
                                                 {finalScore ?? '—'}
                                             </p>
                                         </div>
                                         {gradeLabel && (
                                             <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', backgroundColor: gradeLabel.color + '20', color: gradeLabel.color }} title={gradeLabel.desc}>
                                                 {gradeLabel.label}
                                             </div>
                                         )}
                                     </div>
                                 </div>

                                {/* Aspek + Butir table */}
                                {aspeks.map((aspek) => {
                                    const aspekRaw  = (aspek.butir_penilaian || []).reduce((s, b) => s + (scores[b.id] || 0), 0);
                                    const aspekFilled = (aspek.butir_penilaian || []).filter(b => scores[b.id]).length;
                                    return (
                                        <div key={aspek.id} className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden', marginBottom: '10px' }}>
                                            {/* Aspek header */}
                                            <div style={{ padding: '11px 18px', backgroundColor: '#1b1b1f', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', padding: '2px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                        {aspek.nomor}
                                                    </span>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>{aspek.nama}</span>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                                                    {aspekFilled}/{aspek.butir_penilaian?.length} · Skor: {aspekRaw}
                                                </span>
                                            </div>

                                            {/* Butir rows */}
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                                                        <th style={{ padding: '8px 16px', width: '40px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'left' }}>No</th>
                                                        <th style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'left' }}>Unsur yang Dinilai</th>
                                                        {SKALA.map(s => (
                                                            <th key={s.value} style={{ padding: '8px', width: '50px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center' }} title={s.title}>{s.label}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(aspek.butir_penilaian || []).map((butir, bi) => {
                                                        const val = scores[butir.id];
                                                        return (
                                                            <tr key={butir.id} style={{ borderTop: '1px solid var(--border)' }}
                                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                                                <td style={{ padding: '12px 16px', fontSize: '0.83rem', color: 'var(--text-muted)', fontWeight: 600 }}>{bi + 1}</td>
                                                                <td style={{ padding: '12px 16px', fontSize: '0.87rem', color: 'var(--text-main)' }}>{butir.deskripsi}</td>
                                                                {SKALA.map(s => {
                                                                     const isSelected = val === s.value;
                                                                     return (
                                                                         <td key={s.value} style={{ padding: '10px 6px', textAlign: 'center' }}>
                                                                             <button
                                                                                 onClick={() => !isClosed && setScore(butir.id, s.value)}
                                                                                 disabled={isClosed}
                                                                                 title={isClosed ? `${s.value} – ${s.title} (Sesi Ditutup)` : `${s.value} – ${s.title}`}
                                                                                 style={{
                                                                                     width: '36px', height: '36px', borderRadius: '8px', border: '2px solid',
                                                                                     cursor: isClosed ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.1s',
                                                                                     borderColor: isSelected ? s.color : 'var(--border)',
                                                                                     backgroundColor: isSelected ? s.bg : 'white',
                                                                                     color: isSelected ? s.color : 'var(--text-muted)',
                                                                                     transform: isSelected && !isClosed ? 'scale(1.12)' : 'scale(1)',
                                                                                     boxShadow: isSelected && !isClosed ? `0 2px 8px ${s.color}40` : 'none',
                                                                                     opacity: isClosed && !isSelected ? 0.45 : 1
                                                                                 }}
                                                                             >
                                                                                 {s.label}
                                                                             </button>
                                                                         </td>
                                                                     );
                                                                 })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}

                                 {/* Save / Close Session button */}
                                 <div style={{ position: 'sticky', bottom: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', backgroundColor: 'rgba(255,255,255,0.95)', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border)', backdropFilter: 'blur(4px)', zIndex: 10 }}>
                                     {isClosed ? (
                                         <div style={{ padding: '8px 16px', backgroundColor: '#EDE9FE', border: '1px solid #C084FC', borderRadius: '8px', fontSize: '0.88rem', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                                             <Lock size={16} /> Sesi Penilaian Ditutup. Nilai telah dipublikasikan ke Mahasiswa.
                                         </div>
                                     ) : (
                                         <>
                                             {answeredCount < totalButir && (
                                                 <div style={{ padding: '10px 16px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '0.83rem', color: '#D97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                     <AlertCircle size={14} /> {totalButir - answeredCount} butir belum dinilai
                                                 </div>
                                             )}
                                             <button onClick={handleSave} disabled={saving} className="btn-secondary"
                                                 style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.88rem', border: '1px solid var(--border)', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                                                 <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Sementara'}
                                             </button>
                                             {answeredCount === totalButir && (
                                                 <button onClick={handleCloseSession} disabled={saving || closingSession}
                                                     style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.88rem', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
                                                     <CheckCircle2 size={16} /> {closingSession ? 'Menutup Sesi...' : 'Tutup Sesi & Publish'}
                                                 </button>
                                             )}
                                         </>
                                     )}
                                 </div>

                                 {/* Confirm Close Session Modal */}
                                 {showConfirmClose && (
                                     <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                                         <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '10px', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
                                             <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                                 <Lock size={28} />
                                             </div>
                                             <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Tutup Sesi Penilaian?</p>
                                             <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '24px', lineHeight: 1.5 }}>
                                                 Anda akan menutup sesi penilaian untuk <strong>{selectedStudentData?.full_name}</strong>.<br />
                                                 <span style={{ color: '#EF4444', fontWeight: 600 }}>Setelah ditutup:</span><br />
                                                 1. Nilai akan langsung dipublikasikan ke mahasiswa.<br />
                                                 2. Anda tidak dapat mengubah penilaian ini lagi (terkunci).
                                             </p>
                                             <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                 <button onClick={() => setShowConfirmClose(false)} disabled={closingSession} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Batal</button>
                                                 <button onClick={executeCloseSession} disabled={closingSession} style={{ padding: '10px 22px', border: 'none', borderRadius: '6px', background: '#7C3AED', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                                                     {closingSession ? 'Memproses...' : 'Ya, Tutup Sesi'}
                                                 </button>
                                             </div>
                                         </div>
                                     </div>
                                 )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
