import type { DeviceInfo, TelemetryData, DeviceCommand, DeviceMessage, SymbixDeviceConfig } from './types.js';

/**
 * MockDevice — simulates a physical device for testing the Symbix device integration.
 *
 * Usage:
 * ```typescript
 * const device = new MockDevice({
 *   hardwareId: 'mock-arm-001',
 *   deviceType: 'robot_arm',
 *   name: 'Test Robot Arm',
 *   capabilities: ['pick', 'place', 'rotate'],
 * });
 *
 * device.onCommand(async (cmd) => {
 *   console.log('Received command:', cmd);
 * });
 *
 * await device.connect({ apiKey: 'sym_...', serverUrl: 'ws://localhost:4000/ws' });
 * await device.sendTelemetry({ status: 'idle', batteryLevel: 85 });
 * ```
 */
export class MockDevice {
  private connected = false;
  private commandHandler: ((cmd: DeviceCommand) => Promise<void>) | null = null;
  private telemetryInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private info: DeviceInfo) {}

  async connect(config: SymbixDeviceConfig): Promise<void> {
    // In real implementation: connect via MQTT + register via REST API
    console.log(`[MockDevice:${this.info.name}] Connected to ${config.serverUrl}`);
    this.connected = true;

    // Simulate periodic telemetry
    const interval = config.heartbeatIntervalMs ?? 10000;
    this.telemetryInterval = setInterval(() => {
      this.sendTelemetry({
        timestamp: new Date().toISOString(),
        status: 'active',
        batteryLevel: Math.round(70 + Math.random() * 30),
        location: { lat: 37.7749 + (Math.random() - 0.5) * 0.001, lng: -122.4194 + (Math.random() - 0.5) * 0.001 },
        sensorData: { temperature: 20 + Math.random() * 5, humidity: 40 + Math.random() * 20 },
      });
    }, interval);
  }

  async disconnect(): Promise<void> {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
    }
    this.connected = false;
    console.log(`[MockDevice:${this.info.name}] Disconnected`);
  }

  async sendTelemetry(data: Partial<TelemetryData>): Promise<void> {
    if (!this.connected) throw new Error('Device not connected');
    const telemetry: TelemetryData = {
      timestamp: new Date().toISOString(),
      status: 'active',
      ...data,
    };
    // In real implementation: publish to MQTT topic
    console.log(`[MockDevice:${this.info.name}] Telemetry:`, JSON.stringify(telemetry));
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    if (!this.connected) throw new Error('Device not connected');
    const msg: DeviceMessage = {
      deviceId: this.info.hardwareId,
      channelId,
      content,
      contentType: 'text',
    };
    // In real implementation: send via WS or MQTT
    console.log(`[MockDevice:${this.info.name}] Message to ${channelId}:`, content);
  }

  onCommand(handler: (cmd: DeviceCommand) => Promise<void>): void {
    this.commandHandler = handler;
  }

  // Simulate receiving a command (for testing)
  async simulateCommand(command: DeviceCommand): Promise<void> {
    if (this.commandHandler) {
      await this.commandHandler(command);
    }
  }

  getInfo(): DeviceInfo {
    return { ...this.info };
  }

  isConnected(): boolean {
    return this.connected;
  }
}
