import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, Shield, ShieldAlert, CheckCircle, Smartphone } from "lucide-react";

interface BiometricPromptProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  amountLabel?: string;
}

export default function BiometricPrompt({
  isOpen,
  onSuccess,
  onCancel,
  title = "Biometric Verification Required",
  subtitle = "Scan fingerprint or use FaceID credentials to authorize this secure transaction",
  amountLabel
}: BiometricPromptProps) {
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setScanState("idle");
      setProgress(0);
      return;
    }
  }, [isOpen]);

  const handleStartScan = () => {
    if (scanState === "success") return;
    
    setScanState("scanning");
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanState("success");
          setTimeout(() => {
            onSuccess();
          }, 800);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="biometric-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div
            id="biometric-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl"
          >
            {/* Header */}
            <div id="biometric-header" className="flex items-center gap-2 border-b border-zinc-900 pb-4">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium tracking-tight text-white">{title}</h3>
                <p className="text-xs text-zinc-400">Smart Cryptographic Security Shield</p>
              </div>
            </div>

            {/* Main Content */}
            <div id="biometric-body" className="flex flex-col items-center justify-center py-8 text-center">
              {amountLabel && (
                <div id="biometric-amount" className="mb-4 rounded-full bg-zinc-900 px-4 py-1.5 text-xs text-emerald-400 font-mono tracking-wider border border-zinc-850">
                  AUTHORIZING: {amountLabel}
                </div>
              )}
              
              <p className="max-w-xs text-sm text-zinc-300 mb-8">{subtitle}</p>

              {/* Holographic scanner button */}
              <button
                id="biometric-scan-button"
                onClick={handleStartScan}
                disabled={scanState === "scanning"}
                className="relative flex h-32 w-32 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 group cursor-pointer"
              >
                {/* Visual ripple and rings */}
                {scanState === "scanning" && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full border border-emerald-400/30"
                      animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                    />
                    <motion.div
                      className="absolute inset-2 rounded-full border border-emerald-400/50"
                      animate={{ scale: [1, 1.2], opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, ease: "easeOut" }}
                    />
                  </>
                )}

                {/* Progress bar border */}
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    className="stroke-zinc-800 fill-none"
                    strokeWidth="3"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="58"
                    className="stroke-emerald-500 fill-none"
                    strokeWidth="3"
                    strokeDasharray={364}
                    strokeDashoffset={364 - (364 * progress) / 100}
                    transition={{ ease: "easeInOut" }}
                  />
                </svg>

                {/* Center scan icon */}
                <div className="z-10 flex flex-col items-center justify-center">
                  {scanState === "idle" && (
                    <Fingerprint className="h-12 w-12 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                  )}
                  {scanState === "scanning" && (
                    <Fingerprint className="h-12 w-12 text-emerald-400 animate-pulse" />
                  )}
                  {scanState === "success" && (
                    <CheckCircle className="h-12 w-12 text-emerald-400" />
                  )}
                  {scanState === "error" && (
                    <ShieldAlert className="h-12 w-12 text-red-500" />
                  )}
                </div>
              </button>

              <div id="biometric-scan-status" className="mt-4 font-mono text-xs font-semibold">
                {scanState === "idle" && (
                  <span className="text-zinc-500 hover:text-emerald-400 transition-colors">TAP TO INITIATE HANDSHAKE</span>
                )}
                {scanState === "scanning" && (
                  <span className="text-emerald-400">SIGNING BLOCKCHAIN PAYLOAD {progress}%</span>
                )}
                {scanState === "success" && (
                  <span className="text-emerald-300">BIOMETRICS MATRICES SECURED</span>
                )}
                {scanState === "error" && (
                  <span className="text-red-400">SIGNATURE HANDSHAKE EXPIRED</span>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div id="biometric-footer" className="flex items-center gap-3 border-t border-zinc-900 pt-4">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mr-auto">
                <Smartphone className="h-4.5 w-4.5 text-zinc-400" />
                <span>WebAuthn API</span>
              </div>
              <button
                id="biometric-cancel-btn"
                onClick={onCancel}
                disabled={scanState === "scanning"}
                className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
              >
                Cancel Override
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
