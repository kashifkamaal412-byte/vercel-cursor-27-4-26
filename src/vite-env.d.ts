/// <reference types="vite/client" />

// Fix NodeJS.Timeout type for browser environment
declare global {
  namespace NodeJS {
    type Timeout = ReturnType<typeof setTimeout>;
    type Timer = ReturnType<typeof setTimeout>;
  }
}

export {};
