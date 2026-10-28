# Generates src/config/menuTree.ts from the legacy menu inventory (genesis-api/docs/inventory/menu_map.csv).
# Legacy groups, sub-menus, captions and order are kept; migrated screens get their new route, everything else stays as a "not migrated yet" entry.
$csv = Join-Path $PSScriptRoot '..\..\genesis-api\docs\inventory\menu_map.csv'
$out = Join-Path $PSScriptRoot '..\src\config\menuTree.ts'
function Norm([string]$s) { ($s -replace '\s+', ' ').Trim() }
function Pos([string]$s) { if ([string]::IsNullOrWhiteSpace($s)) { @() } else { @($s -split ';' | % { [int]$_ }) } }

# legacy path -> new route (and the position(s) that enable it when they differ from the legacy list)
$routes = @{
  'Membership > Registration'='/membership/registration'; 'MCOFees > Refund Listing'='/mco/refund-listing'; 'MCOFees > Receipt MCO/Others'='/mco/receipt'; 'MCOFees > Receipt MCO/Others (Manual)'='/mco/receipt-manual'; 'MCOFees > MCO Correction'='/mco/correction'; 'MCOFees > Invoice Manual Upd'='/mco/manual-invoice'; 'MCOFees > MCO Inv/Listing'='/mco/fwhs-invoice'; 'MCOFees > MCO Inv/Listing GST'='/mco/fwhs-invoice-gst'; 'MCOFees > MCO Inv/Listing SST'='/mco/fwhs-invoice-sst'; 'Membership > Adjustment'='/membership/adjustment'; 'Membership > Enquiry'='/membership/enquiry'; 'Membership > Card Sending Mode'='/membership/card-sending'
  'Membership > Member Reinstatement'='/membership/reinstatement'; 'Membership > MCO Pending'='/membership/mco-pending'; 'Membership > Deletion'='/membership/deletion'
  'Membership > Tracking'='/tracking/member-tracking'
  'Case > Case Inquiry'='/cases/inquiry'; 'Case > Panel Hospitals'='/tracking/panel-hospitals'; 'Case > Audit Review Tracking'='/tracking/audit-review'
  'Case > Case Tracking'='/tracking/case-tracking'; 'Case > MMA/CPT'='/tracking/mma-schedule'; 'Case > LG Tracking'='/tracking/lg-tracking'
  'Invoice > Invoice Tracking'='/tracking/invoice-tracking'; 'Invoice > Main DCN Checking'='/tracking/main-dcn'
  'Worksheet > Worksheet Tracking'='/tracking/worksheet-tracking'
  'Claim > Claim Tracking (Sat.) > Claim Report 1'='/summary/claim-summary'; 'Claim > Claim Tracking (Sat.) > Claim Report (Simple)'='/tracking/claim-report'
  'Claim > DCU Tracking > Claim Report'='/tracking/dcu-report'
  'Claim Bordx > Print Bordx'='/tracking/print-bordx'; 'Claim Bordx > Print Recovery'='/tracking/recovery-report'
  'Claim Bordx > Monitoring > Outstanding Bordx'='/tracking/outstanding-bordx'; 'Claim Bordx > Monitoring > Bordx Worksheet'='/tracking/bordx-worksheet'
  'Claim Bordx > Storage > Enquiry'='/tracking/storage-enquiry'; 'Claim Bordx > Storage > Repudiated Enquiry'='/tracking/storage-repudiated'; 'Claim Bordx > Storage > Monthly DN Report'='/tracking/monthly-dn'
  'Payment > Payment Tracking'='/tracking/payment-tracking'; 'Payment > Enquiry > Payment To Hospital'='/tracking/payment-hospital'; 'Payment > Enquiry > Payment To Member'='/tracking/payment-member'
  'Maintenance > Date'='/maintenance/valid-dates'; 'Maintenance > Panel Hospital Maintenance'='/maintenance/panel-hospitals'; 'Maintenance > Security > Department'='/lookups/department'
}
$positionOverride = @{ 'Case > Case Inquiry' = @(13) }

