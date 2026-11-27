/** 分类事件白名单；函数签名不接受输入尺寸、收据或支付 token。 */
export type GrowthEvent =
  | 'review_request_attempted' | 'review_store_open' | 'review_request_result'
  | 'pro_checkout_started' | 'pro_purchase_result' | 'pro_next_step_started' | 'pro_preview_changed'
  | 'pro_restore_started' | 'pro_restore_result' | 'pro_paywall_dismissed'
  | 'pro_buy_tapped' | 'pro_retry_tapped' | 'pro_paywall_sku_loaded' | 'pro_paywall_price_status' | 'pro_entitlement_granted'
  | 'pro_paywall_demo_interacted'
  | 'calibration_try_started' | 'calibration_result_previewed' | 'calibration_save_gated' | 'calibration_draft_auto_applied'
  | 'history_saved' | 'history_exported' | 'history_reused' | 'bender_calibrated' | 'result_copied'
  | 'feedback_opened' | 'feedback_submitted' | 'feedback_submit_failed'
  | 'cross_promo_tapped';
export interface GrowthEventParams {
  source?: string;
  outcome?: string;
  scene?: string;
  action?: string;
  mode?: string;
  delta_bucket?: string;
  has_personal_data?: boolean;
  has_hidden_history?: boolean;
  bend_type?: string;
  unit_system?: string;
  unit_mode?: string;
  tool_name?: string;
  sku_status?: string;
  price_loaded?: boolean;
  dismiss_method?: string;
  product_id?: string;
  failure_reason?: string;
  error_code?: string;
  load_ms?: number;
}
