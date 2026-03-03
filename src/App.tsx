/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import SplashScreen from './components/SplashScreen';
import { SettingsProvider } from './context/SettingsContext';
import { Toaster } from 'sonner';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SettingsProvider>
      <Toaster position="top-right" richColors />
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" />
        ) : (
          <Dashboard key="dashboard" />
        )}
      </AnimatePresence>
    </SettingsProvider>
  );
}
