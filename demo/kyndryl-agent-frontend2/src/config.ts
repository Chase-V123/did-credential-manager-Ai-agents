export const config = {
  appName: 'Kyndryl DID Agent Demo',
  appVersion: '1.0.0',
  registryUrl: import.meta.env.VITE_REGISTRY_URL || '/api/registry',
  orchestratorUrl: import.meta.env.VITE_ORCHESTRATOR_URL || '/api/orchestrator',
};

export type AppConfig = typeof config;
