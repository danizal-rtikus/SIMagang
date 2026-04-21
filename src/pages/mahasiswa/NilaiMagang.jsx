import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Award, TrendingUp, ClipboardList, AlertCircle } from 'lucide-react';

const SKALA = [
    { value: 1, label: 'SK', title: 'Sangat Kurang',  color: '#DC2626', bg: '#FEE2E2' },
    { value: 2, label: 'K',  title: 'Kurang',         color: '#D97706', bg: '#FEF3C7' },
    { value: 3, label: 'C',  title: 'Cukup',          color: '#2563EB', bg: '#DBEAFE' },
    { value: 4, label: 'B',  title: 'Baik',           color: '#059669', bg: '#D1FAE5' },
    { value: 5, label: 'BS', title: 'Baik Sekali',    color: '#7C3AED', bg: '#EDE9FE' },
];

function convertToFinalScore(rawSum, totalButir) {
    if (!totalButir || rawSum === 0) return 0;
    const minRaw = totalButir;
    const maxRaw = totalButir * 5;
    return Math.round(((rawSum - minRaw) / (maxRaw - minRaw)) * (100 - 45) + 45);
}

function getGrade(score) {
    if (score >= 85) return { label: 'A',  desc: 'Sangat Baik',  color: '#059669', bg: '#D1FAE5' };
    if (score >= 75) return { label: 'B',  desc: 'Baik',         color: '#2563EB', bg: '#DBEAFE' };
    if (score >= 65) return { label: 'C',  desc: 'Cukup',        color: '#D97706', bg: '#FEF3C7' };
    if (score >= 55) return { label: 'D',  desc: 'Kurang',       color: '#EF4444', bg: '#FEE2E2' };
    return                   { label: 'E',  desc: 'Sangat Kurang',color: '#DC2626', bg: '#FEE2E2' };
}

