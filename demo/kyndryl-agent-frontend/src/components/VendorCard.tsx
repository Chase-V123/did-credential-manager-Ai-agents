import type { RegisteredVendor } from '../types';

export function VendorCard({ vendor }: { vendor: RegisteredVendor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{vendor.vendorId}</h3>

      <div className="mt-3 text-sm">
        <div className="text-gray-500">Vendor DID</div>
        <div className="font-mono break-all text-gray-900">{vendor.vendorDid}</div>
      </div>

      <div className="mt-3 text-sm">
        <div className="text-gray-500">Registered At</div>
        <div className="text-gray-900">{new Date(vendor.registeredAt).toLocaleString()}</div>
      </div>
    </div>
  );
}