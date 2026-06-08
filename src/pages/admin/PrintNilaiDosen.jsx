import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';

function convertToFinalScore(rawSum, totalButir) {
    if (!totalButir) return 0;
    const minRaw = totalButir;      // all SK=1
    const maxRaw = totalButir * 5;  // all BS=5
    return Math.round(((rawSum - minRaw) / (maxRaw - minRaw)) * (100 - 45) + 45);
}

function getGradeLabel(score) {
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 55) return 'D';
    return 'E';
}

export default function AdminPrintNilaiDosen() {
    const { dosenId } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [dosenInfo, setDosenInfo] = useState(null);
    const [activePeriod, setActivePeriod] = useState(null);
    const [studentsReport, setStudentsReport] = useState([]);
    const [totalButir, setTotalButir] = useState(0);

    useEffect(() => {
        if (dosenId) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dosenId]);

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

            // 2. Fetch Active Period
            const { data: period } = await supabase
                .from('periode_akademik')
                .select('nama')
                .eq('status', 'active')
                .maybeSingle();
            
            setActivePeriod(period || { nama: '-' });

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
                    student:users_profile!internships_student_id_fkey(full_name, identifier),
                    partner:partners(name),
                    penilaian_magang(butir_id, nilai)
                `)
                .eq('dosen_id', dosenId)
                .in('status', ['approved', 'finished']);

            if (intErr) throw intErr;

            // Process scores
            const processed = (internships || []).map(item => {
                const grades = item.penilaian_magang || [];
                const answeredCount = grades.length;
                const rawSum = grades.reduce((sum, g) => sum + g.nilai, 0);
                const isComplete = answeredCount === butirCount && butirCount > 0;
                const finalScore = isComplete ? convertToFinalScore(rawSum, butirCount) : null;
                const grade = finalScore ? getGradeLabel(finalScore) : null;

                return {
                    id: item.id,
                    studentName: item.student?.full_name || 'Tanpa Nama',
                    studentNim: item.student?.identifier || 'N/A',
                    partnerName: item.partner?.name || 'Belum diplot',
                    penilaian_status: item.penilaian_status || 'open',
                    rawSum,
                    answeredCount,
                    isComplete,
                    finalScore,
                    grade
                };
            });

            // Sort students alphabetically
            processed.sort((a, b) => a.studentName.localeCompare(b.studentName));
            setStudentsReport(processed);

        } catch (err) {
            toast.error('Gagal mengambil data laporan: ' + err.message);
        } finally {
            setLoading(false);
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
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button onClick={() => navigate(-1)} className="btn-primary" style={{ backgroundColor: 'white', color: 'var(--text-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> Kembali
                </button>
                <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <Printer size={18} /> Cetak / Simpan PDF
                </button>
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
                                <th style={{ border: '1px solid black', padding: '10px 8px', width: '5%', textAlign: 'center', fontWeight: 'bold' }}>No</th>
                                <th style={{ border: '1px solid black', padding: '10px 8px', width: '15%', textAlign: 'center', fontWeight: 'bold' }}>NIM</th>
                                <th style={{ border: '1px solid black', padding: '10px 8px', width: '30%', textAlign: 'left', fontWeight: 'bold' }}>Nama Mahasiswa</th>
                                <th style={{ border: '1px solid black', padding: '10px 8px', width: '25%', textAlign: 'left', fontWeight: 'bold' }}>Mitra Industri / Perusahaan</th>
                                <th style={{ border: '1px solid black', padding: '10px 8px', width: '10%', textAlign: 'center', fontWeight: 'bold' }}>Skor Mentah</th>
                                <th style={{ border: '1px solid black', padding: '10px 8px', width: '10%', textAlign: 'center', fontWeight: 'bold' }}>Nilai Akhir</th>
                                <th style={{ border: '1px solid black', padding: '10px 8px', width: '5%', textAlign: 'center', fontWeight: 'bold' }}>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentsReport.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ border: '1px solid black', padding: '20px', textAlign: 'center', fontStyle: 'italic', color: '#64748B' }}>
                                        Belum ada mahasiswa bimbingan magang aktif.
                                    </td>
                                </tr>
                            ) : (
                                studentsReport.map((student, idx) => (
                                    <tr key={student.id}>
                                        <td style={{ border: '1px solid black', padding: '10px 8px', textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ border: '1px solid black', padding: '10px 8px', textAlign: 'center', fontFamily: 'monospace' }}>{student.studentNim}</td>
                                        <td style={{ border: '1px solid black', padding: '10px 8px', fontWeight: 500 }}>{student.studentName}</td>
                                        <td style={{ border: '1px solid black', padding: '10px 8px' }}>{student.partnerName}</td>
                                        <td style={{ border: '1px solid black', padding: '10px 8px', textAlign: 'center' }}>
                                            {student.answeredCount > 0 ? `${student.rawSum} / ${totalButir * 5}` : '—'}
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '10px 8px', textAlign: 'center', fontWeight: student.isComplete ? 'bold' : 'normal' }}>
                                            {student.isComplete ? student.finalScore : student.answeredCount > 0 ? `Belum Lengkap (${student.answeredCount}/${totalButir})` : 'Belum Dinilai'}
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                                            {student.grade || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Signatures */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 40px', fontSize: '0.92rem' }}>
                        <div style={{ textAlign: 'center', width: '220px' }}>
                            <p style={{ margin: '0 0 80px 0' }}>Mengetahui,<br />Ketua Panitia Magang</p>
                            <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>_________________________</p>
                            <p style={{ margin: 0 }}>NIDN. —</p>
                        </div>
                        <div style={{ textAlign: 'center', width: '250px' }}>
                            <p style={{ margin: '0 0 80px 0' }}>Purwokerto, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}<br />Dosen Pendamping,</p>
                            <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{dosenInfo?.full_name}</p>
                            <p style={{ margin: 0 }}>NIDN. {dosenInfo?.identifier || '—'}</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
