"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";

export function DialogContainer() {
  const [alertConfig, setAlertConfig] = useState<{
    open: boolean;
    message: string;
    title: string;
    resolve: () => void;
  } | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean;
    message: string;
    title: string;
    resolve: (result: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent;
      setAlertConfig({
        open: true,
        message: customEvent.detail.message,
        title: customEvent.detail.title || "Peringatan",
        resolve: customEvent.detail.resolve,
      });
    };

    const handleConfirm = (e: Event) => {
      const customEvent = e as CustomEvent;
      setConfirmConfig({
        open: true,
        message: customEvent.detail.message,
        title: customEvent.detail.title || "Konfirmasi",
        resolve: customEvent.detail.resolve,
      });
    };

    window.addEventListener("app-alert", handleAlert);
    window.addEventListener("app-confirm", handleConfirm);

    return () => {
      window.removeEventListener("app-alert", handleAlert);
      window.removeEventListener("app-confirm", handleConfirm);
    };
  }, []);

  const handleAlertClose = () => {
    if (alertConfig) {
      alertConfig.resolve();
      setAlertConfig(null);
    }
  };

  const handleConfirmClose = (result: boolean) => {
    if (confirmConfig) {
      confirmConfig.resolve(result);
      setConfirmConfig(null);
    }
  };

  return (
    <>
      {/* Modal Alert */}
      <Modal
        isOpen={!!alertConfig?.open}
        onClose={handleAlertClose}
        title={alertConfig?.title || "Peringatan"}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {alertConfig?.message}
          </p>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleAlertClose}
              className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirm */}
      <Modal
        isOpen={!!confirmConfig?.open}
        onClose={() => handleConfirmClose(false)}
        title={confirmConfig?.title || "Konfirmasi"}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {confirmConfig?.message}
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => handleConfirmClose(false)}
              className="px-6 py-2 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 transition-all active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={() => handleConfirmClose(true)}
              className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              Ya, Lanjutkan
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
