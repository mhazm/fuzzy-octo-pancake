export const showAlert = (message: string, title: string = "Peringatan"): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("app-alert", {
        detail: { message, title, resolve },
      })
    );
  });
};

export const showConfirm = (message: string, title: string = "Konfirmasi"): Promise<boolean> => {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("app-confirm", {
        detail: { message, title, resolve },
      })
    );
  });
};
