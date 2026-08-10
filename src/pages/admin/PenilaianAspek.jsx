import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit3, Trash2, ChevronDown, ChevronRight, Save, X, ClipboardList, ListChecks } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ── Skala label helper ──────────────────────────────────────
const SKALA = [
    { value: 1, label: 'SK', title: 'Sangat Kurang' },
    { value: 2, label: 'K',  title: 'Kurang' },
    { value: 3, label: 'C',  title: 'Cukup' },
    { value: 4, label: 'B',  title: 'Baik' },
    { value: 5, label: 'BS', title: 'Baik Sekali' },
];

// ── Inline form component ───────────────────────────────────
function InlineForm({ placeholder, value, onChange, onSave, onCancel, label = 'text' }) {
    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 0' }}>
            <input
                autoFocus
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--primary)', borderRadius: '6px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }}
                onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
            />
            <button onClick={onSave}  style={{ padding: '8px 14px', borderRadius: '6px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, flexShrink: 0 }}>Simpan</button>
            <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: '6px', background: 'white', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.82rem', flexShrink: 0 }}>Batal</button>
        </div>
    );
}

export default function PenilaianAspek() {
    const [aspeks, setAspeks]       = useState([]);
    const [loading, setLoading]     = useState(true);
    const [openAspek, setOpenAspek] = useState({}); // expanded accordion

    // Form state untuk Aspek
    const [addingAspek, setAddingAspek]   = useState(false);
    const [editingAspek, setEditingAspek] = useState(null);  // { id, nomor, nama }
    const [aspekForm, setAspekForm]       = useState({ nomor: '', nama: '' });
    const [deleteAspek, setDeleteAspek]   = useState(null);

    // Form state untuk Butir
    const [addingButir, setAddingButir]   = useState(null);  // aspek_id
    const [editingButir, setEditingButir] = useState(null);  // { id, deskripsi }
    const [butirText, setButirText]       = useState('');
    const [deleteButir, setDeleteButir]   = useState(null);

    useEffect(() => { fetchAspeks(); }, []);

    const fetchAspeks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('aspek_penilaian')
            .select('*, butir_penilaian(id, nomor, deskripsi, urutan)')
            .order('urutan');

        if (!error && data) {
            // Sort butir inside each aspek
            setAspeks(data.map(a => ({ ...a, butir_penilaian: (a.butir_penilaian || []).sort((x, y) => x.urutan - y.urutan) })));
        }
        setLoading(false);
    };

    const totalButir = aspeks.reduce((sum, a) => sum + (a.butir_penilaian?.length || 0), 0);

    // ── Aspek CRUD ───────────────────────────────────────────
    const saveAspek = async () => {
        if (!aspekForm.nomor.trim() || !aspekForm.nama.trim()) { toast.error('Nomor dan nama aspek wajib diisi.'); return; }
        const urutan = aspeks.length + 1;
        if (editingAspek) {
            const { error } = await supabase.from('aspek_penilaian').update({ nomor: aspekForm.nomor, nama: aspekForm.nama }).eq('id', editingAspek.id);
            if (error) { toast.error(error.message); return; }
            toast.success('Aspek berhasil diperbarui!');
            setEditingAspek(null);
        } else {
            const { error } = await supabase.from('aspek_penilaian').insert([{ nomor: aspekForm.nomor, nama: aspekForm.nama, urutan }]);
            if (error) { toast.error(error.message); return; }
            toast.success('Aspek berhasil ditambahkan!');
            setAddingAspek(false);
        }
        setAspekForm({ nomor: '', nama: '' });
        fetchAspeks();
    };

    const deleteAspekConfirmed = async () => {
        const { error } = await supabase.from('aspek_penilaian').delete().eq('id', deleteAspek.id);
        if (!error) { toast.success('Aspek dihapus.'); fetchAspeks(); }
        else toast.error(error.message);
        setDeleteAspek(null);
    };

    // ── Butir CRUD ───────────────────────────────────────────
    const saveButir = async (aspekId) => {
        if (!butirText.trim()) { toast.error('Deskripsi butir wajib diisi.'); return; }
        const aspek = aspeks.find(a => a.id === aspekId);
        const nextNomor = (aspek?.butir_penilaian?.length || 0) + 1;
        const nextUrutan = nextNomor;

        if (editingButir) {
            const { error } = await supabase.from('butir_penilaian').update({ deskripsi: butirText }).eq('id', editingButir.id);
            if (error) { toast.error(error.message); return; }
            toast.success('Butir berhasil diperbarui!');
            setEditingButir(null);
        } else {
            const { error } = await supabase.from('butir_penilaian').insert([{ aspek_id: aspekId, nomor: nextNomor, deskripsi: butirText, urutan: nextUrutan }]);
            if (error) { toast.error(error.message); return; }
            toast.success('Butir berhasil ditambahkan!');
            setAddingButir(null);
        }
        setButirText('');
        fetchAspeks();
    };

    const deleteButirConfirmed = async () => {
        const { error } = await supabase.from('butir_penilaian').delete().eq('id', deleteButir.id);
        if (!error) { toast.success('Butir dihapus.'); fetchAspeks(); }
        else toast.error(error.message);
        setDeleteButir(null);
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data penilaian...</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Aspek & Butir Penilaian</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Kelola struktur penilaian magang. Nilai kisaran 45–100.</p>
                </div>
                <button onClick={() => { setAddingAspek(true); setAspekForm({ nomor: '', nama: '' }); }}
                    className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                    <Plus size={16} /> Tambah Aspek
                </button>
            </div>

            {/* Summary chips */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                    { icon: <ClipboardList size={13} />, label: `${aspeks.length} Aspek`,  bg: '#E0E7FF', color: '#4338CA' },
                    { icon: <ListChecks size={13} />,    label: `${totalButir} Butir`,     bg: '#F0FDF4', color: '#059669' },
                    { icon: null,                        label: `Skor maks: ${totalButir * 5}`, bg: '#FEF3C7', color: '#D97706' },
                ].map(c => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: c.bg, color: c.color }}>
                        {c.icon} {c.label}
                    </div>
                ))}
            </div>

            {/* Skala keterangan */}
            <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Skala Penilaian:</span>
                {SKALA.map(s => (
                    <div key={s.value} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-main)' }}>{s.label}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.value} – {s.title}</span>
                    </div>
                ))}
            </div>

            {/* Add Aspek inline */}
            {addingAspek && (
                <div className="glass-panel" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', padding: '16px 20px', marginBottom: '12px' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '10px' }}>➕ Tambah Aspek Baru</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: '0 0 100px' }}>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Nomor</label>
                            <input value={aspekForm.nomor} onChange={e => setAspekForm(p => ({...p, nomor: e.target.value}))} placeholder="I, II, III…"
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Nama Aspek</label>
                            <input autoFocus value={aspekForm.nama} onChange={e => setAspekForm(p => ({...p, nama: e.target.value}))} placeholder="Mis: Aspek Personal"
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }}
                                onKeyDown={e => { if (e.key==='Enter') saveAspek(); if(e.key==='Escape') setAddingAspek(false); }} />
                        </div>
                        <button onClick={saveAspek} style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Simpan</button>
                        <button onClick={() => setAddingAspek(false)} style={{ padding: '8px 12px', borderRadius: '6px', background: 'white', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem' }}>Batal</button>
                    </div>
                </div>
            )}

            {/* Aspek list accordion */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 310px)', overflowY: 'auto', paddingRight: '4px' }}>
                {aspeks.map((aspek, ai) => {
                    const isOpen = !!openAspek[aspek.id];
                    return (
                        <div key={aspek.id} className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden', flexShrink: 0 }}>
                            {/* Aspek row */}
                            {editingAspek?.id === aspek.id ? (
                                <div style={{ padding: '14px 18px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FCD34D' }}>
                                    <div style={{ flex: '0 0 100px' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nomor</label>
                                        <input value={aspekForm.nomor} onChange={e => setAspekForm(p=>({...p,nomor:e.target.value}))} style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border)', borderRadius:'6px', fontSize:'0.85rem', fontFamily:'inherit', outline:'none' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nama Aspek</label>
                                        <input autoFocus value={aspekForm.nama} onChange={e => setAspekForm(p=>({...p,nama:e.target.value}))} style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border)', borderRadius:'6px', fontSize:'0.85rem', fontFamily:'inherit', outline:'none' }}
                                            onKeyDown={e=>{if(e.key==='Enter')saveAspek();if(e.key==='Escape')setEditingAspek(null)}} />
                                    </div>
                                    <button onClick={saveAspek} style={{ padding:'7px 14px', borderRadius:'6px', background:'var(--primary)', color:'white', border:'none', cursor:'pointer', fontWeight:600, fontSize:'0.83rem' }}>Simpan</button>
                                    <button onClick={()=>setEditingAspek(null)} style={{ padding:'7px 12px', borderRadius:'6px', background:'white', border:'1px solid var(--border)', cursor:'pointer', fontSize:'0.83rem' }}>Batal</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', padding: '13px 18px', borderBottom: isOpen ? '1px solid var(--border)' : 'none', gap: '12px' }}>
                                    <button onClick={() => setOpenAspek(p => ({...p, [aspek.id]: !isOpen}))}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#1b1b1f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                                            {aspek.nomor}
                                        </span>
                                        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>{aspek.nama}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>{aspek.butir_penilaian?.length || 0} butir</span>
                                        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                            <ChevronDown size={17} />
                                        </span>
                                    </button>
                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                        <button onClick={() => { setEditingAspek(aspek); setAspekForm({ nomor: aspek.nomor, nama: aspek.nama }); setOpenAspek(p=>({...p,[aspek.id]:true})); }}
                                            style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: '5px', background: 'white', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                                            <Edit3 size={12} /> Edit
                                        </button>
                                        <button onClick={() => setDeleteAspek(aspek)}
                                            style={{ padding: '5px 10px', border: '1px solid #FEE2E2', borderRadius: '5px', background: '#FFF5F5', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                                            <Trash2 size={12} /> Hapus
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Butir list */}
                            {isOpen && (
                                <div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#F8FAFC' }}>
                                                <th style={{ padding: '10px 18px', width: '50px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left' }}>No</th>
                                                <th style={{ padding: '10px 18px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left' }}>Unsur yang Dinilai</th>
                                                <th style={{ padding: '10px 18px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left' }}>Skala</th>
                                                <th style={{ padding: '10px 18px', width: '120px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(aspek.butir_penilaian || []).map((butir, bi) => (
                                                <tr key={butir.id} style={{ borderTop: '1px solid var(--border)' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                                    {editingButir?.id === butir.id ? (
                                                        <td colSpan={4} style={{ padding: '10px 18px' }}>
                                                            <InlineForm
                                                                value={butirText}
                                                                onChange={setButirText}
                                                                placeholder="Deskripsi butir penilaian..."
                                                                onSave={() => saveButir(aspek.id)}
                                                                onCancel={() => { setEditingButir(null); setButirText(''); }}
                                                            />
                                                        </td>
                                                    ) : (
                                                        <>
                                                            <td style={{ padding: '12px 18px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{bi + 1}</td>
                                                            <td style={{ padding: '12px 18px', fontSize: '0.87rem', color: 'var(--text-main)' }}>{butir.deskripsi}</td>
                                                            <td style={{ padding: '12px 18px' }}>
                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                    {SKALA.map(s => (
                                                                        <span key={s.value} title={s.title} style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>{s.label}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '12px 18px' }}>
                                                                <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                                                    <button onClick={() => { setEditingButir(butir); setButirText(butir.deskripsi); }}
                                                                        style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'white', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                        <Edit3 size={11} /> Edit
                                                                    </button>
                                                                    <button onClick={() => setDeleteButir(butir)}
                                                                        style={{ padding: '4px 8px', border: '1px solid #FEE2E2', borderRadius: '4px', background: '#FFF5F5', cursor: 'pointer', color: '#EF4444', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                        <Trash2 size={11} /> Hapus
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}

                                            {/* Add butir row */}
                                            {addingButir === aspek.id ? (
                                                <tr style={{ borderTop: '1px solid var(--border)', backgroundColor: '#F0FDF4' }}>
                                                    <td style={{ padding: '10px 18px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                        {(aspek.butir_penilaian?.length || 0) + 1}
                                                    </td>
                                                    <td colSpan={3} style={{ padding: '10px 18px' }}>
                                                        <InlineForm
                                                            value={butirText}
                                                            onChange={setButirText}
                                                            placeholder="Deskripsi butir penilaian baru..."
                                                            onSave={() => saveButir(aspek.id)}
                                                            onCancel={() => { setAddingButir(null); setButirText(''); }}
                                                        />
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr style={{ borderTop: '1px solid var(--border)' }}>
                                                    <td colSpan={4} style={{ padding: '10px 18px' }}>
                                                        <button onClick={() => { setAddingButir(aspek.id); setButirText(''); setEditingButir(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                                                            <Plus size={14} /> Tambah Butir Penilaian
                                                        </button>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {aspeks.length === 0 && !addingAspek && (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <ClipboardList size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px' }} />
                    <p>Belum ada aspek penilaian. Klik "Tambah Aspek" untuk memulai.</p>
                </div>
            )}

            {/* Confirm Delete Aspek */}
            {deleteAspek && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '10px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
                        <Trash2 size={36} color="#EF4444" style={{ margin: '0 auto 14px' }} />
                        <p style={{ fontWeight: 600, marginBottom: '6px' }}>Hapus Aspek "{deleteAspek.nama}"?</p>
                        <p style={{ color: '#EF4444', fontSize: '0.85rem', marginBottom: '24px' }}>Semua butir penilaian dalam aspek ini juga akan dihapus!</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteAspek(null)} style={{ padding: '9px 22px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Batal</button>
                            <button onClick={deleteAspekConfirmed} style={{ padding: '9px 22px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Butir */}
            {deleteButir && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '10px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
                        <Trash2 size={36} color="#EF4444" style={{ margin: '0 auto 14px' }} />
                        <p style={{ fontWeight: 600, marginBottom: '20px' }}>Hapus butir ini?</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>"{deleteButir.deskripsi}"</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteButir(null)} style={{ padding: '9px 22px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Batal</button>
                            <button onClick={deleteButirConfirmed} style={{ padding: '9px 22px', border: 'none', borderRadius: '6px', background: '#EF4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
