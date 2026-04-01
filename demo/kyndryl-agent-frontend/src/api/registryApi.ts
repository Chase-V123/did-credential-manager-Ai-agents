import axios from 'axios';
import { config } from '../config';
import type { RegisteredAgent, RegisteredVendor } from '../types';

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
};

export default registryApi;