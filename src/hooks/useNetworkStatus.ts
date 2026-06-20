import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean; // Track if we were recently offline (for reconnection message)
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    effectiveType: getConnectionInfo()?.effectiveType,
    downlink: getConnectionInfo()?.downlink,
    rtt: getConnectionInfo()?.rtt,
  }));

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: true,
      wasOffline: !prev.isOnline, // Mark that we were offline
    }));

    // Clear the wasOffline flag after a delay
    setTimeout(() => {
      setStatus((prev) => ({
        ...prev,
        wasOffline: false,
      }));
    }, 5000);
  }, []);

  const handleOffline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
      wasOffline: false,
    }));
  }, []);

  const handleConnectionChange = useCallback(() => {
    const info = getConnectionInfo();
    if (info) {
      setStatus((prev) => ({
        ...prev,
        effectiveType: info.effectiveType,
        downlink: info.downlink,
        rtt: info.rtt,
      }));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection quality changes if available
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange]);

  return status;
}

// Helper functions for Network Information API
function getConnection(): NetworkInformation | undefined {
  if (typeof navigator !== 'undefined') {
    return (navigator as NavigatorWithConnection).connection;
  }
  return undefined;
}

function getConnectionInfo() {
  const connection = getConnection();
  if (connection) {
    return {
      effectiveType: connection.effectiveType as NetworkStatus['effectiveType'],
      downlink: connection.downlink,
      rtt: connection.rtt,
    };
  }
  return undefined;
}

// Type definitions for Network Information API
interface NetworkInformation extends EventTarget {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}
