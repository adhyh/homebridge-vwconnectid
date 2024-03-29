import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

export class ChargingAccessory {
  private service: Service;
  private timer;

  constructor(
    private readonly platform: WeConnectIDPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) => vin === this.platform.config.weconnect.vin).model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);

    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    const chargePercentageService = this.accessory.getService('Battery Level') ||
      this.accessory.addService(this.platform.Service.Lightbulb, 'Battery Level', 'YourUniqueIdentifier-1');

    chargePercentageService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Battery Level');
    chargePercentageService.setCharacteristic(this.platform.Characteristic.IsConfigured,
      this.platform.Characteristic.IsConfigured.CONFIGURED);

    chargePercentageService.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBatteryLevel.bind(this))
      .onGet(this.getBatteryLevel.bind(this));

    chargePercentageService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getBatteryLevelOn.bind(this));

    const batteryService = this.accessory.getService('BatteryLevel') ||
      this.accessory.addService(this.platform.Service.BatteryService, 'BatteryLevel', 'YourUniqueIdentifier-3');

    batteryService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'BatteryLevel');

    batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.getBatteryLevel.bind(this));

    const targetSOCreachedService = this.accessory.getService('Charge Level Reached') ||
      this.accessory.addService(this.platform.Service.MotionSensor, 'Charge Level Reached', 'YourUniqueIdentifier-2');

    targetSOCreachedService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Charge Level Reached');
    targetSOCreachedService.setCharacteristic(this.platform.Characteristic.IsConfigured,
      this.platform.Characteristic.IsConfigured.CONFIGURED);

    this.platform.idStatusEmitter.on('chargePurposeReached', () => {
      targetSOCreachedService.updateCharacteristic(this.platform.Characteristic.MotionDetected, true);

      setInterval(() => {
        targetSOCreachedService.updateCharacteristic(this.platform.Characteristic.MotionDetected, false);
      }, 60 * 1000);
    });

    this.platform.idStatusEmitter.on('chargingStarted', () => {
      chargePercentageService.updateCharacteristic(this.platform.Characteristic.On, true);
      this.service.updateCharacteristic(this.platform.Characteristic.On, true);
    });

    this.platform.idStatusEmitter.on('chargingStopped', () => {
      chargePercentageService.updateCharacteristic(this.platform.Characteristic.On, false);
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    });

    this.platform.idStatusEmitter.on('currentSOC', (soc) => {
      chargePercentageService.updateCharacteristic(this.platform.Characteristic.On, true);
      chargePercentageService.updateCharacteristic(this.platform.Characteristic.Brightness, soc);
    });
  }

  async setOn(value: CharacteristicValue) {
    if (value as boolean) {
      this.platform.vwConn.startCharging();
    } else {
      this.platform.vwConn.stopCharging();
    }

    this.platform.log.info('Set Characteristic On ->', value);
  }

  async setBatteryLevel(value: CharacteristicValue) {
    const targetPercentage = Math.max(50, Math.round((value as number) / 10) * 10);

    clearTimeout(this.timer);

    this.timer = setTimeout(() => {

      this.accessory.getService(this.platform.Service.Lightbulb)!.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(this.platform.vwConn.idData.charging.batteryStatus.value.currentSOC_pct);
      this.platform.vwConn.setChargingSetting("targetSOC", targetPercentage);
      this.platform.log.info('Set Characteristic target battery level ->', targetPercentage);
    }, 5000);

  }

  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.platform.vwConn.idData.charging.chargingStatus.value.chargingState === 'charging';

    return isOn;
  }

  async getBatteryLevel(): Promise<CharacteristicValue> {
    const brightness = this.platform.vwConn.idData.charging.batteryStatus.value.currentSOC_pct;

    return brightness;
  }

  async getBatteryLevelOn(): Promise<CharacteristicValue> {

    return true;
  }
}

export class RemainingRangeAccessory {
  private service: Service;

  constructor(
    private readonly platform: WeConnectIDPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) => vin === this.platform.config.weconnect.vin).model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);

    this.service = this.accessory.getService(this.platform.Service.LightSensor) || this.accessory.addService(this.platform.Service.LightSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.getCurrentAmbientLightLevel.bind(this));

    this.platform.idStatusEmitter.on('remainingRange', (range) => {
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, range);
    });
  }

  async getCurrentAmbientLightLevel(): Promise<CharacteristicValue> {
    const range = this.platform.vwConn.idData.charging.batteryStatus.value.cruisingRangeElectric_km;

    return range;
  }
}
