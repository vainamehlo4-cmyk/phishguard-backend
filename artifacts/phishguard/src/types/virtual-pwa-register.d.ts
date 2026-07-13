declare module 'virtual:pwa-register' {
  export function registerSW(options?: { immediate?: boolean; [key: string]: unknown }): void;
}

