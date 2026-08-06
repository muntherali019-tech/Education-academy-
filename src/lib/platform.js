// Which build is this? Set at build time:
//   web build  -> `vite build --mode web`  (.env.web sets VITE_PLATFORM=web)
//   app build  -> `vite build --mode app`  (.env.app sets VITE_PLATFORM=app)
// The two builds output to separate folders (dist-web / dist-app) and use
// different payment paths (web => Stripe, app => Google Play Billing).
const PLATFORM = (import.meta.env.VITE_PLATFORM || "web").toLowerCase();

export function platform() { return PLATFORM; }
export const isApp = () => PLATFORM === "app";
export const isWeb = () => PLATFORM !== "app";
