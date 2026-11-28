import React from 'react';

export type LandingArtKind =
  | 'inventory' | 'customers' | 'compliance' | 'assistant'
  | 'tenants' | 'audit' | 'write' | 'check' | 'review' | 'export'

function InventoryArt() {
  return (
    <div className="art-panel">
      <div className="art-row"><span>2021 RAV4</span><span className="art-chip ok">In stock</span></div>
      <div className="art-row"><span>2019 Civic</span><span className="art-chip ok">In stock</span></div>
      <div className="art-row"><span>2022 F-150</span><span className="muted">Sold</span></div>
    </div>
  )
}

function CustomersArt() {
  return (
    <div className="art-panel">
      <div className="art-person"><div className="art-avatar">J</div><div><strong>Jane D.</strong><small>2 vehicles</small></div></div>
      <div className="art-person" style={{ marginTop: 8 }}><div className="art-avatar">M</div><div><strong>Mike R.</strong><small>1 vehicle</small></div></div>
    </div>
  )
}

function ComplianceArt() {
  return (
    <div className="art-panel">
      <div className="art-check">&#10003; Dealer name</div>
      <div className="art-check">&#10003; Price disclosed</div>
      <div className="art-check">&#10003; APR present</div>
      <div className="art-chip ok art-corner">Passed</div>
    </div>
  )
}

function AssistantArt() {
  return (
    <div className="art-chat">
      <div className="art-bubble me">Show in-stock trucks</div>
      <div className="art-bubble bot">Found 3 vehicles matching &ldquo;trucks&rdquo;</div>
    </div>
  )
}

function TenantsArt() {
  return (
    <div className="art-tenants">
      <div className="art-tenant"><div className="art-avatar" style={{ margin: '0 auto' }}>A</div><small>Dealer A</small><small className="muted">4 staff</small></div>
      <div className="art-tenant"><div className="art-avatar" style={{ margin: '0 auto' }}>B</div><small>Dealer B</small><small className="muted">2 staff</small></div>
    </div>
  )
}

function AuditArt() {
  return (
    <div className="art-panel art-timeline">
      <div><i /><span>Created vehicle</span><small>10:42</small></div>
      <div><i /><span>Updated price</span><small>11:05</small></div>
      <div><i /><span>Marked sold</span><small>14:20</small></div>
    </div>
  )
}

function WriteArt() {
  return (
    <div className="art-panel">
      <span className="art-title muted">Ad draft</span>
      <div className="art-line" /><div className="art-line" />
      <div className="art-price">$24,995</div>
    </div>
  )
}

function CheckArt() {
  return (
    <div className="art-panel">
      <div className="art-check">&#10003; Price</div>
      <div className="art-check">&#10003; APR</div>
      <div className="danger-text" style={{ fontSize: 12 }}>&#10007; Term missing</div>
    </div>
  )
}

function ReviewArt() {
  return (
    <div className="art-center">
      <span className="art-ai">AI Review</span>
      <div className="art-chip ok">Approved</div>
    </div>
  )
}

function ExportArt() {
  return (
    <div className="art-center">
      <span className="art-file">dealer-ad.txt</span>
      <div className="art-chip done">Ready</div>
    </div>
  )
}

const ARTS: Record<LandingArtKind, () => React.JSX.Element> = {
  inventory: InventoryArt,
  customers: CustomersArt,
  compliance: ComplianceArt,
  assistant: AssistantArt,
  tenants: TenantsArt,
  audit: AuditArt,
  write: WriteArt,
  check: CheckArt,
  review: ReviewArt,
  export: ExportArt,
}

/** Decorative illustration for one section of the public landing page. */
export default function LandingArt({ kind }: { kind: LandingArtKind }) {
  const Art = ARTS[kind]
  return <div className="art"><Art /></div>
}
