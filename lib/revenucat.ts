import Purchases, {
  type PurchasesOfferings,
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesError,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const ENTITLEMENT_ID = 'Pawlogix pro';

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

  try {
    Purchases.configure({ apiKey, appUserID: userId ?? undefined });
  } catch {
    // Native module not available (e.g. Expo Go) — silently skip
  }
}

// ---------- Offerings ----------

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    return await Purchases.getOfferings();
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
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e) {
    const error = e as PurchasesError;
    const code = Number(error.code);
    if (code === Number(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)) {
      return null; // user cancelled — not an error
    }
    if (code === Number(PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR)) {
      // Already owns it — fetch latest info
      return getCustomerInfo();
    }
    if (code === Number(PURCHASES_ERROR_CODE.NETWORK_ERROR)) {
      throw new Error('Check your internet connection and try again.');
    }
    if (code === Number(PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR)) {
      throw new Error('Your payment is being processed. This may take a few minutes.');
    }
    if (code === Number(PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR)) {
      throw new Error('Purchases are not allowed on this device. Check your device settings.');
    }
    throw new Error('Something went wrong. Please try again or use Restore Purchases.');
  }
}

// ---------- Restore ----------

export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    return await Purchases.restorePurchases();
  } catch {
    throw new Error('Could not restore purchases. Please check your connection and try again.');
  }
}

// ---------- Entitlement ----------

export async function checkEntitlement(
  entitlementId: string = ENTITLEMENT_ID
): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    // Exact match first
    if (info.entitlements.active[entitlementId] !== undefined) return true;
    // Fallback: any active entitlement counts (single-tier app)
    return Object.keys(info.entitlements.active).length > 0;
  } catch {
    return false;
  }
}

// ---------- Customer Info ----------

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function getManageSubscriptionURL(): Promise<string | null> {
  try {
    const info = await Purchases.getCustomerInfo();
    return info.managementURL;
  } catch {
    return null;
  }
}
