import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Internships from './pages/Internships';
import Logbooks from './pages/Logbooks';

// Import Mahasiswa Components
import Attendance from './pages/mahasiswa/Attendance';
import MhsDailyReports from './pages/mahasiswa/DailyReports';
import MhsMonthlyReports from './pages/mahasiswa/MonthlyReports';
import MhsFinalReports from './pages/mahasiswa/FinalReports';

// Import Admin Components
import ManajemenUser from './pages/admin/ManajemenUser';
import ManajemenMitra from './pages/admin/ManajemenMitra';
import AdminMap from './pages/admin/MapGlobal';
import PlottingMagang from './pages/admin/PlottingMagang';

// Import Dosen Components
import DosenDailyReports from './pages/dosen/DailyReports';
import DosenMonthlyReports from './pages/dosen/MonthlyReports';
import DosenFinalReports from './pages/dosen/FinalReports';
import DosenMap from './pages/dosen/MapBimbingan';

// Admin Placeholders
// (Sudah diimport di atas)

// Dosen Placeholders
// (Sudah diimport di atas)

// Mahasiswa Placeholders
// (Sudah diimport di atas)

// Konfigurasi NProgress
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

function TopLoadingBar() {
  const location = useLocation();

  React.useEffect(() => {
    NProgress.start();
    // Beri sedikit delay untuk simulasi transisi yang smooth sebelum di selesaikan
    const timer = setTimeout(() => {
      NProgress.done();
    }, 300);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [location]);

  return null;
}

function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <BrowserRouter>
        <TopLoadingBar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />

          {/* Menu Admin */}
          <Route path="admin/users" element={<ManajemenUser />} />
          <Route path="admin/partners" element={<ManajemenMitra />} />
          <Route path="admin/map" element={<AdminMap />} />
          <Route path="admin/plotting" element={<PlottingMagang />} />

          {/* Menu Dosen */}
          <Route path="dosen/daily-reports" element={<DosenDailyReports />} />
          <Route path="dosen/monthly-reports" element={<DosenMonthlyReports />} />
          <Route path="dosen/final-reports" element={<DosenFinalReports />} />
          <Route path="dosen/map" element={<DosenMap />} />

          {/* Menu Mahasiswa */}
          <Route path="mahasiswa/attendance" element={<Attendance />} />
          <Route path="mahasiswa/daily-reports" element={<MhsDailyReports />} />
          <Route path="mahasiswa/monthly-reports" element={<MhsMonthlyReports />} />
          <Route path="mahasiswa/final-reports" element={<MhsFinalReports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default App;
