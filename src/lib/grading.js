// Helper Utility Penilaian Magang & Konversi Grading

/**
 * Konversi jumlah nilai raw (skala 1-5 per butir) ke Nilai Angka (45 - 100)
 */
export function convertToFinalScore(rawSum, totalButir) {
    if (!totalButir || rawSum === 0) return 0;
    const minRaw = totalButir;      // semua nilai = 1
    const maxRaw = totalButir * 5;  // semua nilai = 5
    if (maxRaw === minRaw) return 100;
    return Math.round(((rawSum - minRaw) / (maxRaw - minRaw)) * (100 - 45) + 45);
}

/**
 * Konversi Nilai Angka (0 - 100) ke Nilai Huruf & Keterangan (5 Skala atau 8 Skala)
 */
export function getGrade(score, scaleType = '5') {
    const numScore = Number(score) || 0;
    if (scaleType === '8') {
        if (numScore >= 80) return { label: 'A',  desc: 'Istimewa',     color: '#059669', bg: '#D1FAE5' };
        if (numScore >= 75) return { label: 'AB', desc: 'Baik Sekali',  color: '#10B981', bg: '#D1FAE5' };
        if (numScore >= 70) return { label: 'B',  desc: 'Baik',         color: '#2563EB', bg: '#DBEAFE' };
        if (numScore >= 65) return { label: 'BC', desc: 'Cukup Baik',   color: '#3B82F6', bg: '#DBEAFE' };
        if (numScore >= 60) return { label: 'C',  desc: 'Cukup',        color: '#D97706', bg: '#FEF3C7' };
        if (numScore >= 55) return { label: 'CD', desc: 'Kurang Cukup', color: '#F59E0B', bg: '#FEF3C7' };
        if (numScore >= 45) return { label: 'D',  desc: 'Kurang',       color: '#EF4444', bg: '#FEE2E2' };
        return                     { label: 'E',  desc: 'Tidak Lulus',  color: '#DC2626', bg: '#FEE2E2' };
    } else {
        // Default: 5 Skala
        if (numScore >= 80) return { label: 'A',  desc: 'Sangat Baik',  color: '#059669', bg: '#D1FAE5' };
        if (numScore >= 65) return { label: 'B',  desc: 'Baik',         color: '#2563EB', bg: '#DBEAFE' };
        if (numScore >= 55) return { label: 'C',  desc: 'Cukup',        color: '#D97706', bg: '#FEF3C7' };
        if (numScore >= 45) return { label: 'D',  desc: 'Kurang',       color: '#EF4444', bg: '#FEE2E2' };
        return                     { label: 'E',  desc: 'Tidak Lulus',  color: '#DC2626', bg: '#FEE2E2' };
    }
}
