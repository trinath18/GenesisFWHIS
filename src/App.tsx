import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireScreen } from './auth/RequireAuth'
import { AppShell } from './layout/AppShell'
import { ForbiddenPage, HomePage } from './features/home/HomePage'
import { HospitalsPage } from './features/hospitals/HospitalsPage'
import { LoginPage } from './features/login/LoginPage'
import { TrackingPage } from './features/tracking/TrackingPage'
import { CaseInquiryPage } from './features/cases/CaseInquiryPage'
import { EnquiryPage } from './features/membership/EnquiryPage'
import { navigation } from './config/navigation'

const byPath = Object.fromEntries(navigation.map((n) => [n.path, n.position]))

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="tracking/:id" element={<TrackingPage />} />
          <Route path="forbidden" element={<ForbiddenPage />} />
          <Route element={<RequireScreen position={byPath['/membership/enquiry']} />}>
            <Route path="membership/enquiry" element={<EnquiryPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/cases/inquiry']} />}>
            <Route path="cases/inquiry" element={<CaseInquiryPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/hospitals']} />}>
            <Route path="hospitals" element={<HospitalsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}



