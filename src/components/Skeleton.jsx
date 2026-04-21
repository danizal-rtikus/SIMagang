import React from 'react';

/**
 * Komponen Skeleton — Blok placeholder beranimasi shimmer.
 *
 * Props:
 *  - width   : string CSS, default '100%'
 *  - height  : string CSS, default '16px'
 *  - radius  : string CSS, default '6px'
 *  - style   : object CSS tambahan
 *  - circle  : boolean — shorthand untuk radius 50%
 */
export function Skeleton({ width = '100%', height = '16px', radius = '6px', style = {}, circle = false }) {
    return (
        <div
            className="skeleton-shimmer"
            style={{
                width,
                height,
                borderRadius: circle ? '50%' : radius,
                ...style,
            }}
        />
    );
}

/** Baris skeleton untuk tabel (N kolom) */
export function SkeletonTableRow({ cols = 4 }) {
    return (
        <tr>
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} style={{ padding: '14px 16px' }}>
                    <Skeleton height="14px" width={i === 0 ? '60%' : '80%'} />
                </td>
            ))}
        </tr>
    );
}

/** Blok skeleton standar untuk card statistik */
export function SkeletonCard({ style = {} }) {
    return (
        <div className="glass-panel" style={{ padding: '24px', ...style }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                    <Skeleton height="13px" width="55%" style={{ marginBottom: '10px' }} />
                    <Skeleton height="28px" width="40%" />
                </div>
                <Skeleton circle width="44px" height="44px" />
            </div>
            <Skeleton height="11px" width="70%" />
        </div>
    );
}

/** Skeleton untuk satu baris daftar (avatar + teks) */
export function SkeletonListRow({ style = {} }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', ...style }}>
            <Skeleton circle width="40px" height="40px" />
            <div style={{ flex: 1 }}>
                <Skeleton height="13px" width="55%" style={{ marginBottom: '8px' }} />
                <Skeleton height="11px" width="35%" />
            </div>
            <Skeleton height="13px" width="60px" />
        </div>
    );
}

/** Skeleton halaman berisi judul + beberapa stat-card + tabel */
export function SkeletonPageFull({ cards = 4, rows = 6, cols = 4 }) {
    return (
        <div>
            {/* Page header */}
            <div style={{ marginBottom: '28px' }}>
                <Skeleton height="28px" width="280px" style={{ marginBottom: '10px' }} />
                <Skeleton height="14px" width="400px" />
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cards, 4)}, 1fr)`, gap: '16px', marginBottom: '24px' }}>
                {Array.from({ length: cards }).map((_, i) => <SkeletonCard key={i} />)}
            </div>

            {/* Table panel */}
            <div className="glass-panel" style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <Skeleton height="18px" width="160px" style={{ marginBottom: '8px' }} />
                    <Skeleton height="13px" width="260px" />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {Array.from({ length: rows }).map((_, i) => (
                            <SkeletonTableRow key={i} cols={cols} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** Skeleton untuk halaman dengan layout 2 kolom (mis. Map) */
export function SkeletonTwoCol({ leftHeight = '560px' }) {
    return (
        <div>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <Skeleton height="28px" width="260px" style={{ marginBottom: '10px' }} />
                    <Skeleton height="14px" width="380px" />
                </div>
                <Skeleton height="40px" width="180px" radius="8px" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '16px' }}>
                <Skeleton height={leftHeight} radius="12px" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="60px" radius="12px" />
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Skeleton circle width="10px" height="10px" />
                            <div style={{ flex: 1 }}>
                                <Skeleton height="12px" width="70%" style={{ marginBottom: '6px' }} />
                                <Skeleton height="10px" width="50%" />
                            </div>
                            <Skeleton height="20px" width="50px" radius="10px" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Skeleton;
