import { useState, useEffect } from 'react';

const determineCapabilities = () => {
  let tier = 'High';
  
  if (typeof navigator !== 'undefined') {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      if (['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
        tier = 'Low';
      } else if (connection.effectiveType === '4g' && connection.downlink < 2) {
        tier = 'Mid';
      }
    }

    if (navigator.hardwareConcurrency) {
      if (navigator.hardwareConcurrency <= 2) tier = 'Low';
      else if (navigator.hardwareConcurrency <= 4 && tier !== 'Low') tier = 'Mid';
    }
  }

  let options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
  if (tier === 'Low') {
    options = { enableHighAccuracy: false, timeout: 30000, maximumAge: 5000 };
  } else if (tier === 'Mid') {
    options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 };
  }
  
  return { tier, options };
};

export const useLocationOptimizer = () => {
  const [{ deviceTier, gpsOptions }, setState] = useState(() => {
    const { tier, options } = determineCapabilities();
    return { deviceTier: tier, gpsOptions: options };
  });

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return;
    
    const handleConnectionChange = () => {
      const { tier, options } = determineCapabilities();
      setState({ deviceTier: tier, gpsOptions: options });
    };

    connection.addEventListener('change', handleConnectionChange);
    return () => connection.removeEventListener('change', handleConnectionChange);
  }, []);

  return { gpsOptions, deviceTier };
};
export default useLocationOptimizer;
