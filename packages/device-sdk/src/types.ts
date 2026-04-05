export interface DeviceInfo {
  hardwareId: string;
  deviceType: string;
  name: string;
  capabilities: string[];
  metadata: Record<string, unknown>;
}

export interface TelemetryData {
  timestamp: string;
  batteryLevel?: number;
  location?: { lat: number; lng: number; alt?: number };
  sensorData?: Record<string, unknown>;
  status: string;
}

export interface DeviceCommand {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface DeviceMessage {
  deviceId: string;
  channelId: string;
  content: string;
  contentType: 'text' | 'sensor_reading' | 'camera_frame' | 'location' | 'action_result';
  metadata?: Record<string, unknown>;
}

export interface SymbixDeviceConfig {
  apiKey: string;
  serverUrl: string;
  mqttBrokerUrl?: string;
  heartbeatIntervalMs?: number;
}

export interface DeviceEventHandler {
  onCommand(command: DeviceCommand): Promise<void>;
  onChannelMessage(channelId: string, content: string): Promise<void>;
}
