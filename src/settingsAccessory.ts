import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

export class SettingAccessory {
  private service: Service;

  constructor(
    private readonly platform: WeConnectIDPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) =>
        vin === this.platform.config.weconnect.vin).model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);

    this.service = this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    const val = value as boolean;

    switch (this.accessory.context.device.setting) {
      case "reducedAC":
        this.platform.vwConn.setChargingSetting("chargeCurrent", val ? "reduced" : "maximum");
        break;
      case "autoUnlockPlug":
        this.platform.vwConn.setChargingSetting("autoUnlockPlug", val);
        break;
      default:
        this.platform.vwConn.setClimatisationSetting(this.accessory.context.device.setting, val);
        break;
    }

    this.platform.log.info('Set Characteristic On ->', value);
  }

  async getOn(): Promise<CharacteristicValue> {

    switch (this.accessory.context.device.setting) {
      case "reducedAC":
        return this.platform.vwConn.idData.charging.chargingSettings.value.maxChargeCurrentAC === 'reduced';
      case "autoUnlockPlug":
        return this.platform.vwConn.idData.charging.chargingSettings.value.autoUnlockPlugWhenCharged === 'permanent';
      case "climatizationAtUnlock":
        return this.platform.vwConn.idData.climatisation.climatisationSettings.value.climatizationAtUnlock;
      case "climatisationWindowHeating":
        return this.platform.vwConn.idData.climatisation.climatisationSettings.value.windowHeatingEnabled;
      case "climatisationFrontLeft":
        return this.platform.vwConn.idData.climatisation.climatisationSettings.value.zoneFrontLeftEnabled;
      case "climatisationFrontRight":
        return this.platform.vwConn.idData.climatisation.climatisationSettings.value.zoneFrontRightEnabled;
      default:
        return false;
    }
  }
}
