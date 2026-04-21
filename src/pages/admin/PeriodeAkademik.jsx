import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus, Archive, CheckCircle, Clock, Calendar,
    ChevronRight, AlertTriangle, BookOpen, Unlock, Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ── Helpers ──────────────────────────────────────────────────
const SEMESTER_META = {
    ganjil: { label: 'Ganjil', bg: '#FEF3C7', color: '#D97706' },
    genap:  { label: 'Genap',  bg: '#DBEAFE', color: '#2563EB' },
};

const formatDate = (d) => d
    ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

const getDuration = (start, end) => {
    if (!start || !end) return null;
    const days = Math.round((new Date(end) - new Date(start)) / 86400000);
    if (days < 0) return null;
    return days < 30 ? `${days} hari` : `${Math.round(days / 30)} bulan`;
};

// ── Next suggestion helper ────────────────────────────────────
function suggestNext(current) {
    if (!current) return { semester: 'ganjil', tahun: `${new Date().getFullYear()}/${new Date().getFullYear()+1}` };
    const { semester, tahun_akademik } = current;
    if (semester === 'ganjil') {
        return { semester: 'genap', tahun: tahun_akademik };
    } else {
        const [y1, y2] = tahun_akademik.split('/').map(Number);
        return { semester: 'ganjil', tahun: `${y1+1}/${y2+1}` };
    }
}

