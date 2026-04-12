import type { RegisteredVendor } from '../types'

export function VendorCard({ vendor }: { vendor: RegisteredVendor }) {
  return (
    <div className="vendor-card">
      <h3 className="vendor-card-title">{vendor.vendorId}</h3>

      <div className="vendor-card-section">
        <div className="vendor-card-label">Vendor DID</div>
        <div className="vendor-card-value mono-text break-text">
          {vendor.vendorDid}
        </div>
      </div>

      <div className="vendor-card-section">
        <div className="vendor-card-label">Registered At</div>
        <div className="vendor-card-value">
          {new Date(vendor.registeredAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
}