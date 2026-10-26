import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireScreen } from './auth/RequireAuth'
import { AppShell } from './layout/AppShell'
import { ForbiddenPage, HomePage } from './features/home/HomePage'
import { HospitalsPage } from './features/hospitals/HospitalsPage'
import { LoginPage } from './features/login/LoginPage'
import { SummaryPage } from './features/tracking/SummaryPage'
import { TrackingPage } from './features/tracking/TrackingPage'
import { CaseInquiryPage } from './features/cases/CaseInquiryPage'
import { LookupPage } from './features/maintenance/LookupPage'
import { PanelHospitalsPage } from './features/maintenance/PanelHospitalsPage'
import { SuspensionsPage } from './features/maintenance/SuspensionsPage'
import { ValidDatesPage } from './features/maintenance/ValidDatesPage'
import { CardSendingPage } from './features/membership/CardSendingPage'
import { EnquiryPage } from './features/membership/EnquiryPage'
import { MemberDeletionPage } from './features/membership/MemberDeletionPage'
import { AdjustmentPage } from './features/membership/AdjustmentPage'
import { McoPendingPage } from './features/membership/McoPendingPage'
import { ReinstatementPage } from './features/membership/ReinstatementPage'
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
          <Route path="summary/:id" element={<SummaryPage />} />
          <Route path="lookups/:id" element={<LookupPage />} />
          <Route path="forbidden" element={<ForbiddenPage />} />
          <Route element={<RequireScreen position={byPath['/membership/enquiry']} />}>
            <Route path="membership/enquiry" element={<EnquiryPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/cases/inquiry']} />}>
            <Route path="cases/inquiry" element={<CaseInquiryPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/maintenance/panel-hospitals']} />}>
            <Route path="maintenance/panel-hospitals" element={<PanelHospitalsPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/maintenance/valid-dates']} />}>
            <Route path="maintenance/valid-dates" element={<ValidDatesPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/maintenance/suspensions']} />}>
            <Route path="maintenance/suspensions" element={<SuspensionsPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/membership/card-sending']} />}>
            <Route path="membership/card-sending" element={<CardSendingPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/membership/mco-pending']} />}>
            <Route path="membership/mco-pending" element={<McoPendingPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/membership/deletion']} />}>
            <Route path="membership/deletion" element={<MemberDeletionPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/membership/reinstatement']} />}>
            <Route path="membership/reinstatement" element={<ReinstatementPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/membership/adjustment']} />}>
            <Route path="membership/adjustment" element={<AdjustmentPage />} />
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












