import { version as appVersion } from '../../../../package.json';

const parseVersion = (version) => {
  const parts = version.replace(/[^0-9.]/g, '').split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
};

export const isNewInCurrentVersion = (tweakVersion, currentVersion) => {
  if (!tweakVersion) return false;
  
  const current = parseVersion(currentVersion);
  const tweakVer = parseVersion(tweakVersion);
  
  return current.major === tweakVer.major && 
         current.minor === tweakVer.minor;
};

export const isUpdatedInCurrentVersion = (updatedVersion, currentVersion) => {
  if (!updatedVersion) return false;
  
  const current = parseVersion(currentVersion);
  const updatedVer = parseVersion(updatedVersion);
  
  return current.major === updatedVer.major && 
         current.minor === updatedVer.minor;
};

export const CURRENT_VERSION = appVersion;
