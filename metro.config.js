// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Each build only ships the backend it uses.
 *  - firebase builds swap the mock backend (which embeds the competitive
 *    question bank, answers included) for a stub, so answers never reach a
 *    production client.
 *  - mock builds swap the Firebase backend for a stub to keep the bundle lean.
 */
const backend = process.env.EXPO_PUBLIC_BACKEND === 'firebase' ? 'firebase' : 'mock';
const stubs = {
  firebase: { '@/backend/mock': path.resolve(__dirname, 'src/backend/mock/stub.ts') },
  mock: { '@/backend/firebase': path.resolve(__dirname, 'src/backend/firebase/stub.ts') },
}[backend];

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const stub = stubs[moduleName];
  if (stub) return { type: 'sourceFile', filePath: stub };
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
