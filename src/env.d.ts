/// <reference types="vite/client" />

import type { DesktopApi } from '../shared/desktop-api';

declare global {
  interface Window {
    api: DesktopApi;
  }
}

export {};
