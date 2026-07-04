let lastError: unknown = undefined;

export function captureError(error: unknown) {
  lastError = error;
}

export function consumeLastCapturedError(): unknown {
  const e = lastError;
  lastError = undefined;
  return e;
}