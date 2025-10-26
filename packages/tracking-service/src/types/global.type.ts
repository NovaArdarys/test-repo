export interface TrackingData {
  driver_id: string;
  delivery_id?: string;
  lon?: number;
  lat?: number;
  status?: 'ONLINE' | 'DELIVERING' | 'BREAK';
  recorded_at?: number;
}

export interface TrackingUpdatePayload {
  event: 'location_update' | 'driver_status_change' | string;
  data: TrackingData;
}

export interface WebSocketData {
  deliveryId?: string;
  driverId?: string;
  userId: string;
}