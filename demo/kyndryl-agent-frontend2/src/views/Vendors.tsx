import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import registryApi from '../api/registryApi'
import { VendorApplicationCard } from '../components/VendorApplicationCard'
import { VendorCard } from '../components/VendorCard'

function Vendors() {
  const queryClient = useQueryClient()
  const [vendorId, setVendorId] = useState('')
  const [vendorDid, setVendorDid] = useState('')
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { data: pendingApps = [] } = useQuery({
    queryKey: ['vendor-applications', 'pending'],
    queryFn: () => registryApi.getVendorApplications('pending'),
    refetchInterval: 5000,
  })

  const { data: approvedVendors = [] } = useQuery({
    queryKey: ['approved-vendors'],
    queryFn: () => registryApi.getVendors(),
    refetchInterval: 5000,
  })

  const handleSubmit = async () => {
    if (!vendorId.trim() || !vendorDid.trim()) {
      setSubmitStatus({ type: 'error', message: 'Both fields are required.' })
      return
    }
    try {
      setSubmitStatus(null)
      const result = await registryApi.applyVendor(vendorDid.trim(), vendorId.trim())
      if (result.status === 'already_approved') {
        setSubmitStatus({ type: 'success', message: 'This vendor is already approved.' })
      } else {
        setSubmitStatus({ type: 'success', message: 'Application submitted! Awaiting admin approval.' })
      }
      setVendorId('')
      setVendorDid('')
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] })
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to submit application.' })
    }
  }

  const handleApprove = async (did: string) => {
    try {
      setActionLoading(true)
      await registryApi.approveVendor(did)
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] })
      queryClient.invalidateQueries({ queryKey: ['approved-vendors'] })
    } catch (err) {
      console.error('Approve failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (did: string) => {
    try {
      setActionLoading(true)
      await registryApi.rejectVendor(did)
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] })
    } catch (err) {
      console.error('Reject failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      {/* Vendor Application Form */}
      <h3>Submit Vendor Application</h3>
      <p>Register a new vendor organization for approval.</p>

      <div className="form-row" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <label>Vendor Name</label>
          <br />
          <input
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            placeholder="e.g. Kyndryl"
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label>Vendor DID</label>
          <br />
          <input
            value={vendorDid}
            onChange={(e) => setVendorDid(e.target.value)}
            placeholder="e.g. did:peer:kyndryl-demo-vendor"
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
      </div>

      <button type="button" onClick={handleSubmit} style={{ minWidth: '140px' }}>
        Submit Application
      </button>

      {submitStatus && (
        <div className={`message-box ${submitStatus.type === 'success' ? 'success-box' : 'error-box'}`}>
          <div className="message-title">{submitStatus.type === 'success' ? 'Success' : 'Error'}</div>
          {submitStatus.message}
        </div>
      )}

      {/* Pending Applications */}
      <h3 style={{ marginTop: '32px' }}>Pending Applications</h3>

      {pendingApps.length === 0 ? (
        <p>No pending vendor applications.</p>
      ) : (
        <div className="stack-list">
          {pendingApps.map((app) => (
            <VendorApplicationCard
              key={app.vendorDid}
              application={app}
              onApprove={handleApprove}
              onReject={handleReject}
              loading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Approved Vendors */}
      <h3 style={{ marginTop: '32px' }}>Approved Vendors</h3>

      {approvedVendors.length === 0 ? (
        <p>No approved vendors yet.</p>
      ) : (
        <div className="stack-list">
          {approvedVendors.map((vendor) => (
            <VendorCard key={vendor.vendorDid} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Vendors
