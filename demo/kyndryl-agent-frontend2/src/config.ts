export const config = {
  appName: 'Kyndryl DID Agent Demo',
  appVersion: '1.0.0',
  registryUrl: import.meta.env.VITE_REGISTRY_URL || 'http://localhost:5004',
  orchestratorUrl: import.meta.env.VITE_ORCHESTRATOR_URL || 'http://localhost:5005',
};

export type AppConfig = typeof config;