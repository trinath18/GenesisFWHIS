import { describe, expect, it } from 'vitest'
import { computeInvoice, procedureTotals, type InvoiceField } from './invoices'

describe('procedureTotals', () => {
  it('adds up the actual fees the procedure entry puts into the invoice', () => {
    const t = procedureTotals({
      attendingDoctors: [], anaesthetists: [], medicalManagement: [], investigations: [],
      surgical: [{ text: 'A', code: '25130', actualFee: 1500.1, actualAnaesFee: 300 }, { text: null, code: null, actualFee: null, actualAnaesFee: null }, { text: 'B', code: null, actualFee: 99.95 }],
      nonSurgical: [{ text: 'SCOPE', code: '64302', actualFee: 800 }],
    })
    expect(t).toEqual({ surgeon: 1600.05, anaesthetist: 300, nonSurgical: 800 })
  })
})

describe('computeInvoice', () => {
  it('works out the accident total from accident and post-treatment (legacy A11)', () => {
    const f = (key: string, kind: InvoiceField['kind'], inTotal = false): InvoiceField => ({ key, table: 'Actual', column: key, label: key, group: 'g', kind, inTotal })
    const keys = ['boardDays', 'roomRate', 'roomTax', 'icuDays', 'icuRate', 'icuTax', 'preXray', 'preLab', 'preOthers', 'surgeonFee', 'surgeonPhysician', 'surgeonPost', 'surgeonWard',
      'anaesFee', 'anaesConsultation', 'anaesWard', 'nsPreXray', 'nsPreLab', 'nsPreOthers', 'physicianFee', 'physicianWard', 'procedureFee', 'guardianDays', 'guardianRate', 'guardianTax',
      'rbTaxOld', 'icuTaxOld', 'lodgerTaxOld', 'cashDays', 'cashRate', 'accidentEmergency', 'accidentPostTreatment']
    const r = computeInvoice([...keys.map((k) => f(k, 'Amount')), f('accidentPostAmount', 'Computed', true)], { accidentEmergency: 120, accidentPostTreatment: 30.5 })
    expect(r.amounts.accidentPostAmount).toBe(150.5)
    expect(r.total).toBe(150.5)
  })
})
