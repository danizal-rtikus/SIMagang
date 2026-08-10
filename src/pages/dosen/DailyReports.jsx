import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    MessageSquare, CheckCircle, Edit3, ChevronDown, ChevronRight,
    Search, Filter, ExternalLink, User, FileText, Clock, Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonTableRow } from '../../components/Skeleton';

const STATUS_OPTIONS = [
    { value: 'all',       label: 'Semua Status' },
    { value: 'submitted', label: 'Menunggu Reviu' },
    { value: 'approved',  label: 'Disetujui' },
    { value: 'revision',  label: 'Perlu Revisi' },
];

const PAGE_SIZE_STUDENT = 5; // laporan per mahasiswa yang ditampilkan sebelum "lihat semua"

// ── Helper ──────────────────────────────────────────────────
const statusStyle = (s) => ({
    submitted: { bg: '#FEF3C7', text: '#D97706', label: 'Menunggu' },
    approved:  { bg: '#D1FAE5', text: '#059669', label: 'Disetujui' },
    revision:  { bg: '#FEE2E2', text: '#DC2626', label: 'Revisi' },
}[s] || { bg: '#F1F5F9', text: '#64748B', label: s });

function StatusBadge({ status }) {
    const s = statusStyle(status);
    return (
        <span style={{
            padding: '2px 9px', borderRadius: '20px',
            fontSize: '0.73rem', fontWeight: 600,
            backgroundColor: s.bg, color: s.text,
            whiteSpace: 'nowrap'
        }}>{s.label}</span>
    );
}

