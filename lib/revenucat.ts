import type {
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
  PurchasesError,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const ENTITLEMENT_ID = 'Pawlogix pro';

// ---------- Dynamic module loading (Expo Go safety) ----------

interface PurchasesSDK {
  configure(config: { apiKey: string; appUserID?: string }): void;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<CustomerInfo>;
  getCustomerInfo(): Promise<CustomerInfo>;
}

interface PurchasesErrorCodes {
  PURCHASE_CANCELLED_ERROR: number;
  PRODUCT_ALREADY_PURCHASED_ERROR: number;
  NETWORK_ERROR: number;
  PAYMENT_PENDING_ERROR: number;
  PURCHASE_NOT_ALLOWED_ERROR: number;
}

let _Purchases: PurchasesSDK | null = null;
let _ERROR_CODE: PurchasesErrorCodes | null = null;

function loadRevenueCat(): boolean {
  if (_Purchases) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases');
    // Metro may place default export at mod.default or directly on mod
    _Purchases = (mod.default ?? mod) as PurchasesSDK;
    _ERROR_CODE = (mod.PURCHASES_ERROR_CODE ?? mod.default?.PURCHASES_ERROR_CODE) as PurchasesErrorCodes;
    return true;
  } catch {
    return false;
  }
}

export function isRevenueCatAvailable(): boolean {
  return loadRevenueCat();
}

// ---------- Initialization ----------

export async function initRevenueCat(userId?: string): Promise<void> {
  const apiKey = process.env.EXPO_PUBLIC_REVENUCAT_IOS_KEY;
  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[RevenueCat] Missing EXPO_PUBLIC_REVENUCAT_IOS_KEY — skipping init');
    }
    return;
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  if (!isRevenueCatAvailable()) return;

  try {
    _Purchases!.configure({ apiKey, appUserID: userId ?? undefined });
  } catch {
    // Native module not available (e.g. Expo Go) — silently skip
  }
}

// ---------- Offerings ----------

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isRevenueCatAvailable()) return null;
  try {
    return await _Purchases!.getOfferings();
  } catch {
    return null;
  }
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  const offerings = await getOfferings();
  return offerings?.current?.availablePackages ?? [];
}

// ---------- Purchases ----------

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  if (!isRevenueCatAvailable()) return null;
  try {
    const { customerInfo } = await _Purchases!.purchasePackage(pkg);
    return customerInfo;
  } catch (e) {
    const error = e as PurchasesError;
    const code = Number(error.code);
    if (code === Number(_ERROR_CODE!.PURCHASE_CANCELLED_ERROR)) {
      return null; // user cancelled — not an error
    }
    if (code === Number(_ERROR_CODE!.PRODUCT_ALREADY_PURCHASED_ERROR)) {
      // Already owns it — fetch latest info
      return getCustomerInfo();
    }
    if (code === Number(_ERROR_CODE!.NETWORK_ERROR)) {
      throw new Error('Check your internet connection and try again.');
    }
    if (code === Number(_ERROR_CODE!.PAYMENT_PENDING_ERROR)) {
      throw new Error('Your payment is being processed. This may take a few minutes.');
    }
    if (code === Number(_ERROR_CODE!.PURCHASE_NOT_ALLOWED_ERROR)) {
      throw new Error('Purchases are not allowed on this device. Check your device settings.');
    }
    throw new Error('Something went wrong. Please try again or use Restore Purchases.');
  }
}

// ---------- Restore ----------

export async function restorePurchases(): Promise<CustomerInfo> {
  if (!isRevenueCatAvailable()) {
    throw new Error('Purchases are not available on this device.');
  }
  try {
    return await _Purchases!.restorePurchases();
  } catch {
    throw new Error('Could not restore purchases. Please check your connection and try again.');
  }
}

// ---------- Entitlement ----------

export async function checkEntitlement(
  entitlementId: string = ENTITLEMENT_ID
): Promise<boolean> {
  if (!isRevenueCatAvailable()) return false;
  try {
    const info = await _Purchases!.getCustomerInfo();
    return info.entitlements.active[entitlementId] !== undefined;
  } catch {
    return false;
  }
}

// ---------- Customer Info ----------

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isRevenueCatAvailable()) return null;
  try {
    return await _Purchases!.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function getManageSubscriptionURL(): Promise<string | null> {
  if (!isRevenueCatAvailable()) return null;
  try {
    const info = await _Purchases!.getCustomerInfo();
    return info.managementURL;
  } catch {
    return null;
  }
}
