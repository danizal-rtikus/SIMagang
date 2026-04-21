import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Trash2, Edit3, Eye, X, ExternalLink, FileText, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton } from '../../components/Skeleton';

const PAGE_SIZE = 10;
const TYPE_OPTIONS = [
    { value: 'monthly', label: 'Laporan Bulanan' },
    { value: 'final',   label: 'Laporan Akhir' },
];

export default function AdminReportTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [page, setPage] = useState(1);
    const [viewUrl, setViewUrl] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [form, setForm] = useState({ type: 'monthly', title: '', description: '' });
    const [uploadFile, setUploadFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => { fetchTemplates(); }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('report_templates')
            .select('*')
            .order('type')
            .order('created_at', { ascending: false });
        setTemplates(data || []);
        setLoading(false);
    };

    // Filter + Pagination
    const filtered = useMemo(() =>
        filterType === 'all' ? templates : templates.filter(t => t.type === filterType),
        [templates, filterType]
    );
    const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pagedList   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleView = (tmpl) => {
        if (!tmpl.file_url) return toast.error('Tidak ada file PDF.');
        const { data } = supabase.storage.from('simagang-files').getPublicUrl(tmpl.file_url);
        setViewUrl(data.publicUrl);
    };

    const handleOpenAdd = () => {
        setEditingTemplate(null);
        setForm({ type: 'monthly', title: '', description: '' });
        setUploadFile(null);
        setShowModal(true);
    };

    const handleOpenEdit = (tmpl) => {
        setEditingTemplate(tmpl);
        setForm({ type: tmpl.type, title: tmpl.title, description: tmpl.description || '' });
        setUploadFile(null);
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading('Menyimpan template...');
        try {
            let filePath = editingTemplate?.file_url || null;

            if (uploadFile) {
                const ext  = uploadFile.name.split('.').pop();
                const path = `report_templates/${form.type}_${Date.now()}.${ext}`;
                const { error: upErr, data } = await supabase.storage
                    .from('simagang-files').upload(path, uploadFile, { upsert: true });
                if (upErr) throw upErr;
                filePath = data.path;
            }

            const payload = { ...form, file_url: filePath, updated_at: new Date().toISOString() };

            if (editingTemplate) {
                const { error } = await supabase.from('report_templates').update(payload).eq('id', editingTemplate.id);
                if (error) throw error;
                toast.success('Template diperbarui!', { id: toastId });
            } else {
                if (!uploadFile) throw new Error('Pilih file PDF terlebih dahulu.');
                const { error } = await supabase.from('report_templates').insert(payload);
                if (error) throw error;
                toast.success('Template berhasil ditambahkan!', { id: toastId });
            }

            setShowModal(false);
            fetchTemplates();
        } catch (err) {
            toast.error(err.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (tmpl) => {
        const toastId = toast.loading('Menghapus...');
        try {
            if (tmpl.file_url) {
                await supabase.storage.from('simagang-files').remove([tmpl.file_url]);
            }
            const { error } = await supabase.from('report_templates').delete().eq('id', tmpl.id);
            if (error) throw error;
            toast.success('Template dihapus.', { id: toastId });
            fetchTemplates();
        } catch (err) {
            toast.error(err.message, { id: toastId });
        } finally {
            setDeleteConfirm(null);
        }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Template Laporan</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Unggah template PDF sebagai panduan bagi Dosen dan Mahasiswa dalam menyusun laporan.</p>
                </div>
                <button onClick={handleOpenAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} /> Tambah Template
                </button>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[{ value: 'all', label: 'Semua' }, ...TYPE_OPTIONS].map(opt => (
                    <button key={opt.value} onClick={() => { setFilterType(opt.value); setPage(1); }}
                        style={{
                            padding: '8px 18px', borderRadius: '20px', border: '1px solid',
                            cursor: 'pointer', fontWeight: 500, fontSize: '0.88rem', transition: 'all 0.2s',
                            borderColor: filterType === opt.value ? 'var(--primary)' : 'var(--border)',
                            backgroundColor: filterType === opt.value ? 'var(--primary)' : 'white',
                            color: filterType === opt.value ? 'white' : 'var(--text-muted)',
                        }}>
                        {opt.label}
                    </button>
                ))}
                <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {filtered.length} template
                </span>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                {loading ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>{Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}><td colSpan={5} style={{ padding: '14px 16px' }}><Skeleton height="14px" /></td></tr>
                        ))}</tbody>
                    </table>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <BookOpen size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px' }} />
                        <p style={{ margin: 0 }}>Belum ada template yang ditambahkan.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                                        {['Judul Template', 'Jenis', 'Deskripsi', 'File', 'Aksi'].map(h => (
                                            <th key={h} style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedList.map(tmpl => (
                                        <tr key={tmpl.id} style={{ borderBottom: '1px solid var(--border)' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '36px', height: '36px', backgroundColor: '#E0E7FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <FileText size={18} color="var(--primary)" />
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tmpl.title}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                                                    backgroundColor: tmpl.type === 'monthly' ? '#E0E7FF' : '#D1FAE5',
                                                    color: tmpl.type === 'monthly' ? '#4F46E5' : '#059669',
                                                }}>
                                                    {tmpl.type === 'monthly' ? 'Laporan Bulanan' : 'Laporan Akhir'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {tmpl.description || '—'}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                {tmpl.file_url ? (
                                                    <button onClick={() => handleView(tmpl)} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}>
                                                        <Eye size={15} /> Lihat
                                                    </button>
                                                ) : <span style={{ color: '#CBD5E1', fontSize: '0.82rem' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => handleOpenEdit(tmpl)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                                                        <Edit3 size={14} /> Edit
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(tmpl)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #FEE2E2', background: '#FFF5F5', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                                                        <Trash2 size={14} /> Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filtered.length > PAGE_SIZE && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', backgroundColor: '#FAFAFA' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} dari {filtered.length}
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ width:'32px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',background:page===1?'#F8FAFC':'white',cursor:page===1?'not-allowed':'pointer',color:page===1?'#CBD5E1':'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronLeft size={16}/></button>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={{ width:'32px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',background:page===totalPages?'#F8FAFC':'white',cursor:page===totalPages?'not-allowed':'pointer',color:page===totalPages?'#CBD5E1':'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronRight size={16}/></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* PDF Viewer */}
            {viewUrl && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 60, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: '#1E293B', color: 'white' }}>
                        <span style={{ fontWeight: 600 }}>📄 Pratinjau Template Laporan</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <a href={viewUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93C5FD', fontSize: '0.85rem', textDecoration: 'none' }}>
                                <ExternalLink size={15} /> Buka di Tab Baru
                            </a>
                            <button onClick={() => setViewUrl(null)} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={20} /> Tutup
                            </button>
                        </div>
                    </div>
                    <iframe src={viewUrl} style={{ flex: 1, border: 'none', backgroundColor: 'white' }} title="Template PDF" />
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '32px' }}>
                        <h2 style={{ marginBottom: '20px' }}>{editingTemplate ? 'Edit Template' : 'Tambah Template Laporan'}</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Jenis Laporan</label>
                                <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Judul Template</label>
                                <input type="text" className="input-field" required value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Contoh: Template Laporan Bulanan Batch 2025" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Deskripsi (Opsional)</label>
                                <textarea className="input-field" rows={3} value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Keterangan singkat tentang isi atau penggunaan template ini..." />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                                    File PDF {editingTemplate && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(kosongkan jika tidak diubah)</span>}
                                </label>
                                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setUploadFile(e.target.files?.[0] || null)}
                                    className="input-field" required={!editingTemplate} style={{ padding: '8px' }} />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Format: PDF, DOC, DOCX</p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>Batal</button>
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan Template'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '32px', textAlign: 'center' }}>
                        <Trash2 size={40} color="#EF4444" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ marginBottom: '8px' }}>Hapus Template?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>"{deleteConfirm.title}"</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>File akan dihapus permanen dari storage.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>Batal</button>
                            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '10px 24px', borderRadius: '8px', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
