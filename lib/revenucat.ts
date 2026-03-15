import Purchases, {
  type PurchasesOfferings,
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesError,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const ENTITLEMENT_ID = 'plus';

/**
 * Initialize RevenueCat SDK. Call once after auth is ready.
 */
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

/**
 * Fetch all available offerings.
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch {
    return null;
  }
}

/**
 * Get available packages from the current offering.
 */
export async function getPackages(): Promise<PurchasesPackage[]> {
  const offerings = await getOfferings();
  return offerings?.current?.availablePackages ?? [];
}

/**
 * Purchase a package. Returns customer info on success.
 * Throws on unrecoverable errors; returns null for user-cancelled.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e) {
    const error = e as PurchasesError;
    if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return null; // user cancelled — not an error
    }
    if (error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      // Already owns it — fetch latest info
      return getCustomerInfo();
    }
    throw error;
  }
}

/**
 * Restore previous purchases (required by Apple).
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

/**
 * Check if the user has the "plus" entitlement.
 */
export async function checkEntitlement(
  entitlementId: string = ENTITLEMENT_ID
): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[entitlementId] !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get full customer info.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

/**
 * Get the URL for Apple's subscription management page.
 */
export async function getManageSubscriptionURL(): Promise<string | null> {
  try {
    const info = await Purchases.getCustomerInfo();
    return info.managementURL;
  } catch {
    return null;
  }
}
