/** 分类事件白名单；函数签名不接受输入尺寸、收据或支付 token。 */
export type GrowthEvent =
  | 'review_request_attempted' | 'review_store_open' | 'review_request_result'
  | 'pro_checkout_started' | 'pro_purchase_result' | 'pro_next_step_started' | 'pro_preview_changed'
  | 'pro_restore_started' | 'pro_restore_result' | 'pro_paywall_dismissed'
  | 'history_saved' | 'history_exported' | 'bender_calibrated' | 'result_copied'
  | 'feedback_opened' | 'feedback_submitted' | 'feedback_submit_failed';
export interface GrowthEventParams {
  source?: string;
  outcome?: string;
  scene?: string;
  action?: string;
  bend_type?: string;
  unit_system?: string;
  tool_name?: string;
}