# legacy entries that became several new screens: path -> children
function Leaf($label, $route, $pos) { [ordered]@{ label = $label; route = $route; positions = @($pos) } }
$groups = @{
  'Claim > Claim Tracking (Sat.) > Claim Report 2' = @((Leaf 'Actual' '/summary/claim-cost-actual' 45), (Leaf 'Approved' '/summary/claim-cost-approved' 45), (Leaf 'Hospital' '/summary/claim-cost-hospital' 45), (Leaf 'Member' '/summary/claim-cost-member' 45))
  'Claim Bordx > Monitoring > Bordx Control' = @((Leaf 'Normal' '/tracking/bordx-control' 40), (Leaf 'Supplementary' '/tracking/bordx-control-supp' 40))
  'Claim Bordx > Bor Tracking' = @((Leaf 'Bordx Tracking' '/tracking/bordx-tracking' 43), (Leaf 'Hospital Invoices Not Yet on Bordx' '/summary/hospital-invoices-not-bordx' 43), (Leaf 'Member Invoices Not Yet on Bordx' '/summary/payor-invoices-not-bordx' 43))
  'Receipt > Receipt Tracking' = @((Leaf 'From Member' '/tracking/receipt-member' 63), (Leaf 'From Payor' '/tracking/receipt-payor' 63), (Leaf 'From MNRB' '/tracking/receipt-mnrb' 63))
  'Maintenance > Suspension' = @((Leaf 'Suspension' '/maintenance/suspensions' 110), (Leaf 'Suspension Category' '/lookups/suspension-category' 110))
  'Maintenance > MMA' = @((Leaf 'Procedures' '/lookups/mma-procedure' 147), (Leaf 'Fees' '/lookups/mma-fee' 147))
  'Maintenance > Plan' = @((Leaf 'Health Type' '/lookups/plan-health' 80), (Leaf 'Insured Type' '/lookups/plan-insured' 81), (Leaf 'Plan Code / Special Note' '/lookups/plan-code' 82), (Leaf 'Premium' '/lookups/plan-premium' 83), (Leaf 'Annual Limit' '/lookups/plan-annual-limit' 84), (Leaf 'MCO Fee' '/lookups/plan-mco-fee' 85), (Leaf 'Annual Limit (Benefit)' '/lookups/plan-benefit-limit' 84), (Leaf 'Product Category' '/lookups/plan-product-category' 82), (Leaf 'Supp. MCO Status' '/lookups/plan-supp-mco-status' 85), (Leaf 'Case Mgmt. Fee' '/lookups/plan-case-mgmt-fee' 85))
  'Maintenance > Case' = @((Leaf 'ICD Selection' '/maintenance/icd-selection' 90), (Leaf 'ICD Maintenance' '/lookups/case-icd' 91), (Leaf 'ICD Category' '/lookups/case-icd-category' 92), (Leaf 'Repudiation Code' '/lookups/case-repudiation-code' 93), (Leaf 'Repudiation Category' '/lookups/case-repudiation-category' 94), (Leaf 'Nature of Claim' '/lookups/case-claim-nature' 95), (Leaf 'Treatment Modality' '/lookups/case-treatment-modality' 96), (Leaf 'Hospitalisation Type' '/lookups/case-hospitalisation-type' 97))
  'Maintenance > Benefits' = @((Leaf 'Category' '/lookups/benefit-category' 86), (Leaf 'Sub Category' '/lookups/benefit-subcategory' 87), (Leaf 'Benefit Entry' '/maintenance/benefit-entry' 88), (Leaf 'Benefits Listing' '/maintenance/benefit-listing' 89))
  'Maintenance > Member' = @((Leaf 'Occupation' '/lookups/member-occupation' 99), (Leaf 'Relationship' '/lookups/member-relationship' 100), (Leaf 'Nationality' '/lookups/member-nationality' 101), (Leaf 'Race' '/lookups/member-race' 102), (Leaf 'Language' '/lookups/member-language' 103), (Leaf 'City' '/lookups/member-city' 104), (Leaf 'State' '/lookups/member-state' 105), (Leaf 'Work Nature' '/lookups/member-work-nature' 106), (Leaf 'Endorsement Status' '/lookups/member-endorsement-status' 107), (Leaf 'Policy Status' '/lookups/member-policy-status' 108), (Leaf 'CPT Codes' '/lookups/member-cpt' 98), (Leaf 'Receipt Type' '/lookups/member-receipt-type' 98))
}
# extra new screens added next to a migrated legacy entry
$extras = @{ 'Claim > DCU Tracking' = @((Leaf 'Claim Summary' '/summary/dcu-summary' 155)) }
$skipTop = @('File', 'View', 'Window')

$roots = New-Object System.Collections.ArrayList
$stack = @{}
foreach ($r in Import-Csv $csv) {
  $level = [int]$r.level; $label = Norm $r.caption; $path = Norm $r.path
  if ($level -eq 1 -and $skipTop -contains $label) { $stack[1] = $null; $skip = $true } elseif ($level -eq 1) { $skip = $false }
  if ($skip -or $label -eq '-') { continue }
  $node = [ordered]@{ label = $label; path = $path; form = $r.opens; positions = (Pos $r.access_position); children = New-Object System.Collections.ArrayList }
  if ($level -eq 1) { [void]$roots.Add($node) } else { [void]$stack[$level - 1].children.Add($node) }
  $stack[$level] = $node
}

function Build($n) {
  $kids = @($n.children | % { Build $_ } | ? { $_ })
  $path = $n.path
  if ($groups.ContainsKey($path)) { return [ordered]@{ label = $n.label; children = @($groups[$path]) } }
  $o = [ordered]@{ label = $n.label }
  if ($routes.ContainsKey($path)) {
    $o.route = $routes[$path]
    $o.positions = if ($positionOverride.ContainsKey($path)) { $positionOverride[$path] } else { @($n.positions) }
    if ($extras.ContainsKey($path)) { return [ordered]@{ label = $n.label; children = @(@($o) + @($extras[$path])) } }
    return $o
  }
  if ($extras.ContainsKey($path)) { $kids = @($kids) + @($extras[$path]) }
  if ($kids.Count -gt 0) { $o.children = @($kids); return $o }
  if ($n.form -or $n.positions.Count -gt 0) { $o.positions = @($n.positions); $o.legacyForm = $n.form; return $o }
  return $null   # menu stubs without a form or permission
}
$tree = @($roots | % { Build $_ } | ? { $_ })
$json = $tree | ConvertTo-Json -Depth 12
$header = "// GENERATED by tools/build-menu.ps1 from the legacy menu (mdiMain) - do not edit by hand.`n// Entries with a route are migrated; the others are legacy items shown only when `"Show legacy items`" is on.`nimport type { MenuNode } from './menu'`n`nexport const menuTree: MenuNode[] = "
Set-Content $out ($header + $json + "`n") -Encoding UTF8
"nodes: $($tree.Count) top-level; routed leaves: " + ([regex]::Matches($json, '"route"').Count)










