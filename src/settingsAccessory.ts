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

    switch (this.accessory.context.device.setting) {

      case 'climatizationAtUnlock':
        this.platform.idStatusEmitter.on('climatisationAtUnlockUpdated', () => {
          this.service.updateCharacteristic(this.platform.Characteristic.On,
            this.platform.vwConn.idData.climatisation.climatisationSettings.value.climatizationAtUnlock);
        }); break;

      case 'climatisationWindowHeating':
        this.platform.idStatusEmitter.on('windowHeatingUpdated', () => {
          this.service.updateCharacteristic(this.platform.Characteristic.On,
            this.platform.vwConn.idData.climatisation.climatisationSettings.value.windowHeatingEnabled);
        }); break;

      case 'climatisationFrontLeft':
        this.platform.idStatusEmitter.on('zoneFrontLeftUpdated', () => {
          this.service.updateCharacteristic(this.platform.Characteristic.On,
            this.platform.vwConn.idData.climatisation.climatisationSettings.value.zoneFrontLeftEnabled);
        }); break;

      case 'climatisationFrontRight':
        this.platform.idStatusEmitter.on('zoneFrontRightUpdated', () => {
          this.service.updateCharacteristic(this.platform.Characteristic.On,
            this.platform.vwConn.idData.climatisation.climatisationSettings.value.zoneFrontRightEnabled);
        }); break;

      case 'reducedAC':
        this.platform.idStatusEmitter.on('reducedACupdated', () => {
          this.service.updateCharacteristic(this.platform.Characteristic.On,
            this.platform.vwConn.idData.charging.chargingSettings.value.maxChargeCurrentAC === 'reduced');
        }); break;

      case 'autoUnlockPlug':
        this.platform.idStatusEmitter.on('autoUnlockPlugUpdated', () => {
          this.service.updateCharacteristic(this.platform.Characteristic.On,
            this.platform.vwConn.idData.charging.chargingSettings.value.autoUnlockPlugWhenCharged === 'permanent');
        }); break;

      default: break;

    }
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
        return (typeof(this.platform.vwConn.idData.charging?.chargingSettings?.value?.maxChargeCurrentAC) !== 'undefined') ? this.platform.vwConn.idData.charging.chargingSettings.value.maxChargeCurrentAC === 'reduced' : false;
      case "autoUnlockPlug":
        return (typeof(this.platform.vwConn.idData.charging?.chargingSettings?.value?.autoUnlockPlugWhenCharged) !== 'undefined') ? this.platform.vwConn.idData.charging.chargingSettings.value.autoUnlockPlugWhenCharged === 'permanent' : false;
      case "climatizationAtUnlock":
        return (typeof(this.platform.vwConn.idData.climatisation?.climatisationSettings?.value?.climatizationAtUnlock) !== 'undefined') ? this.platform.vwConn.idData.climatisation.climatisationSettings.value.climatizationAtUnlock : false;
      case "climatisationWindowHeating":
        return (typeof(this.platform.vwConn.idData.climatisation?.climatisationSettings?.value?.windowHeatingEnabled) !== 'undefined') ? this.platform.vwConn.idData.climatisation.climatisationSettings.value.windowHeatingEnabled : false;
      case "climatisationFrontLeft":
        return (typeof(this.platform.vwConn.idData.climatisation?.climatisationSettings?.value?.zoneFrontLeftEnabled) !== 'undefined') ? this.platform.vwConn.idData.climatisation.climatisationSettings.value.zoneFrontLeftEnabled : false;
      case "climatisationFrontRight":
        return (typeof(this.platform.vwConn.idData.climatisation?.climatisationSettings?.value?.zoneFrontRightEnabled) !== 'undefined') ? this.platform.vwConn.idData.climatisation.climatisationSettings.value.zoneFrontRightEnabled : false;
      default:
        return false;
    }
  }
}
