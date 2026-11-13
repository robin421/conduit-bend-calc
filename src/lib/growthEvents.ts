/** 分类事件白名单；函数签名不接受输入尺寸、收据或支付 token。 */
export type GrowthEvent =
  | 'review_request_attempted' | 'review_store_open' | 'review_request_result'
  | 'pro_checkout_started' | 'pro_purchase_result' | 'pro_next_step_started' | 'pro_preview_changed';
export interface GrowthEventParams {
  source?: string;
  outcome?: string;
  scene?: string;
  action?: string;
}
