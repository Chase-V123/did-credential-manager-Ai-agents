import axios from 'axios';
import { config } from '../config';
import type { RegisteredAgent, RegisteredVendor, VendorApplication } from '../types';

const api = axios.create({
  baseURL: config.registryUrl,
  headers: { 'Content-Type': 'application/json' },
});

export const registryApi = {
  async getDid(): Promise<string> {
    const res = await api.get('/did');
    return res.data.did;
  },

  async getHealth() {
    const res = await api.get('/health');
    return res.data;
  },

  async getVendors(): Promise<RegisteredVendor[]> {
    const res = await api.get('/vendors');
    return res.data.vendors || [];
  },

  async getAgents(summary?: string): Promise<RegisteredAgent[]> {
    const res = await api.get('/agents', {
      params: summary ? { summary } : {},
    });
    return res.data.agents || [];
  },

  async getVendorApplications(status?: string): Promise<VendorApplication[]> {
    const res = await api.get('/vendors/applications', {
      params: status ? { status } : {},
    });
    return res.data.applications || [];
  },

  async applyVendor(vendorDid: string, vendorId: string): Promise<{ status: string }> {
    const res = await api.post('/vendors/register', { vendorDid, vendorId });
    return res.data;
  },

  async approveVendor(vendorDid: string): Promise<{ status: string; credential?: any }> {
    const res = await api.post('/vendors/approve', { vendorDid });
    return res.data;
  },

  async rejectVendor(vendorDid: string): Promise<{ status: string }> {
    const res = await api.post('/vendors/reject', { vendorDid });
    return res.data;
  },
};

export default registryApi;