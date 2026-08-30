import React, { useState } from 'react';
import KeyActivation from './components/KeyActivation';
import DarkworldMain from './components/DarkworldMain';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [activeKey, setActiveKey] = useState(() => {
    try {
      return localStorage.getItem('predictor_active_key') || 'DARKWORLD-VIP';
    } catch (_) {
      return 'DARKWORLD-VIP';
    }
  });

  const [deviceId, setDeviceId] = useState(() => {
    try {
      let stored = localStorage.getItem('predictor_device_id');
      if (!stored) {
        stored = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem('predictor_device_id', stored);
      }
      return stored;
    } catch (_) {
      return 'DEV-VIP-786';
    }
  });

  const handleActivateKey = (key) => {
    try {
      localStorage.setItem('predictor_active_key', key);
    } catch (_) {}
    setActiveKey(key);
  };

  const handleResetKey = () => {
    try {
      localStorage.removeItem('predictor_active_key');
    } catch (_) {}
    setActiveKey(null);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white selection:bg-[#00ff66] selection:text-black font-chakra">
        {activeKey ? (
          <DarkworldMain onResetKey={handleResetKey} />
        ) : (
          <KeyActivation onActivate={handleActivateKey} deviceId={deviceId} />
        )}
      </div>
    </ErrorBoundary>
  );
}




