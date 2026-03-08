interface TensorFlowBackendApi {
  ready(): Promise<void>;
  setBackend(backend: string): Promise<boolean>;
}

const BACKEND_CANDIDATES = ["webgl", "cpu"] as const;

export async function initializeTfBackend(tf: TensorFlowBackendApi) {
  await tf.ready();

  for (const backend of BACKEND_CANDIDATES) {
    try {
      const initialized = await tf.setBackend(backend);
      if (initialized) {
        return backend;
      }
    } catch {
      // Fall through to the next backend.
    }
  }

  throw new Error("No supported TensorFlow backend is available");
}
