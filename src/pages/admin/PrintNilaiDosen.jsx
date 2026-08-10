import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { convertToFinalScore, getGrade } from '../../lib/grading';

export default function AdminPrintNilaiDosen() {
    const { dosenId } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [dosenInfo, setDosenInfo] = useState(null);
    const [activePeriod, setActivePeriod] = useState(null);
    const [studentsReport, setStudentsReport] = useState([]);
    const [totalButir, setTotalButir] = useState(0);
    const [scaleType, setScaleType] = useState('5');

    const [kaprodiInfo, setKaprodiInfo] = useState({ prodi_name: 'Sistem Informasi', kaprodi_name: '', kaprodi_nidn: '' });

    useEffect(() => {
        if (dosenId) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dosenId, scaleType]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Dosen Profile
            const { data: dosen, error: dosenErr } = await supabase
                .from('users_profile')
                .select('*')
                .eq('id', dosenId)
                .single();

            if (dosenErr) throw dosenErr;
            setDosenInfo(dosen);

            // Fetch Kaprodi Info (default Sistem Informasi)
            const { data: kapData } = await supabase
                .from('prodi_settings')
                .select('*')
                .eq('prodi_name', 'Sistem Informasi')
                .maybeSingle();

            if (kapData) setKaprodiInfo(kapData);

            // 2. Fetch Active Period
            const { data: period } = await supabase
                .from('periode_akademik')
                .select('*')
                .eq('status', 'active')
                .maybeSingle();
            
            setActivePeriod(period || { nama: '-' });
            if (period?.skala_penilaian) setScaleType(period.skala_penilaian);

            // 3. Fetch Aspek & Butir Penilaian to get total count
            const { data: aspekData } = await supabase
                .from('aspek_penilaian')
                .select('*, butir_penilaian(id)')
                .order('urutan');
            
            const butirCount = aspekData ? aspekData.reduce((s, a) => s + (a.butir_penilaian?.length || 0), 0) : 0;
            setTotalButir(butirCount);

            // 4. Fetch Students and their grades
            const { data: internships, error: intErr } = await supabase
                .from('internships')
                .select(`
                    id,
                    penilaian_status,
                    student:users_profile!internships_student_id_fkey(full_name, identifier, prodi),
                    partner:partners(name),
                    penilaian_magang(butir_id, nilai, evaluator_role)
                `)
                .eq('dosen_id', dosenId)
                .in('status', ['approved', 'finished']);

            if (intErr) throw intErr;

            // Process scores
            const processed = (internships || []).map(item => {
                const grades = item.penilaian_magang || [];
                const dosenGrades = grades.filter(g => g.evaluator_role !== 'mitra');
                const mitraGrades = grades.filter(g => g.evaluator_role === 'mitra');

                const rawDosen = dosenGrades.reduce((sum, g) => sum + g.nilai, 0);
                const rawMitra = mitraGrades.reduce((sum, g) => sum + g.nilai, 0);

                const scoreDosen = dosenGrades.length === butirCount && butirCount > 0 ? convertToFinalScore(rawDosen, butirCount) : null;
                const scoreMitra = mitraGrades.length === butirCount && butirCount > 0 ? convertToFinalScore(rawMitra, butirCount) : null;

                let finalScore = null;
                if (scoreMitra !== null && scoreDosen !== null) {
                    finalScore = Math.round((scoreMitra * 0.60) + (scoreDosen * 0.40));
                } else if (scoreDosen !== null) {
                    finalScore = scoreDosen;
                } else if (scoreMitra !== null) {
                    finalScore = scoreMitra;
                }

                const gradeObj = finalScore !== null ? getGrade(finalScore, scaleType) : null;

                return {
                    id: item.id,
                    studentName: item.student?.full_name || 'Tanpa Nama',
                    studentNim: item.student?.identifier || 'N/A',
                    studentProdi: item.student?.prodi || 'Sistem Informasi',
                    partnerName: item.partner?.name || 'Belum diplot',
                    penilaian_status: item.penilaian_status || 'open',
                    scoreDosen,
                    scoreMitra,
                    finalScore,
                    grade: gradeObj?.label || '—'
                };
            });

            // Sort students alphabetically
            processed.sort((a, b) => a.studentName.localeCompare(b.studentName));
            setStudentsReport(processed);

            // If there is student prodi info, fetch kaprodi for that prodi
            if (processed.length > 0 && processed[0].studentProdi) {
                const { data: studentKap } = await supabase
                    .from('prodi_settings')
                    .select('*')
                    .eq('prodi_name', processed[0].studentProdi)
                    .maybeSingle();
                if (studentKap) setKaprodiInfo(studentKap);
            }

        } catch (err) {
            toast.error('Gagal mengambil data laporan: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate('/admin/sesi-penilaian');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Mempersiapkan dokumen...</div>;
    }

    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px' }}>
            {/* Control Bar (Hidden on Print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button onClick={handleBack} className="btn-primary" style={{ backgroundColor: 'white', color: 'var(--text-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> Kembali
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#E2E8F0', padding: '4px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0 6px' }}>Skala Grading:</span>
                        <button onClick={() => setScaleType('5')} style={{ padding: '4px 10px', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: scaleType === '5' ? 'var(--primary)' : 'transparent', color: scaleType === '5' ? 'white' : 'var(--text-muted)' }}>5 Skala</button>
                        <button onClick={() => setScaleType('8')} style={{ padding: '4px 10px', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: scaleType === '8' ? 'var(--primary)' : 'transparent', color: scaleType === '8' ? 'white' : 'var(--text-muted)' }}>8 Skala</button>
                    </div>

                    <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Printer size={18} /> Cetak / Simpan PDF
                    </button>
                </div>
            </div>

            {/* Print Container */}
            <div className="print-container" style={{ width: '100%', maxWidth: '210mm', margin: '0 auto', backgroundColor: 'white', color: 'black' }}>
                <div style={{ paddingBottom: '20px', minHeight: '297mm', position: 'relative', boxSizing: 'border-box' }}>
                    
                    {/* Kop Surat (Header) */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '3px solid black', paddingBottom: '16px', marginBottom: '24px' }}>
                        <img 
                            src="https://i.ibb.co.com/kgV7WDhF/Logo-SYS.png" 
                            alt="Logo Institusi" 
                            style={{ width: '100px', height: '100px', objectFit: 'contain' }} 
                        />
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 'bold' }}>SEKOLAH TINGGI ILMU KOMPUTER</h2>
                            <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 'bold', letterSpacing: '2px' }}>YOS SUDARSO PURWOKERTO</h1>
                            <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>Jl. Smp 5 KarangKlesem, Purwokerto Selatan, Banyumas, Jawa Tengah 53144</p>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Telp: (0281) 621183 | Email: humas@stikomyos.ac.id</p>
                        </div>
                    </div>

                    {/* Judul Laporan */}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.25rem', textDecoration: 'underline', fontWeight: 'bold', margin: '0 0 16px 0' }}>LAPORAN REKAPITULASI PENILAIAN MAHASISWA MAGANG</h3>
                        
                        {/* Lecturer Metadata */}
                        <table style={{ margin: '0 auto', textAlign: 'left', fontSize: '0.92rem', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '4px 16px 4px 0', fontWeight: 600 }}>Dosen Pendamping</td>
                                    <td style={{ padding: '4px 8px' }}>:</td>
                                    <td style={{ padding: '4px 0', textTransform: 'capitalize' }}>{dosenInfo?.full_name || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '4px 16px 4px 0', fontWeight: 600 }}>NIDN / NUPTK</td>
                                    <td style={{ padding: '4px 8px' }}>:</td>
                                    <td style={{ padding: '4px 0' }}>{dosenInfo?.identifier || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '4px 16px 4px 0', fontWeight: 600 }}>Periode Akademik</td>
                                    <td style={{ padding: '4px 8px' }}>:</td>
                                    <td style={{ padding: '4px 0' }}>{activePeriod?.nama || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Students Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', fontSize: '0.88rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F1F5F9' }}>
                                <th style={{ border: '1px solid black', padding: '8px 6px', width: '5%', textAlign: 'center', fontWeight: 'bold' }}>No</th>
                                <th style={{ border: '1px solid black', padding: '8px 6px', width: '13%', textAlign: 'center', fontWeight: 'bold' }}>NIM</th>
                                <th style={{ border: '1px solid black', padding: '8px 6px', width: '27%', textAlign: 'left', fontWeight: 'bold' }}>Nama Mahasiswa</th>
                                <th style={{ border: '1px solid black', padding: '8px 6px', width: '22%', textAlign: 'left', fontWeight: 'bold' }}>Mitra Industri</th>
                                <th style={{ border: '1px solid black', padding: '8px 6px', width: '11%', textAlign: 'center', fontWeight: 'bold' }}>Mitra (60%)</th>
                                <th style={{ border: '1px solid black', padding: '8px 6px', width: '11%', textAlign: 'center', fontWeight: 'bold' }}>Dosen (40%)</th>
                                <th style={{ border: '1px solid black', padding: '8px 6px', width: '11%', textAlign: 'center', fontWeight: 'bold' }}>Nilai Akhir</th>
                                <th style={{ border: '1px solid black', padding: '8px 6px', width: '8%', textAlign: 'center', fontWeight: 'bold' }}>Grade ({scaleType} S)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentsReport.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ border: '1px solid black', padding: '20px', textAlign: 'center', fontStyle: 'italic', color: '#64748B' }}>
                                        Belum ada mahasiswa bimbingan magang aktif.
                                    </td>
                                </tr>
                            ) : (
                                studentsReport.map((student, idx) => (
                                    <tr key={student.id}>
                                        <td style={{ border: '1px solid black', padding: '8px 6px', textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ border: '1px solid black', padding: '8px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{student.studentNim}</td>
                                        <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 500 }}>{student.studentName}</td>
                                        <td style={{ border: '1px solid black', padding: '8px 6px' }}>{student.partnerName}</td>
                                        <td style={{ border: '1px solid black', padding: '8px 6px', textAlign: 'center' }}>{student.scoreMitra !== null ? student.scoreMitra : '—'}</td>
                                        <td style={{ border: '1px solid black', padding: '8px 6px', textAlign: 'center' }}>{student.scoreDosen !== null ? student.scoreDosen : '—'}</td>
                                        <td style={{ border: '1px solid black', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                                            {student.finalScore !== null ? student.finalScore : 'Belum Lengkap'}
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                                            {student.grade}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Signatures */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 40px', fontSize: '0.92rem' }}>
                        <div style={{ textAlign: 'center', width: '250px' }}>
                            <p style={{ margin: '0 0 60px 0', lineHeight: 1.4 }}>
                                Mengetahui,<br />
                                Ketua Program Studi {kaprodiInfo?.prodi_name || 'Sistem Informasi'}
                            </p>
                            <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
                                {kaprodiInfo?.kaprodi_name || '_________________________'}
                            </p>
                            <p style={{ margin: 0 }}>NIDN. {kaprodiInfo?.kaprodi_nidn || '—'}</p>
                        </div>
                        <div style={{ textAlign: 'center', width: '250px' }}>
                            <p style={{ margin: '0 0 60px 0', lineHeight: 1.4 }}>
                                Purwokerto, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}<br />
                                Dosen Pendamping,
                            </p>
                            <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{dosenInfo?.full_name || '_________________________'}</p>
                            <p style={{ margin: 0 }}>NIDN. {dosenInfo?.identifier || '—'}</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
