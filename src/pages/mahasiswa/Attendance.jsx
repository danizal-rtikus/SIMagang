import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Camera, MapPin, UploadCloud, CheckCircle, RefreshCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Attendance() {
    const { userProfile } = useOutletContext();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Info, 2: Camera, 3: Success
    const [attendanceType, setAttendanceType] = useState('in'); // 'in' or 'out'
    const [location, setLocation] = useState(null);
    const [photoData, setPhotoData] = useState(null);

    const [hasAttendedIn, setHasAttendedIn] = useState(false);
    const [hasAttendedOut, setHasAttendedOut] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (userProfile?.id) {
            checkTodayAttendance();
        }

        // Stop camera when unmounting
        return () => {
            stopCamera();
        };
    }, [userProfile]);

    const checkTodayAttendance = async () => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('attendances')
            .select('type')
            .eq('student_id', userProfile.id)
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString());

        if (data && !error) {
            setHasAttendedIn(data.some(d => d.type === 'in'));
            setHasAttendedOut(data.some(d => d.type === 'out'));
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }, audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
        } catch (err) {
            toast.error("Gagal mengakses kamera: " + err.message);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    const handleStartAttendance = (type) => {
        setAttendanceType(type);
        setStep(2);
        startCamera();

        // Get Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => {
                    toast.error("Gagal mendapatkan lokasi. Pastikan GPS aktif.\n" + err.message);
                },
                { enableHighAccuracy: true }
            );
        } else {
            toast.error("Geolocation tidak didukung browser ini.");
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            // Set canvas dimensions identical to video
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
            setPhotoData(dataUrl);
            stopCamera();
        }
    };

    const retakePhoto = () => {
        setPhotoData(null);
        startCamera();
    };

    const handleSubmit = async () => {
        if (!photoData || !location) {
            toast.error("Foto dan lokasi wajib ada!");
            return;
        }

        setLoading(true);

        try {
            // 1. Convert base64 to Blob for upload
            const res = await fetch(photoData);
            const blob = await res.blob();

            const fileName = `attendance/${userProfile.id}/${Date.now()}_${attendanceType}.jpg`;

            // 2. Upload to storage bucket "simagang-files"
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('simagang-files')
                .upload(fileName, blob, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: urlData } = supabase.storage
                .from('simagang-files')
                .getPublicUrl(fileName);

            const photoUrl = urlData.publicUrl;

            // 4. Insert into attendances table
            const { error: insertError } = await supabase
                .from('attendances')
                .insert([{
                    student_id: userProfile.id,
                    type: attendanceType,
                    photo_url: photoUrl,
                    latitude: location.lat,
                    longitude: location.lng
                }]);

            if (insertError) throw insertError;

            setStep(3); // Go to success page
            checkTodayAttendance(); // Memuat ulang status presensi
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Presensi Harian</h1>
                <p style={{ color: 'var(--text-muted)' }}>Lakukan rekam kehadiran masuk dan keluar menggunakan foto selfie dan lokasi.</p>
            </div>

            <div className="glass-panel" style={{ backgroundColor: 'white', padding: '32px', maxWidth: '600px', margin: '0 auto' }}>

                {step === 1 && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 24px',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <MapPin size={40} />
                        </div>
                        <h2 style={{ marginBottom: '16px' }}>Mulai Presensi</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                            Pilih tipe presensi. Browser Anda akan meminta izin akses Kamera dan Lokasi (GPS).
                        </p>

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            <button
                                onClick={() => handleStartAttendance('in')}
                                disabled={hasAttendedIn}
                                className={hasAttendedIn ? "input-field" : "btn-primary"}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', width: 'auto', opacity: hasAttendedIn ? 0.6 : 1, cursor: hasAttendedIn ? 'not-allowed' : 'pointer' }}
                            >
                                {hasAttendedIn ? <CheckCircle size={18} color="#10B981" /> : <Camera size={18} />} 
                                Absen Masuk
                            </button>
                            <button
                                onClick={() => handleStartAttendance('out')}
                                disabled={hasAttendedOut || !hasAttendedIn} // Hanya bisa keluar setelah masuk
                                className={hasAttendedOut || !hasAttendedIn ? "input-field" : "btn-primary"}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', width: 'auto', 
                                    backgroundColor: (!hasAttendedOut && hasAttendedIn) ? '#F59E0B' : undefined, 
                                    color: (!hasAttendedOut && hasAttendedIn) ? 'white' : undefined,
                                    border: (!hasAttendedOut && hasAttendedIn) ? 'none' : undefined,
                                    boxShadow: 'none',
                                    opacity: (hasAttendedOut || !hasAttendedIn) ? 0.6 : 1,
                                    cursor: (hasAttendedOut || !hasAttendedIn) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {hasAttendedOut ? <CheckCircle size={18} color="#10B981" /> : <Camera size={18} />} 
                                Absen Keluar
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>{attendanceType === 'in' ? 'Absen Masuk' : 'Absen Keluar'}</h3>
                            <span className="badge" style={{ padding: '4px 12px', backgroundColor: '#E0E7FF', color: '#4F46E5', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                                {location ? '📍 Lokasi Didapat' : '⌛ Mencari Lokasi...'}
                            </span>
                        </div>

                        <div style={{
                            width: '100%', height: '350px', backgroundColor: '#1E293B', borderRadius: '12px',
                            overflow: 'hidden', position: 'relative', marginBottom: '24px'
                        }}>
                            {!photoData ? (
                                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <img src={photoData} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            {/* Hidden canvas for capturing */}
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                            {!photoData ? (
                                <button onClick={capturePhoto} className="btn-primary" style={{ padding: '12px 32px' }}>
                                    📸 Ambil Foto
                                </button>
                            ) : (
                                <>
                                    <button onClick={retakePhoto} className="input-field" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <RefreshCcw size={18} /> Ulangi
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || !location}
                                        className="btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        {loading ? 'Mengunggah...' : <><UploadCloud size={18} /> Kirim Presensi</>}
                                    </button>
                                </>
                            )}
                        </div>
                        {!location && <p style={{ textAlign: 'center', color: '#EF4444', fontSize: '0.85rem', marginTop: '16px' }}>Tunggu hingga lokasi GPS Anda ditemukan.</p>}
                    </div>
                )}

                {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ color: '#10B981', marginBottom: '16px' }}>
                            <CheckCircle size={64} style={{ margin: '0 auto' }} />
                        </div>
                        <h2 style={{ marginBottom: '8px' }}>Presensi Berhasil!</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                            Data presensi {attendanceType === 'in' ? 'masuk' : 'keluar'} Anda telah terekam beserta titik lokasinya.
                        </p>
                        <button onClick={() => setStep(1)} className="btn-primary">
                            Kembali
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
