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
import { RegistrationPage } from './features/membership/RegistrationPage'
import { BenefitEntryPage } from './features/maintenance/BenefitEntryPage'
import { BenefitListingPage } from './features/maintenance/BenefitListingPage'
import { IcdSelectionPage } from './features/maintenance/IcdSelectionPage'
import { McoRefundListingPage } from './features/membership/McoRefundListingPage'
import { FwhsInvoicePage } from './features/membership/FwhsInvoicePage'
import { McoManualInvoicePage } from './features/membership/McoManualInvoicePage'
import { McoCorrectionPage } from './features/membership/McoCorrectionPage'
import { McoReceiptPage } from './features/membership/McoReceiptPage'
import { McoReinstatementPage } from './features/membership/McoReinstatementPage'
import { CaseRegistrationPage } from './features/cases/CaseRegistrationPage'
import { CaseTransferPage } from './features/cases/CaseTransferPage'
import { CasePayClaimPage } from './features/cases/CasePayClaimPage'
import { McoDateCorrectionPage } from './features/membership/McoDateCorrectionPage'
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
          <Route element={<RequireScreen position={byPath['/membership/registration']} />}>
            <Route path="membership/registration" element={<RegistrationPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/maintenance/benefit-entry']} />}>
            <Route path="maintenance/benefit-entry" element={<BenefitEntryPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/maintenance/benefit-listing']} />}>
            <Route path="maintenance/benefit-listing" element={<BenefitListingPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/maintenance/icd-selection']} />}>
            <Route path="maintenance/icd-selection" element={<IcdSelectionPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/refund-listing']} />}>
            <Route path="mco/refund-listing" element={<McoRefundListingPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/fwhs-invoice']} />}>
            <Route path="mco/fwhs-invoice" element={<FwhsInvoicePage tax="none" />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/fwhs-invoice-gst']} />}>
            <Route path="mco/fwhs-invoice-gst" element={<FwhsInvoicePage tax="gst" />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/fwhs-invoice-sst']} />}>
            <Route path="mco/fwhs-invoice-sst" element={<FwhsInvoicePage tax="sst" />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/manual-invoice']} />}>
            <Route path="mco/manual-invoice" element={<McoManualInvoicePage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/correction']} />}>
            <Route path="mco/correction" element={<McoCorrectionPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/receipt']} />}>
            <Route path="mco/receipt" element={<McoReceiptPage manual={false} />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/receipt-manual']} />}>
            <Route path="mco/receipt-manual" element={<McoReceiptPage manual />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/reinstatement']} />}>
            <Route path="mco/reinstatement" element={<McoReinstatementPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/mco/date-correction']} />}>
            <Route path="mco/date-correction" element={<McoDateCorrectionPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/cases/registration']} />}>
            <Route path="cases/registration" element={<CaseRegistrationPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/cases/adjustment']} />}>
            <Route path="cases/adjustment" element={<CaseRegistrationPage mode="adjust" />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/cases/transfer']} />}>
            <Route path="cases/transfer" element={<CaseTransferPage />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/cases/temp-transfer']} />}>
            <Route path="cases/temp-transfer" element={<CaseTransferPage temporary />} />
          </Route>
          <Route element={<RequireScreen position={byPath['/cases/payclaim']} />}>
            <Route path="cases/payclaim" element={<CasePayClaimPage />} />
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
























