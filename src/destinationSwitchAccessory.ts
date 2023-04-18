import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

export class DestinationSwitchAccessory {
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
      .onGet(this.getOn.bind(this))
      .onSet(this.setOn.bind(this));
  }

  async getOn(): Promise<CharacteristicValue> {
    return false;
  }

  async setOn(value: CharacteristicValue) {

    if (value as boolean) {

      let destination = { destinations: [{ poiProvider: 'unknown', destinationName: this.accessory.context.device.name, address: this.accessory.context.device.address, destinationSource: 'MobileApp', geoCoordinate: { longitude: this.accessory.context.device.lon, latitude: this.accessory.context.device.lat } }] };

      this.platform.vwConn.setDestination(destination);

      setTimeout(() => {
        this.accessory.getService(this.platform.Service.Switch)!.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
      }, 500);
    }
  }
}
