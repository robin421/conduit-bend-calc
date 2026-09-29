#!/usr/bin/env node
/**
 * Upgrades the bundled Google Play Billing Library from 7.0.0 to 8.0.0.
 *
 * react-native-iap 12.16.4 (the legacy-architecture release compatible with
 * Expo SDK 52 / RN 0.76) pins com.android.billingclient:billing-ktx:7.0.0 via
 * android/gradle.properties. The Billing-8-capable react-native-iap releases
 * (v14+) require Nitro Modules, Kotlin 2.x and AGP 8.12, which are incompatible
 * with this project's Expo SDK 52 toolchain.
 *
 * Google Play Billing 8.0.0 removes/renames a handful of APIs that this library
 * source still calls, so bumping the dependency alone does not compile. This
 * script pins the dependency to 8.0.0 and applies the minimal source port:
 *
 *   1. BillingClient.Builder.enablePendingPurchases() (no-arg, removed)
 *      -> enablePendingPurchases(PendingPurchasesParams...)
 *   2. ProductDetailsResponseListener now receives QueryProductDetailsResult
 *      instead of List<ProductDetails>.
 *   3. BillingClient.queryPurchaseHistoryAsync() was removed (unused by this
 *      app) -> reject the JS method with a clear error.
 *
 * Idempotent: safe to run repeatedly (npm postinstall).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RNIAP = path.join(__dirname, '..', 'node_modules', 'react-native-iap');

const GRADLE_PROPERTIES = path.join(RNIAP, 'android', 'gradle.properties');
const RNIAP_BUILD_GRADLE = path.join(RNIAP, 'android', 'build.gradle');
const RN_IAP_MODULE = path.join(
  RNIAP,
  'android',
  'src',
  'play',
  'java',
  'com',
  'dooboolab',
  'rniap',
  'RNIapModule.kt',
);

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`[patch-rniap-billing8] missing file: ${file}`);
  }
  return fs.readFileSync(file, 'utf8');
}

function applyPatch(label, file, from, to) {
  const content = read(file);
  const applied = to === '' ? !content.includes(from) : content.includes(to);
  if (applied) {
    console.log(`[patch-rniap-billing8] already applied: ${label}`);
    return;
  }
  if (!content.includes(from)) {
    throw new Error(
      `[patch-rniap-billing8] expected source not found (${label}) in ${file}. ` +
        'react-native-iap may have changed; update scripts/patchRnIapBilling8.js.',
    );
  }
  fs.writeFileSync(file, content.replace(from, to));
  console.log(`[patch-rniap-billing8] applied: ${label}`);
}

applyPatch(
  'billing-ktx 7.0.0 -> 8.0.0',
  GRADLE_PROPERTIES,
  'RNIap_playBillingSdkVersion=7.0.0',
  'RNIap_playBillingSdkVersion=8.0.0',
);

applyPatch(
  'import PendingPurchasesParams',
  RN_IAP_MODULE,
  'import com.android.billingclient.api.GetBillingConfigParams.Builder\nimport com.android.billingclient.api.ProductDetails',
  'import com.android.billingclient.api.GetBillingConfigParams.Builder\nimport com.android.billingclient.api.PendingPurchasesParams\nimport com.android.billingclient.api.ProductDetails',
);

applyPatch(
  'drop PurchaseHistoryRecord import',
  RN_IAP_MODULE,
  'import com.android.billingclient.api.PurchaseHistoryRecord\n',
  '',
);

applyPatch(
  'drop QueryPurchaseHistoryParams import',
  RN_IAP_MODULE,
  'import com.android.billingclient.api.QueryPurchaseHistoryParams\n',
  '',
);

applyPatch(
  'enablePendingPurchases(PendingPurchasesParams)',
  RN_IAP_MODULE,
  'BillingClient.newBuilder(reactContext).enablePendingPurchases(),',
  'BillingClient.newBuilder(reactContext).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()),',
);

applyPatch(
  'queryProductDetailsAsync QueryProductDetailsResult',
  RN_IAP_MODULE,
  'billingClient.queryProductDetailsAsync(params) { billingResult, skuDetailsList ->\n' +
    '                if (!isValidResult(billingResult, promise)) return@queryProductDetailsAsync\n' +
    '\n' +
    '                val items = Arguments.createArray()\n' +
    '                for (skuDetails in skuDetailsList) {',
  'billingClient.queryProductDetailsAsync(params) { billingResult, queryResult ->\n' +
    '                if (!isValidResult(billingResult, promise)) return@queryProductDetailsAsync\n' +
    '\n' +
    '                val items = Arguments.createArray()\n' +
    '                for (skuDetails in queryResult.productDetailsList) {',
);

applyPatch(
  'getPurchaseHistoryByType removed in Billing 8',
  RN_IAP_MODULE,
  `    @ReactMethod
    fun getPurchaseHistoryByType(
        type: String,
        promise: Promise,
    ) {
        ensureConnection(
            promise,
        ) { billingClient ->
            billingClient.queryPurchaseHistoryAsync(
                QueryPurchaseHistoryParams
                    .newBuilder()
                    .setProductType(
                        if (type == "subs") BillingClient.ProductType.SUBS else BillingClient.ProductType.INAPP,
                    ).build(),
            ) { billingResult: BillingResult, purchaseHistoryRecordList: MutableList<PurchaseHistoryRecord>? ->

                if (!isValidResult(billingResult, promise)) return@queryPurchaseHistoryAsync

                Log.d(TAG, purchaseHistoryRecordList.toString())
                val items = Arguments.createArray()
                purchaseHistoryRecordList?.forEach { purchase ->
                    val item = Arguments.createMap()
                    item.putString("productId", purchase.products[0])
                    val products = Arguments.createArray()
                    purchase.products.forEach { products.pushString(it) }
                    item.putArray("productIds", products)
                    item.putDouble("transactionDate", purchase.purchaseTime.toDouble())
                    item.putString("transactionReceipt", purchase.originalJson)
                    item.putString("purchaseToken", purchase.purchaseToken)
                    item.putString("dataAndroid", purchase.originalJson)
                    item.putString("signatureAndroid", purchase.signature)
                    item.putString("developerPayload", purchase.developerPayload.orEmpty())
                    items.pushMap(item)
                }
                promise.safeResolve(items)
            }
        }
    }`,
  `    @ReactMethod
    fun getPurchaseHistoryByType(
        type: String,
        promise: Promise,
    ) {
        // Google Play Billing 8.0.0 removed queryPurchaseHistoryAsync().
        // This app does not use purchase history; getAvailableItemsByType()
        // covers entitlement reconciliation.
        promise.safeReject(
            "E_IAP_NOT_AVAILABLE",
            "queryPurchaseHistory was removed in Google Play Billing Library 8.0.0.",
        )
    }`,
);

// billing-ktx 8.0.0 ships Kotlin 2.1 metadata, but the project's Kotlin 1.9
// compiler only needs its Java-compatible API surface. Skipping the metadata
// version check lets this module compile without forcing a global Kotlin 2.x
// upgrade (which breaks expo-modules-core's compose plugin resolution).
applyPatch(
  'skip Kotlin metadata version check for billing-ktx 8.0.0',
  RNIAP_BUILD_GRADLE,
  '  compileOptions {\n' +
    '    sourceCompatibility JavaVersion.VERSION_1_8\n' +
    '    targetCompatibility JavaVersion.VERSION_1_8\n' +
    '  }\n',
  '  compileOptions {\n' +
    '    sourceCompatibility JavaVersion.VERSION_1_8\n' +
    '    targetCompatibility JavaVersion.VERSION_1_8\n' +
    '  }\n' +
    '\n' +
    '  // Billing 8.0.0 ktx jar carries Kotlin 2.1 metadata; skip the version\n' +
    '  // check so the Kotlin 1.9 compiler can resolve its Java-compatible API.\n' +
    '  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {\n' +
    '    kotlinOptions {\n' +
    '      freeCompilerArgs += ["-Xskip-metadata-version-check"]\n' +
    '    }\n' +
    '  }\n',
);

console.log('[patch-rniap-billing8] done.');
