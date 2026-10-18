"use client";

/**
 * The Isothrum lab editor as a reusable React component, plus the ports a host wires in (accounts,
 * the product mark). The pure lab-model logic (no React) lives in the `./model` entry.
 */
export { LabCanvas, type LabCanvasProps } from "@/components/tool/lab-canvas";
export {
  AuthClientProvider,
  useAuthClient,
  type AuthClient,
  type AuthSession,
  type AuthSessionUser,
} from "@/lib/auth";
export {
  BrandMarkProvider,
  DefaultBrandMark,
  useBrandMark,
  type BrandMark,
  type BrandMarkProps,
} from "@/lib/brand";
