import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/deviceId';

export type ThresholdKind = 'above' | 'below' | 'change';
export type CompareField = 'official_buy' | 'official_sell' | 'street_buy' | 'street_sell';

export interface AlertThreshold {
  id: string;
  device_id: string;
  pair: string;
  threshold_kind: ThresholdKind;
  threshold_value: number;
  compare_field: CompareField;
  enabled: boolean;
  push_endpoint: string | null;
  push_p256dh: string | null;
  push_auth: string | null;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThresholdInput {
  pair: string;
  threshold_kind: ThresholdKind;
  threshold_value: number;
  compare_field?: CompareField;
  enabled?: boolean;
  push_endpoint?: string | null;
  push_p256dh?: string | null;
  push_auth?: string | null;
}

/** 获取当前设备的所有订阅 */
export async function listMyAlerts(): Promise<AlertThreshold[]> {
  const { data, error } = await supabase
    .from('alert_thresholds')
    .select('*')
    .eq('device_id', getDeviceId())
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[alerts] list failed:', error.message);
    return [];
  }
  return (data ?? []) as AlertThreshold[];
}

/**
 * Upsert by (device_id, pair, threshold_kind, compare_field).
 * 重复设阈值时覆盖同一行, 不产生重复订阅。
 */
export async function upsertAlert(input: ThresholdInput): Promise<AlertThreshold | null> {
  const payload = {
    device_id: getDeviceId(),
    pair: input.pair,
    threshold_kind: input.threshold_kind,
    threshold_value: input.threshold_value,
    compare_field: input.compare_field ?? 'street_buy',
    enabled: input.enabled ?? true,
    push_endpoint: input.push_endpoint ?? null,
    push_p256dh: input.push_p256dh ?? null,
    push_auth: input.push_auth ?? null,
    // 重新设值时清掉防抖, 让新条件能立刻生效
    last_triggered_at: null,
  };
  const { data, error } = await supabase
    .from('alert_thresholds')
    .upsert(payload, { onConflict: 'device_id,pair,threshold_kind,compare_field' })
    .select()
    .single();
  if (error) {
    console.error('[alerts] upsert failed:', error.message);
    return null;
  }
  return data as AlertThreshold;
}

export async function deleteAlert(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('alert_thresholds')
    .delete()
    .eq('id', id)
    .eq('device_id', getDeviceId());
  if (error) {
    console.error('[alerts] delete failed:', error.message);
    return false;
  }
  return true;
}

export async function setAlertEnabled(id: string, enabled: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('alert_thresholds')
    .update({ enabled })
    .eq('id', id)
    .eq('device_id', getDeviceId());
  if (error) {
    console.error('[alerts] toggle failed:', error.message);
    return false;
  }
  return true;
}
