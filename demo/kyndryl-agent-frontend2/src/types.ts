export interface RegisteredVendor {
  vendorDid: string;
  vendorId: string;
  credential: any;
  registeredAt: string;
}

export interface RegisteredAgent {
  agentDid: string;
  agentId: string;
  vendorDid: string;
  summary: string;
  callingConvention: string;
  serviceEndpoint: string;
  credential: any;
  registeredAt: string;
}

export interface OrchestrateResponse {
  verified: boolean;
  agentDid: string;
  result: {
    output: string;
    model: string;
    executedAt: string;
  };
}

export interface HealthResponse {
  status: string;
  service: string;
  did: string;
  timestamp: string;
}

export interface VendorApplication {
  vendorDid: string;
  vendorId: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt: string | null;
}