export default function MhsNilaiMagang() {
    const { userProfile } = useOutletContext();
    const [aspeks, setAspeks]     = useState([]);
    const [nilaiMap, setNilaiMap] = useState({}); // { butir_id: nilai }
    const [loading, setLoading]   = useState(true);
    const [hasInternship, setHasInternship] = useState(true);

    useEffect(() => { fetchData(); }, [userProfile]);

    const fetchData = async () => {
        setLoading(true);

        // 1. Cek internship aktif
        const { data: intData } = await supabase.from('internships')
            .select('id').eq('student_id', userProfile.id).eq('status', 'approved').maybeSingle();

        if (!intData) { setHasInternship(false); setLoading(false); return; }

        // 2. Load aspek + butir
        const { data: aspekData } = await supabase.from('aspek_penilaian')
            .select('*, butir_penilaian(id, nomor, deskripsi, urutan)')
            .order('urutan');

        // 3. Load nilai mahasiswa ini
        const { data: nilaiData } = await supabase.from('penilaian_magang')
            .select('butir_id, nilai')
            .eq('internship_id', intData.id);

        if (aspekData) {
            setAspeks(aspekData.map(a => ({
                ...a,
                butir_penilaian: (a.butir_penilaian || []).sort((x,y) => x.urutan - y.urutan)
            })));
        }

        const map = {};
        if (nilaiData) nilaiData.forEach(n => { map[n.butir_id] = n.nilai; });
        setNilaiMap(map);

        setLoading(false);
    };

    const totalButir  = aspeks.reduce((s, a) => s + (a.butir_penilaian?.length || 0), 0);
    const rawSum      = Object.values(nilaiMap).reduce((s, v) => s + v, 0);
    const answeredCount = Object.keys(nilaiMap).length;
    const isComplete  = answeredCount === totalButir && totalButir > 0;
    const finalScore  = isComplete ? convertToFinalScore(rawSum, totalButir) : null;
    const grade       = finalScore ? getGrade(finalScore) : null;

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

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Nilai Magang</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Rekap penilaian dari Dosen Pembimbing Anda.</p>
            </div>

            {/* Score card */}
            {isComplete ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    {/* Nilai Akhir */}
                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nilai Akhir</p>
                        <p style={{ margin: '8px 0 4px', fontSize: '3rem', fontWeight: 800, color: grade?.color, lineHeight: 1 }}>{finalScore}</p>
                        <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: grade?.bg, color: grade?.color }}>
                            Grade {grade?.label} · {grade?.desc}
                        </span>
                    </div>
                    {/* Skor Mentah */}
                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skor Mentah</p>
                        <p style={{ margin: '8px 0 4px', fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{rawSum}</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>dari {totalButir * 5} maks</p>
                    </div>
                    {/* Jumlah Butir */}
                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Butir Dinilai</p>
                        <p style={{ margin: '8px 0 4px', fontSize: '2.5rem', fontWeight: 800, color: '#059669', lineHeight: 1 }}>{answeredCount}</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>dari {totalButir} butir</p>
                    </div>
                    {/* Progress bar */}
                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rentang Nilai</p>
                        <div style={{ height: '10px', backgroundColor: '#F1F5F9', borderRadius: '5px', overflow: 'hidden', marginBottom: '6px' }}>
                            <div style={{ height: '100%', backgroundColor: grade?.color, width: `${finalScore}%`, borderRadius: '5px', transition: 'width 1s ease' }} />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>45 (min)</span><span>100 (maks)</span>
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#D97706' }}>
                    <AlertCircle size={16} />
                    Penilaian belum lengkap. {answeredCount > 0 ? `Sudah ${answeredCount} dari ${totalButir} butir dinilai.` : 'Dosen Pembimbing belum memasukkan nilai.'}
                </div>
            )}

            {/* Detail per Aspek */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {aspeks.map((aspek) => {
                    const aspekNilai  = (aspek.butir_penilaian || []).map(b => ({ ...b, nilai: nilaiMap[b.id] }));
                    const aspekRaw    = aspekNilai.reduce((s, b) => s + (b.nilai || 0), 0);
                    const aspekMax    = aspekNilai.length * 5;
                    const aspekPct    = aspekMax > 0 ? Math.round((aspekRaw / aspekMax) * 100) : 0;
                    const allFilled   = aspekNilai.every(b => b.nilai);

                    return (
                        <div key={aspek.id} className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                            {/* Aspek header */}
                            <div style={{ padding: '12px 18px', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#1b1b1f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                                    {aspek.nomor}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', flex: 1 }}>{aspek.nama}</span>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: allFilled ? 'var(--text-main)' : 'var(--text-muted)' }}>{aspekRaw} / {aspekMax}</p>
                                    <div style={{ height: '4px', width: '80px', backgroundColor: '#E5E7EB', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', backgroundColor: allFilled ? '#059669' : '#CBD5E1', width: `${aspekPct}%`, borderRadius: '2px' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Butir detail */}
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {aspekNilai.map((butir, bi) => {
                                        const skalaInfo = SKALA.find(s => s.value === butir.nilai);
                                        return (
                                            <tr key={butir.id} style={{ borderTop: bi > 0 ? '1px solid var(--border)' : 'none' }}>
                                                <td style={{ padding: '12px 16px', width: '36px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, verticalAlign: 'top' }}>{bi + 1}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '0.87rem', color: 'var(--text-main)', verticalAlign: 'top' }}>{butir.deskripsi}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                                    {skalaInfo ? (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: skalaInfo.bg, color: skalaInfo.color }}>
                                                                {skalaInfo.label} ({butir.nilai})
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{skalaInfo.title}</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '0.8rem', color: '#CBD5E1', fontStyle: 'italic' }}>Belum dinilai</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Aspek subtotal */}
                            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subtotal {aspek.nama}</span>
                                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: allFilled ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                    {allFilled ? `${aspekRaw} poin (${aspekPct}%)` : '—'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total row */}
            {isComplete && (
                <div style={{ backgroundColor: '#1b1b1f', color: 'white', borderRadius: '8px', padding: '16px 20px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>JUMLAH TOTAL</span>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginRight: '16px' }}>Skor mentah: {rawSum}</span>
                        <span style={{ fontWeight: 800, fontSize: '1.4rem', color: grade?.color }}>{finalScore}</span>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginLeft: '8px' }}>/ 100</span>
                    </div>
                </div>
            )}
        </div>
    );
}
