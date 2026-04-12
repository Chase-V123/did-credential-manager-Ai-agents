import axios from 'axios';
import { config } from '../config';
import type { OrchestrateResponse } from '../types';

const api = axios.create({
  baseURL: config.orchestratorUrl,
  headers: { 'Content-Type': 'application/json' },
});

export const orchestratorApi = {
  async getDid(): Promise<string> {
    const res = await api.get('/did');
    return res.data.did;
  },

  async getHealth() {
    const res = await api.get('/health');
    return res.data;
  },

  async orchestrate(task: string, summary: string): Promise<OrchestrateResponse> {
    const res = await api.post('/orchestrate', { task, summary });
    return res.data;
  },
};

export default orchestratorApi;