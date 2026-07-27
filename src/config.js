const runtimeEnv = globalThis.process?.env ?? {};

const config = {
  api: {
    base: runtimeEnv.GNDDT_API_BASE || __GNDDT_API_BASE__,
    webshop: runtimeEnv.GNDDT_WEBSHOP_URL || __GNDDT_WEBSHOP_URL__,
  },
  app: {
    title: 'Gunny Login Manager',
    version: '0.1.0',
  },
};

export default config;
