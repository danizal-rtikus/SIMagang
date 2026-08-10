import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Printer } from 'lucide-react';

export default function PrintDailyReports() {
    const context = useOutletContext();
    const userProfile = context?.userProfile || null;
    const { studentId } = useParams();
    const navigate = useNavigate();

    const targetStudentId = studentId || userProfile?.id;
    const [reports, setReports] = useState([]);
    const [studentProfile, setStudentProfile] = useState({ full_name: '-', identifier: '-', prodi: 'Sistem Informasi' });
    const [internshipInfo, setInternshipInfo] = useState({ partnerName: '-', dosenName: '-' });
    const [kaprodiInfo, setKaprodiInfo] = useState({ kaprodi_name: '', kaprodi_nidn: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (targetStudentId) {
            fetchData();
        }
    }, [targetStudentId, userProfile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Student Profile
            let currentStudent = null;
            if (studentId) {
                const { data: stData } = await supabase
                    .from('users_profile')
                    .select('full_name, identifier, prodi')
                    .eq('id', studentId)
                    .single();
                if (stData) {
                    currentStudent = stData;
                    setStudentProfile(stData);
                }
            } else if (userProfile) {
                currentStudent = userProfile;
                setStudentProfile({
                    full_name: userProfile.full_name || '-',
                    identifier: userProfile.identifier || '-',
                    prodi: userProfile.prodi || 'Sistem Informasi'
                });
            }

            const activeProdi = currentStudent?.prodi || 'Sistem Informasi';

            // 2. Fetch Kaprodi Info for this Prodi
            const { data: kapData } = await supabase
                .from('prodi_settings')
                .select('*')
                .eq('prodi_name', activeProdi)
                .maybeSingle();

            if (kapData) {
                setKaprodiInfo(kapData);
            }

            // 3. Fetch Daily Reports (Ordered by date ASC)
            const { data: reportsData } = await supabase
                .from('daily_reports')
                .select('*')
                .eq('student_id', targetStudentId)
                .order('date', { ascending: true });

            // 4. Fetch Internship details (Dosen & Partner)
            const { data: internshipData } = await supabase
                .from('internships')
                .select(`
                    dosen:users_profile!internships_dosen_id_fkey(full_name),
                    partner:partners(name)
                `)
                .eq('student_id', targetStudentId)
                .maybeSingle();

            if (reportsData) setReports(reportsData);
            if (internshipData) {
                setInternshipInfo({
                    partnerName: internshipData.partner?.name || '-',
                    dosenName: internshipData.dosen?.full_name || '-'
                });
            }
        } catch (error) {
            console.error('Error fetching print logbook data:', error);
        }
        setLoading(false);
    };

    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else if (studentId) {
            navigate('/dosen/daily-reports');
        } else {
            navigate('/mahasiswa/daily-reports');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Helper to chunk array into pages of 5 records
    const chunkArray = (arr, size) => {
        const chunked = [];
        for (let i = 0; i < arr.length; i += size) {
            chunked.push(arr.slice(i, i + size));
        }
        return chunked;
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Mempersiapkan dokumen...</div>;
    }

    const pages = chunkArray(reports, 5);

    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px' }}>
            {/* Control Bar (Hidden on Print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button onClick={handleBack} className="btn-primary" style={{ backgroundColor: 'white', color: 'var(--text-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> Kembali
                </button>
                <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <Printer size={18} /> Cetak / Simpan PDF
                </button>
            </div>

            {pages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Belum ada catatan logbook harian untuk dicetak.</div>
            ) : (
                <div className="print-container" style={{ width: '100%', maxWidth: '210mm', margin: '0 auto', backgroundColor: 'white' }}>
                    
                    {pages.map((pageRecords, pageIndex) => (
                        <div key={pageIndex} style={{ 
                            pageBreakAfter: pageIndex === pages.length - 1 ? 'auto' : 'always',
                            paddingBottom: '20px',
                            minHeight: '297mm', // A4 minimum height
                            position: 'relative',
                            boxSizing: 'border-box'
                        }}>
                            
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

                            {/* Judul & Detail Mahasiswa */}
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '1.3rem', textDecoration: 'underline', marginBottom: '16px' }}>LOGBOOK HARIAN MAGANG MITRA</h3>
                                <table style={{ margin: '0 auto', textAlign: 'left', fontSize: '1rem' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '4px 16px 4px 0', fontWeight: 600 }}>Nama Mahasiswa</td>
                                            <td style={{ padding: '4px 8px' }}>:</td>
                                            <td style={{ padding: '4px 0', textTransform: 'capitalize' }}>{studentProfile.full_name}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '4px 16px 4px 0', fontWeight: 600 }}>Nomor Induk (NIM)</td>
                                            <td style={{ padding: '4px 8px' }}>:</td>
                                            <td style={{ padding: '4px 0' }}>{studentProfile.identifier}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '4px 16px 4px 0', fontWeight: 600 }}>Program Studi</td>
                                            <td style={{ padding: '4px 8px' }}>:</td>
                                            <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{studentProfile.prodi || 'Sistem Informasi'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '4px 16px 4px 0', fontWeight: 600 }}>Instansi / Mitra</td>
                                            <td style={{ padding: '4px 8px' }}>:</td>
                                            <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{internshipInfo.partnerName}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Tabel Logbook */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: '1px solid black', padding: '10px', width: '5%', textAlign: 'center' }}>No</th>
                                        <th style={{ border: '1px solid black', padding: '10px', width: '20%', textAlign: 'center' }}>Hari, Tanggal</th>
                                        <th style={{ border: '1px solid black', padding: '10px', width: '50%', textAlign: 'center' }}>Aktivitas / Uraian Tugas</th>
                                        <th style={{ border: '1px solid black', padding: '10px', width: '25%', textAlign: 'center' }}>Catatan Pembimbing</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRecords.map((record, idx) => (
                                        <tr key={record.id}>
                                            <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>
                                                {(pageIndex * 5) + (idx + 1)}
                                            </td>
                                            <td style={{ border: '1px solid black', padding: '10px', verticalAlign: 'top' }}>
                                                {new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </td>
                                            <td style={{ border: '1px solid black', padding: '10px', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                                                {record.activity}
                                            </td>
                                            <td style={{ border: '1px solid black', padding: '10px', verticalAlign: 'top', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                                {record.note_dosen || ''}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Baris kosong penyeimbang */}
                                    {Array.from({ length: 5 - pageRecords.length }).map((_, emptyIdx) => (
                                        <tr key={`empty-${emptyIdx}`}>
                                            <td style={{ border: '1px solid black', padding: '10px', height: '60px' }}></td>
                                            <td style={{ border: '1px solid black', padding: '10px' }}></td>
                                            <td style={{ border: '1px solid black', padding: '10px' }}></td>
                                            <td style={{ border: '1px solid black', padding: '10px' }}></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pengesahan (Hanya Tampil di Halaman Terakhir) */}
                            {pageIndex === pages.length - 1 && (
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    marginTop: '40px',
                                    padding: '0 40px'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: '0 0 60px 0', lineHeight: 1.4 }}>
                                            Mengetahui,<br/>
                                            Ketua Program Studi {studentProfile.prodi || 'Sistem Informasi'}
                                        </p>
                                        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
                                            {kaprodiInfo.kaprodi_name || '_________________________'}
                                        </p>
                                        <p style={{ margin: 0 }}>
                                            NIDN. {kaprodiInfo.kaprodi_nidn || '—'}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: '0 0 60px 0', lineHeight: 1.4 }}>
                                            Purwokerto, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
                                            Mengesahkan,
                                        </p>
                                        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
                                            _________________________
                                        </p>
                                        <p style={{ margin: 0 }}>Pembimbing Lapangan (Mitra)</p>
                                    </div>
                                </div>
                            )}

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
