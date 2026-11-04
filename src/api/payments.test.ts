import { describe, expect, it } from 'vitest'
import { defaultPayee, defaultPaying, paymentStatusLabel, statusLabel, type HospitalPaymentLine, type PayorReceiptLine } from './payments'

const line = (over: Partial<PayorReceiptLine>): PayorReceiptLine => ({
  caseNumber: 'ZZ1', version: 1, bordxNo: null, payor: 'ZZ', claimId: null, amount: 1000, received: 0, totalReceived: 0, outstanding: 1000, status: null, receiptNo: null, receiptDate: null,
  receiptAmount: null, accountMonth: null, accountYear: null, receiptRemark: null, pvNo: null, pvDate: null, chequeNo: null, chequeNoMr: null, payChequeDate: null, bank: null, bankCharge: null,
  contraCase: null, contraVersion: null, contraAmount: null, gainLoss: null, misc: null, discount: null, writeOff: null, medixReceipt: null, caseRemark: null, claimDate: null, bordxDate: null,
  chequeSentDate: null, courierNo: null, ...over,
})

describe('payor receipt ticking', () => {
  it('pays what is outstanding, or the whole amount again on a paid claim', () => {
    expect(defaultPaying(line({ outstanding: 400, totalReceived: 600, status: 'P' }))).toBe(400)
    expect(defaultPaying(line({ outstanding: 0, totalReceived: 1000, status: 'F' }))).toBe(1000)
  })
  it('shows Full when this and earlier receipts cover the claim', () => {
    expect(statusLabel(line({ totalReceived: 600 }), 400)).toBe('Full')
    expect(statusLabel(line({ totalReceived: 600 }), 300)).toBe('Partial')
    expect(statusLabel(line({ status: 'P', receiptNo: 'RF1' }), null)).toBe('Partial')
    expect(statusLabel(line({ status: 'F', receiptNo: 'RF1' }), null)).toBe('Full')
    expect(statusLabel(line({}), null)).toBe('')
  })
})

describe('hospital payments', () => {
  it('labels the status and picks the payee as the legacy form', () => {
    expect([paymentStatusLabel('F'), paymentStatusLabel('P'), paymentStatusLabel(null)]).toEqual(['Full', 'Partial', ''])
    expect(defaultPayee({ payee: null, hospitalPayee: 'HOSP' } as HospitalPaymentLine)).toBe('HOSP')
    expect(defaultPayee({ payee: 'SAVED', hospitalPayee: 'HOSP' } as HospitalPaymentLine)).toBe('SAVED')
  })
})