// ── Main Component ───────────────────────────────────────────
export default function DosenDailyReports() {
    const [reports, setReports]         = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDate, setFilterDate]   = useState('');
    const [expandedStudents, setExpandedStudents] = useState({});
    const [showAllReports, setShowAllReports]     = useState({});  // { studentId: bool }

    // Review modal
    const [showModal, setShowModal]     = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [feedback, setFeedback]       = useState('');
    const [statusVal, setStatusVal]     = useState('approved');
    const [saving, setSaving]           = useState(false);

    useEffect(() => { fetchReports(); }, []);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('daily_reports')
            .select('*, users_profile(full_name, identifier)')
            .order('date', { ascending: false });

        if (!error && data) setReports(data);
        else if (error) toast.error('Gagal memuat data: ' + error.message);
        setLoading(false);
    };

    // ── Group by student ─────────────────────────────────────
    const grouped = useMemo(() => {
        const map = {};
        reports.forEach(r => {
            const sid = r.student_id;
            if (!map[sid]) {
                map[sid] = {
                    id:      sid,
                    name:    r.users_profile?.full_name  || 'Tanpa Nama',
                    nim:     r.users_profile?.identifier || 'N/A',
                    reports: [],
                };
            }
            map[sid].reports.push(r);
        });
        return Object.values(map);
    }, [reports]);

    // ── Apply search + status + date filter ──────────────────
    const filtered = useMemo(() => {
        return grouped
            .map(student => {
                // Filter laporan per mahasiswa
                let rpts = student.reports;

                if (filterStatus !== 'all')
                    rpts = rpts.filter(r => r.status === filterStatus);

                if (filterDate)
                    rpts = rpts.filter(r => r.date === filterDate);

                return { ...student, reports: rpts };
            })
            // Filter student by name/nim search
            .filter(student => {
                const q = search.toLowerCase();
                const matchStudent = student.name.toLowerCase().includes(q) || student.nim.toLowerCase().includes(q);
                return matchStudent && student.reports.length > 0;
            });
    }, [grouped, search, filterStatus, filterDate]);

    // Summary counts for header chips
    const totalReports  = reports.length;
    const pendingCount  = reports.filter(r => r.status === 'submitted').length;
    const studentCount  = grouped.length;

    // ── Toggle accordion ────────────────────────────────────
    const toggleStudent = (id) => {
        setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const expandAll = () => {
        const all = {};
        filtered.forEach(s => all[s.id] = true);
        setExpandedStudents(all);
    };

    const collapseAll = () => setExpandedStudents({});

    // ── Review handlers ──────────────────────────────────────
    const handleOpenReview = (report) => {
        setSelectedReport(report);
        setFeedback(report.note_dosen || '');
        setStatusVal(report.status === 'submitted' ? 'approved' : report.status);
        setShowModal(true);
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase
            .from('daily_reports')
            .update({ status: statusVal, note_dosen: feedback })
            .eq('id', selectedReport.id);

        if (!error) {
            setShowModal(false);
            toast.success('Reviu berhasil disimpan!');
            fetchReports();
        } else {
            toast.error('Gagal menyimpan reviu: ' + error.message);
        }
        setSaving(false);
    };

    return (
        <div>
            {/* ── Header ───────────────────────────────────── */}
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Logbook Harian Mahasiswa</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Periksa dan berikan catatan terkait aktivitas harian mahasiswa bimbingan Anda.
                </p>
            </div>

            {/* Summary chips */}
            {!loading && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[
                        { icon: <User size={14} />,     label: `${studentCount} Mahasiswa`,  bg: '#E0E7FF', color: '#4338CA' },
                        { icon: <FileText size={14} />, label: `${totalReports} Logbook`,    bg: '#F0FDF4', color: '#059669' },
                        { icon: <Clock size={14} />,    label: `${pendingCount} Menunggu`,   bg: '#FEF3C7', color: '#D97706' },
                    ].map(chip => (
                        <div key={chip.label} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '5px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                            backgroundColor: chip.bg, color: chip.color
                        }}>
                            {chip.icon} {chip.label}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Filter Bar ───────────────────────────────── */}
            <div style={{
                backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '14px 16px', marginBottom: '16px',
                display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center'
            }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder="Cari nama atau NIM mahasiswa..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '8px 12px 8px 34px',
                            border: '1px solid var(--border)', borderRadius: '6px',
                            fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
                            transition: 'border-color 0.15s'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>

                {/* Status filter */}
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    style={{
                        padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px',
                        fontSize: '0.85rem', fontFamily: 'inherit', cursor: 'pointer', backgroundColor: 'white',
                        color: 'var(--text-main)', outline: 'none', minWidth: '160px'
                    }}
                >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                {/* Date filter */}
                <div style={{ position: 'relative' }}>
                    <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        style={{
                            padding: '8px 12px 8px 32px', border: '1px solid var(--border)', borderRadius: '6px',
                            fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', backgroundColor: 'white'
                        }}
                    />
                </div>

                {/* Reset */}
                {(search || filterStatus !== 'all' || filterDate) && (
                    <button
                        onClick={() => { setSearch(''); setFilterStatus('all'); setFilterDate(''); }}
                        style={{
                            padding: '8px 14px', borderRadius: '6px', fontSize: '0.82rem',
                            border: '1px solid var(--border)', background: 'white', cursor: 'pointer',
                            color: 'var(--text-muted)', whiteSpace: 'nowrap'
                        }}
                    >
                        × Reset Filter
                    </button>
                )}

                {/* Expand / Collapse all */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button onClick={expandAll} style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Buka Semua
                    </button>
                    <button onClick={collapseAll} style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Tutup Semua
                    </button>
                </div>
            </div>

            {/* ── Student Count Result ─────────────────────── */}
            {!loading && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Menampilkan <strong>{filtered.length}</strong> mahasiswa
                    {search && <> untuk pencarian "<strong>{search}</strong>"</>}
                    {filterStatus !== 'all' && <> · status <strong>{STATUS_OPTIONS.find(o => o.value === filterStatus)?.label}</strong></>}
                    {filterDate && <> · tanggal <strong>{new Date(filterDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></>}
                </p>
            )}

            {/* ── Accordion List ────────────────────────────── */}
            {loading ? (
                <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}</tbody>
                    </table>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel" style={{ backgroundColor: 'white', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <MessageSquare size={36} strokeWidth={1.2} style={{ margin: '0 auto 12px' }} />
                    <p style={{ margin: 0 }}>Tidak ada logbook yang ditemukan.</p>
                    {(search || filterStatus !== 'all' || filterDate) && (
                        <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterDate(''); }}
                            style={{ marginTop: '12px', padding: '8px 18px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                            Reset Filter
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', paddingRight: '4px' }}>
                    {filtered.map(student => {
                        const isOpen = !!expandedStudents[student.id];
                        const pending  = student.reports.filter(r => r.status === 'submitted').length;
                        const approved = student.reports.filter(r => r.status === 'approved').length;
                        const showAll  = !!showAllReports[student.id];
                        const displayedReports = showAll ? student.reports : student.reports.slice(0, PAGE_SIZE_STUDENT);

                        return (
                            <div key={student.id}
                                className="glass-panel"
                                style={{ backgroundColor: 'white', overflow: 'hidden', transition: 'box-shadow 0.15s', flexShrink: 0 }}>

                                {/* Student header row (always visible) */}
                                <button
                                    onClick={() => toggleStudent(student.id)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                                        textAlign: 'left', gap: '12px',
                                        borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                    {/* Left: avatar + name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '8px',
                                            backgroundColor: '#1b1b1f', color: 'white', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.85rem', fontWeight: 700
                                        }}>
                                            {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {student.name}
                                            </p>
                                            <span style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>NIM: {student.nim}</span>
                                        </div>
                                    </div>

                                    {/* Middle: stats */}
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                                        <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: 600, backgroundColor: '#F1F5F9', color: '#475569' }}>
                                            {student.reports.length} Logbook
                                        </span>
                                        {pending > 0 && (
                                            <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#D97706' }}>
                                                {pending} Menunggu
                                            </span>
                                        )}
                                        {approved === student.reports.length && approved > 0 && (
                                            <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: 600, backgroundColor: '#D1FAE5', color: '#059669' }}>
                                                ✓ Semua Disetujui
                                            </span>
                                        )}
                                    </div>

                                    {/* Right: chevron */}
                                    <div style={{ color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        <ChevronDown size={18} />
                                    </div>
                                </button>

                                {/* Expanded: report rows */}
                                {isOpen && (
                                    <div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                                                        {['Tanggal', 'Aktivitas', 'Project', 'Status', 'Aksi'].map(h => (
                                                            <th key={h} style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {displayedReports.map(r => (
                                                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                                            <td style={{ padding: '12px 16px', fontSize: '0.83rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                                                {new Date(r.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', fontSize: '0.85rem', maxWidth: '320px' }}>
                                                                <p style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                                                                    {r.activity}
                                                                </p>
                                                                {r.note_dosen && (
                                                                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <MessageSquare size={11} /> {r.note_dosen}
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '12px 16px' }}>
                                                                {r.project_link ? (
                                                                    <a href={r.project_link} target="_blank" rel="noopener noreferrer"
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#1A73E8', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                                                        <img src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" alt="GDrive" style={{ width: '13px', height: '13px' }} />
                                                                        Project <ExternalLink size={10} />
                                                                    </a>
                                                                ) : <span style={{ color: '#CBD5E1', fontSize: '0.78rem' }}>—</span>}
                                                            </td>
                                                            <td style={{ padding: '12px 16px' }}>
                                                                <StatusBadge status={r.status} />
                                                            </td>
                                                            <td style={{ padding: '12px 16px' }}>
                                                                <button
                                                                    onClick={() => handleOpenReview(r)}
                                                                    style={{
                                                                        padding: '5px 14px', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 600,
                                                                        border: '1px solid',
                                                                        borderColor: r.status === 'submitted' ? 'var(--primary)' : 'var(--border)',
                                                                        backgroundColor: r.status === 'submitted' ? 'var(--primary)' : 'white',
                                                                        color: r.status === 'submitted' ? 'white' : 'var(--text-muted)',
                                                                        cursor: 'pointer', whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    {r.status === 'submitted' ? 'Reviu' : 'Edit Reviu'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Show more / less */}
                                        {student.reports.length > PAGE_SIZE_STUDENT && (
                                            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', backgroundColor: '#FAFAFA', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => setShowAllReports(prev => ({ ...prev, [student.id]: !showAll }))}
                                                    style={{ fontSize: '0.82rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                                                >
                                                    {showAll
                                                        ? `▲ Sembunyikan (tampilkan ${PAGE_SIZE_STUDENT} terakhir)`
                                                        : `▼ Tampilkan semua ${student.reports.length} logbook`
                                                    }
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Review Modal ──────────────────────────────── */}
            {showModal && selectedReport && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '4px' }}>Reviu Logbook</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                            {selectedReport.users_profile?.full_name} —{' '}
                            {new Date(selectedReport.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>

                        {/* Preview aktivitas */}
                        <div style={{ backgroundColor: '#F9FAFB', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px 14px', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.7, color: 'var(--text-main)', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                            {selectedReport.activity}
                        </div>

                        <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Keputusan Status</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {[
                                        { value: 'approved', label: '✓ Setujui',       bg: '#D1FAE5', color: '#059669' },
                                        { value: 'revision', label: '✎ Minta Revisi',  bg: '#FEE2E2', color: '#DC2626' },
                                    ].map(opt => (
                                        <label key={opt.value} style={{
                                            flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                                            border: `2px solid ${statusVal === opt.value ? opt.color : 'var(--border)'}`,
                                            backgroundColor: statusVal === opt.value ? opt.bg : 'white',
                                            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s'
                                        }}>
                                            <input type="radio" value={opt.value} checked={statusVal === opt.value}
                                                onChange={e => setStatusVal(e.target.value)} style={{ accentColor: opt.color }} />
                                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: opt.color }}>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    Catatan / Feedback <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opsional)</span>
                                </label>
                                <textarea
                                    className="input-field" rows="3"
                                    value={feedback} onChange={e => setFeedback(e.target.value)}
                                    placeholder="Tambahkan catatan atau arahan untuk mahasiswa..."
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)}
                                    style={{ padding: '9px 20px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>
                                    Batal
                                </button>
                                <button type="submit" disabled={saving} className="btn-primary">
                                    {saving ? 'Menyimpan...' : 'Simpan Reviu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
