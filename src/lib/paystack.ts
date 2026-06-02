export const PAYSTACK_PUBLIC_KEY = "pk_test_ae7e705dba73e6cb11cbca0c535771bf716635e8";

// Lazy-load Paystack inline script
let scriptPromise: Promise<void> | null = null;
export function loadPaystackScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paystack"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface PaystackResult {
  reference: string;
  status: string;
  transaction: string;
}

export function openPaystack(opts: {
  email: string;
  amountNaira: number;
  reference: string;
  metadata?: Record<string, any>;
}): Promise<PaystackResult> {
  return new Promise(async (resolve, reject) => {
    await loadPaystackScript();
    const handler = (window as any).PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: opts.email,
      amount: Math.round(opts.amountNaira * 100), // kobo
      currency: "NGN",
      ref: opts.reference,
      metadata: opts.metadata ?? {},
      callback: (response: PaystackResult) => resolve(response),
      onClose: () => reject(new Error("Payment window closed")),
    });
    handler.openIframe();
  });
}

export function newPaystackRef() {
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}