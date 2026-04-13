import type { VendorApplication } from '../types'

interface VendorApplicationCardProps {
  application: VendorApplication
  onApprove: (vendorDid: string) => void
  onReject: (vendorDid: string) => void
  loading?: boolean
}

export function VendorApplicationCard({ application, onApprove, onReject, loading }: VendorApplicationCardProps) {
  return (
    <div className="vendor-app-card">
      <div className="vendor-app-header">
        <h3 className="vendor-app-title">{application.vendorId}</h3>
        <span className={`status-badge status-${application.status}`}>
          {application.status}
        </span>
      </div>

      <div className="vendor-app-details">
        <div className="vendor-app-detail">
          <div className="vendor-app-label">Vendor DID</div>
          <div className="vendor-app-value mono-text break-text">{application.vendorDid}</div>
        </div>
        <div className="vendor-app-detail">
          <div className="vendor-app-label">Applied</div>
          <div className="vendor-app-value">{new Date(application.appliedAt).toLocaleString()}</div>
        </div>
      </div>

      {application.status === 'pending' && (
        <div className="vendor-app-actions">
          <button
            type="button"
            className="approve-button"
            onClick={() => onApprove(application.vendorDid)}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
          <button
            type="button"
            className="reject-button"
            onClick={() => onReject(application.vendorDid)}
            disabled={loading}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
