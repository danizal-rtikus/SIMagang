import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Clock, CheckCircle2, Award } from 'lucide-react';
import { convertToFinalScore, getGrade } from '../../lib/grading';

const SKALA = [
    { value: 1, label: 'SK', title: 'Sangat Kurang',  color: '#DC2626', bg: '#FEE2E2' },
    { value: 2, label: 'K',  title: 'Kurang',         color: '#D97706', bg: '#FEF3C7' },
    { value: 3, label: 'C',  title: 'Cukup',          color: '#2563EB', bg: '#DBEAFE' },
    { value: 4, label: 'B',  title: 'Baik',           color: '#059669', bg: '#D1FAE5' },
    { value: 5, label: 'BS', title: 'Baik Sekali',    color: '#7C3AED', bg: '#EDE9FE' },
];

export default function MhsNilaiMagang() {
    const { userProfile } = useOutletContext();
    const [aspeks, setAspeks]         = useState([]);
    const [dosenNilai, setDosenNilai] = useState({}); // { butir_id: nilai }
    const [mitraNilai, setMitraNilai] = useState({}); // { butir_id: nilai }
    const [loading, setLoading]       = useState(true);
    const [hasInternship, setHasInternship] = useState(true);
    const [penilaianStatus, setPenilaianStatus] = useState('open');
    const [scaleType, setScaleType]   = useState('5'); // '5' or '8'

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile]);

    const fetchData = async () => {
        setLoading(true);

        // 1. Cek internship aktif
        const { data: intData } = await supabase.from('internships')
            .select('id, penilaian_status').eq('student_id', userProfile.id).eq('status', 'approved').maybeSingle();

        if (!intData) { setHasInternship(false); setLoading(false); return; }
        setPenilaianStatus(intData.penilaian_status || 'open');

        // 2. Load aspek + butir
        const { data: aspekData } = await supabase.from('aspek_penilaian')
            .select('*, butir_penilaian(id, nomor, deskripsi, urutan)')
            .order('urutan');

        // 3. Load nilai dari Dosen & Mitra
        const { data: nilaiData } = await supabase.from('penilaian_magang')
            .select('butir_id, nilai, evaluator_role')
            .eq('internship_id', intData.id);

        if (aspekData) {
            setAspeks(aspekData.map(a => ({
                ...a,
                butir_penilaian: (a.butir_penilaian || []).sort((x, y) => x.urutan - y.urutan)
            })));
        }

        const mapDosen = {};
        const mapMitra = {};
        if (nilaiData) {
            nilaiData.forEach(n => {
                if (n.evaluator_role === 'mitra') {
                    mapMitra[n.butir_id] = n.nilai;
                } else {
                    mapDosen[n.butir_id] = n.nilai;
                }
            });
        }
        setDosenNilai(mapDosen);
        setMitraNilai(mapMitra);

        setLoading(false);
    };

    const totalButir   = aspeks.reduce((s, a) => s + (a.butir_penilaian?.length || 0), 0);
    
    // Perhitungan Dosen (Bobot 40%)
    const sumDosen     = Object.values(dosenNilai).reduce((s, v) => s + v, 0);
    const countDosen   = Object.keys(dosenNilai).length;
    const scoreDosen   = countDosen === totalButir && totalButir > 0 ? convertToFinalScore(sumDosen, totalButir) : null;

    // Perhitungan Mitra (Bobot 60%)
    const sumMitra     = Object.values(mitraNilai).reduce((s, v) => s + v, 0);
    const countMitra   = Object.keys(mitraNilai).length;
    const scoreMitra   = countMitra === totalButir && totalButir > 0 ? convertToFinalScore(sumMitra, totalButir) : null;

    // Perhitungan Nilai Akhir Gabungan (60:40)
    let finalScore = null;
    if (scoreMitra !== null && scoreDosen !== null) {
        finalScore = Math.round((scoreMitra * 0.60) + (scoreDosen * 0.40));
    } else if (scoreDosen !== null) {
        finalScore = scoreDosen;
    } else if (scoreMitra !== null) {
        finalScore = scoreMitra;
    }

    const grade = finalScore !== null ? getGrade(finalScore, scaleType) : null;

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat nilai...</div>;

    if (!hasInternship) return (
        <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '16px' }}>Nilai Magang</h1>
            <div className="glass-panel" style={{ backgroundColor: 'white', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px', color: '#D97706' }} />
                <p style={{ fontWeight: 600 }}>Belum ada penempatan magang aktif.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Hubungi Admin untuk mendapatkan plotting magang terlebih dahulu.</p>
            </div>
        </div>
    );

    if (penilaianStatus !== 'closed') return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Nilai Magang</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Rekap penilaian dari Pendamping Lapangan (Mitra) & Dosen Pembimbing Anda.</p>
            </div>
            <div className="glass-panel" style={{ backgroundColor: 'white', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px', color: '#7C3AED' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.05rem' }}>Sesi Penilaian Belum Selesai</p>
                <p style={{ fontSize: '0.85rem', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0', lineHeight: 1.5 }}>
                    Sesi penilaian Anda masih berlangsung atau belum ditutup.<br />
                    Nilai akhir dan detail aspek penilaian akan tampil di sini setelah sesi penilaian difinalisasi.
                </p>
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Nilai Magang</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Rekap Penilaian Dual Mentor: Pendamping Lapangan (60%) & Dosen Pendamping (40%).</p>
                </div>

                {/* Scale Switcher Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0 8px' }}>Skala Grading:</span>
                    <button onClick={() => setScaleType('5')}
                        style={{
                            padding: '5px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                            backgroundColor: scaleType === '5' ? 'var(--primary)' : 'transparent',
                            color: scaleType === '5' ? 'white' : 'var(--text-muted)', transition: 'all 0.15s'
                        }}>
                        5 Skala (A-E)
                    </button>
                    <button onClick={() => setScaleType('8')}
                        style={{
                            padding: '5px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                            backgroundColor: scaleType === '8' ? 'var(--primary)' : 'transparent',
                            color: scaleType === '8' ? 'white' : 'var(--text-muted)', transition: 'all 0.15s'
                        }}>
                        8 Skala (A-E)
                    </button>
                </div>
            </div>

            {/* Score Summary Cards */}
            {finalScore !== null ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    {/* Nilai Akhir (100%) */}
                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nilai Akhir (100%)</p>
                        <p style={{ margin: '8px 0 4px', fontSize: '3rem', fontWeight: 800, color: grade?.color, lineHeight: 1 }}>{finalScore}</p>
                        <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: grade?.bg, color: grade?.color }}>
                            Grade {grade?.label} · {grade?.desc} ({scaleType} Skala)
                        </span>
                    </div>

                    {/* Nilai Mitra (60%) */}
                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nilai Lapangan / Mitra (60%)</p>
                        <p style={{ margin: '8px 0 4px', fontSize: '2.5rem', fontWeight: 800, color: '#D97706', lineHeight: 1 }}>
                            {scoreMitra !== null ? scoreMitra : '—'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {countMitra}/{totalButir} Butir Dinilai
                        </p>
                    </div>

                    {/* Nilai Dosen (40%) */}
                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: '#4338CA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nilai Dosen Pendamping (40%)</p>
                        <p style={{ margin: '8px 0 4px', fontSize: '2.5rem', fontWeight: 800, color: '#4338CA', lineHeight: 1 }}>
                            {scoreDosen !== null ? scoreDosen : '—'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {countDosen}/{totalButir} Butir Dinilai
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skor Predikat</p>
                        <div style={{ height: '10px', backgroundColor: '#F1F5F9', borderRadius: '5px', overflow: 'hidden', marginBottom: '6px' }}>
                            <div style={{ height: '100%', backgroundColor: grade?.color, width: `${finalScore}%`, borderRadius: '5px', transition: 'width 1s ease' }} />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>0 (min)</span><span>100 (maks)</span>
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#D97706' }}>
                    <AlertCircle size={16} />
                    Penilaian belum lengkap dari kedua pendamping.
                </div>
            )}

            {/* Detail per Aspek */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {aspeks.map((aspek) => {
                    const butirs = aspek.butir_penilaian || [];

                    return (
                        <div key={aspek.id} className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                            {/* Aspek header */}
                            <div style={{ padding: '12px 18px', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#1b1b1f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                                    {aspek.nomor}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', flex: 1 }}>{aspek.nama}</span>
                            </div>

                            {/* Butir detail */}
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#FAF5FF', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                                        <th style={{ padding: '8px 16px', width: '36px' }}>#</th>
                                        <th style={{ padding: '8px 16px' }}>Butir Penilaian</th>
                                        <th style={{ padding: '8px 16px', textAlign: 'center', width: '140px' }}>Nilai Mitra (60%)</th>
                                        <th style={{ padding: '8px 16px', textAlign: 'center', width: '140px' }}>Nilai Dosen (40%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {butirs.map((butir, bi) => {
                                        const nilaiM = mitraNilai[butir.id];
                                        const nilaiD = dosenNilai[butir.id];
                                        const infoM  = SKALA.find(s => s.value === nilaiM);
                                        const infoD  = SKALA.find(s => s.value === nilaiD);

                                        return (
                                            <tr key={butir.id} style={{ borderTop: '1px solid var(--border)' }}>
                                                <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, verticalAlign: 'middle' }}>{bi + 1}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '0.87rem', color: 'var(--text-main)', verticalAlign: 'middle' }}>{butir.deskripsi}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    {infoM ? (
                                                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: infoM.bg, color: infoM.color }}>
                                                            {infoM.label} ({nilaiM})
                                                        </span>
                                                    ) : <span style={{ color: '#CBD5E1', fontSize: '0.8rem' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    {infoD ? (
                                                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: infoD.bg, color: infoD.color }}>
                                                            {infoD.label} ({nilaiD})
                                                        </span>
                                                    ) : <span style={{ color: '#CBD5E1', fontSize: '0.8rem' }}>—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