export default function PeriodeAkademik() {
    const [periodes, setPeriodes]         = useState([]);
    const [activePeriode, setActivePeriode] = useState(null);
    const [loading, setLoading]           = useState(true);

    // Modal state
    const [showBukaModal, setShowBukaModal]     = useState(false);
    const [showArsipModal, setShowArsipModal]   = useState(false);
    const [saving, setSaving]                   = useState(false);

    // Form untuk buka periode baru
    const initForm = () => {
        const s = suggestNext(activePeriode);
        return { tahun_akademik: s.tahun, semester: s.semester, tanggal_mulai: '', tanggal_selesai: '', keterangan: '' };
    };
    const [form, setForm] = useState({});

    useEffect(() => { fetchPeriodes(); }, []);

    const fetchPeriodes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('periode_akademik')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setPeriodes(data);
            setActivePeriode(data.find(p => p.status === 'active') || null);
        }
        setLoading(false);
    };

    const handleBukaPeriode = () => {
        setForm(initForm());
        setShowBukaModal(true);
    };

    // ── Buka Periode Baru ────────────────────────────────────
    const savePeriodeBaru = async (e) => {
        e.preventDefault();
        if (activePeriode) {
            toast.error('Arsipkan periode aktif terlebih dahulu sebelum membuka periode baru!');
            return;
        }
        if (!form.tahun_akademik || !form.semester || !form.tanggal_mulai) {
            toast.error('Tahun akademik, semester, dan tanggal mulai wajib diisi!');
            return;
        }
        setSaving(true);
        const nama = `${form.semester.charAt(0).toUpperCase() + form.semester.slice(1)} ${form.tahun_akademik}`;
        const { error } = await supabase.from('periode_akademik').insert([{
            nama,
            tahun_akademik:  form.tahun_akademik,
            semester:        form.semester,
            status:          'active',
            tanggal_mulai:   form.tanggal_mulai   || null,
            tanggal_selesai: form.tanggal_selesai || null,
            keterangan:      form.keterangan      || null,
        }]);

        setSaving(false);
        if (error) {
            if (error.code === '23505') toast.error('Sudah ada periode aktif! Arsipkan terlebih dahulu.');
            else toast.error('Gagal membuka periode: ' + error.message);
        } else {
            toast.success(`Periode "${nama}" berhasil dibuka!`);
            setShowBukaModal(false);
            fetchPeriodes();
        }
    };

    // ── Arsipkan Periode ─────────────────────────────────────
    const arsipkanPeriode = async () => {
        if (!activePeriode) return;
        setSaving(true);
        const { error } = await supabase.from('periode_akademik')
            .update({ status: 'archived', archived_at: new Date().toISOString(), tanggal_selesai: activePeriode.tanggal_selesai || new Date().toISOString().split('T')[0] })
            .eq('id', activePeriode.id);

        setSaving(false);
        if (error) toast.error('Gagal mengarsipkan: ' + error.message);
        else {
            toast.success(`Periode "${activePeriode.nama}" berhasil diarsipkan.`);
            setShowArsipModal(false);
            fetchPeriodes();
        }
    };

    const archivedPeriodes = periodes.filter(p => p.status === 'archived');

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data periode...</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Periode Akademik</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Kelola siklus masa Ganjil/Genap. Hanya satu periode yang dapat aktif dalam satu waktu.</p>
                </div>
                <button
                    onClick={handleBukaPeriode}
                    disabled={!!activePeriode}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', opacity: activePeriode ? 0.5 : 1, cursor: activePeriode ? 'not-allowed' : 'pointer' }}
                    title={activePeriode ? 'Arsipkan periode aktif terlebih dahulu' : 'Buka periode baru'}
                >
                    <Plus size={16} /> Buka Periode Baru
                </button>
            </div>

            {/* ── Periode Aktif (prominent card) ─── */}
            {activePeriode ? (
                <div style={{
                    background: 'linear-gradient(135deg, #1b1b1f 0%, #2d2d35 100%)',
                    borderRadius: '12px', padding: '28px 32px', marginBottom: '24px',
                    border: '1px solid rgba(246,130,31,0.3)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22C55E', boxShadow: '0 0 8px #22C55E', animation: 'pulse 2s infinite' }} />
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Periode Aktif</span>
                            </div>
                            <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px' }}>{activePeriode.nama}</h2>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Calendar size={13} />
                                    Mulai: {formatDate(activePeriode.tanggal_mulai)}
                                </span>
                                {getDuration(activePeriode.tanggal_mulai, activePeriode.tanggal_selesai) && (
                                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Clock size={13} />
                                        Estimasi: {getDuration(activePeriode.tanggal_mulai, activePeriode.tanggal_selesai)}
                                    </span>
                                )}
                            </div>
                            {activePeriode.keterangan && (
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginTop: '8px' }}>{activePeriode.keterangan}</p>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{
                                padding: '4px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                                backgroundColor: SEMESTER_META[activePeriode.semester]?.bg,
                                color: SEMESTER_META[activePeriode.semester]?.color
                            }}>
                                Semester {SEMESTER_META[activePeriode.semester]?.label}
                            </span>
                            <button
                                onClick={() => setShowArsipModal(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '9px 18px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.5)',
                                    background: 'rgba(239,68,68,0.1)', color: '#FCA5A5',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.borderColor = '#EF4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                            >
                                <Archive size={15} /> Arsipkan Periode
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <AlertTriangle size={24} color="#D97706" style={{ flexShrink: 0 }} />
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#92400E' }}>Tidak ada periode aktif saat ini</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#B45309' }}>Klik "Buka Periode Baru" untuk memulai semester baru. Mahasiswa tidak dapat diplot hingga periode aktif dibuka.</p>
                    </div>
                    <button onClick={handleBukaPeriode} className="btn-primary" style={{ marginLeft: 'auto', flexShrink: 0, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Unlock size={15} /> Buka Sekarang
                    </button>
                </div>
            )}

            {/* ── Riwayat Arsip ─── */}
            <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Archive size={16} /> Riwayat Arsip ({archivedPeriodes.length})
                </h2>

                {archivedPeriodes.length === 0 ? (
                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <BookOpen size={32} strokeWidth={1.2} style={{ margin: '0 auto 10px' }} />
                        <p style={{ margin: 0, fontSize: '0.88rem' }}>Belum ada periode yang diarsipkan.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {archivedPeriodes.map((p, idx) => (
                            <div key={p.id} style={{
                                backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px',
                                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
                            }}>
                                {/* Timeline dot */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
                                    {idx < archivedPeriodes.length - 1 && <div style={{ width: '2px', height: '24px', backgroundColor: '#E5E7EB', marginTop: '4px' }} />}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{p.nama}</p>
                                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#F1F5F9', color: '#64748B' }}>
                                            Arsip
                                        </span>
                                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: SEMESTER_META[p.semester]?.bg, color: SEMESTER_META[p.semester]?.color }}>
                                            {SEMESTER_META[p.semester]?.label}
                                        </span>
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        <span>📅 {formatDate(p.tanggal_mulai)} – {formatDate(p.tanggal_selesai)}</span>
                                        {getDuration(p.tanggal_mulai, p.tanggal_selesai) && (
                                            <span>⏱ {getDuration(p.tanggal_mulai, p.tanggal_selesai)}</span>
                                        )}
                                        {p.archived_at && <span>🗄 Diarsipkan {new Date(p.archived_at).toLocaleDateString('id-ID')}</span>}
                                    </p>
                                    {p.keterangan && <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{p.keterangan}</p>}
                                </div>

                                <Lock size={16} color="#CBD5E1" style={{ flexShrink: 0 }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Modal: Buka Periode Baru ─── */}
            {showBukaModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ backgroundColor: 'white', padding: '32px', width: '100%', maxWidth: '480px' }}>
                        <h2 style={{ marginBottom: '6px', fontSize: '1.15rem' }}>Buka Periode Akademik Baru</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>Periode ini akan langsung menjadi periode aktif.</p>

                        <form onSubmit={savePeriodeBaru} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Tahun Akademik</label>
                                    <input type="text" required className="input-field" placeholder="2024/2025"
                                        value={form.tahun_akademik || ''}
                                        onChange={e => setForm(p => ({ ...p, tahun_akademik: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Semester</label>
                                    <select required className="input-field" value={form.semester || 'ganjil'} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}>
                                        <option value="ganjil">Ganjil</option>
                                        <option value="genap">Genap</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Tanggal Mulai</label>
                                    <input type="date" required className="input-field" value={form.tanggal_mulai || ''} onChange={e => setForm(p => ({ ...p, tanggal_mulai: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Estimasi Selesai <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opsional)</span></label>
                                    <input type="date" className="input-field" value={form.tanggal_selesai || ''} onChange={e => setForm(p => ({ ...p, tanggal_selesai: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.88rem' }}>Keterangan <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opsional)</span></label>
                                <textarea rows={2} className="input-field" placeholder="Mis: Semester praktik kerja lapangan angkatan 2022"
                                    value={form.keterangan || ''} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                            </div>

                            {/* Preview nama */}
                            <div style={{ padding: '10px 14px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '6px', fontSize: '0.85rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={14} />
                                Nama periode: <strong>{`${(form.semester||'ganjil').charAt(0).toUpperCase() + (form.semester||'ganjil').slice(1)} ${form.tahun_akademik || '—'}`}</strong>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowBukaModal(false)} style={{ padding: '9px 18px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Batal</button>
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Buka Periode'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Konfirmasi Arsip ─── */}
            {showArsipModal && activePeriode && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Archive size={24} color="#D97706" />
                        </div>
                        <h2 style={{ marginBottom: '8px' }}>Arsipkan Periode?</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '8px' }}>
                            Periode <strong>"{activePeriode.nama}"</strong> akan diarsipkan.
                        </p>
                        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px 16px', textAlign: 'left', marginBottom: '20px', fontSize: '0.84rem' }}>
                            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Yang terjadi:</p>
                            <p style={{ margin: '2px 0', color: 'var(--text-muted)' }}>✅ Status periode berubah menjadi <strong>Arsip</strong></p>
                            <p style={{ margin: '2px 0', color: 'var(--text-muted)' }}>✅ Data plotting, laporan, dan nilai tetap tersimpan</p>
                            <p style={{ margin: '2px 0', color: 'var(--text-muted)' }}>✅ Setelah ini Anda bisa membuka periode baru</p>
                            <p style={{ margin: '2px 0', color: 'var(--text-muted)' }}>❌ Status internship individual tidak diubah</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setShowArsipModal(false)} style={{ padding: '10px 24px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontWeight: 500 }}>Batal</button>
                            <button onClick={arsipkanPeriode} disabled={saving}
                                style={{ padding: '10px 24px', border: 'none', borderRadius: '6px', background: '#D97706', color: 'white', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Archive size={15} /> {saving ? 'Mengarsipkan...' : 'Ya, Arsipkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
