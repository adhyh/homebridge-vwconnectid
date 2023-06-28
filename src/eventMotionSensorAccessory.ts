import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

export class EventMotionSensorAccessory {
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

    this.service = this.accessory.getService(this.platform.Service.MotionSensor) ||
      this.accessory.addService(this.platform.Service.MotionSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.MotionDetected)
      .onGet(this.getMotionDetected.bind(this));

    this.platform.idStatusEmitter.on(accessory.context.device.event, (state) => {
     
      if (typeof (state) == 'boolean') {
        
        this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, state);
        
      } else if (typeof (state) == 'undefined') {
        
        this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, true);

        setTimeout(() => {
          this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, false);
        }, 10 * 1000);

      }

    });
  }

  async getMotionDetected(): Promise<CharacteristicValue> {

    let state = false;

    if (this.accessory.context.device.event == 'carLocked') { 
      if (typeof(this.platform.vwConn.idData.access?.accessStatus?.value?.doorLockStatus) === 'undefined') {
        state = false; 
      } else {
        state = (this.platform.vwConn.idData.access.accessStatus.value.doorLockStatus == 'locked') ? true : false; 
      }
    }
    if (this.accessory.context.device.event == 'parked') { state = this.platform.vwConn.idData.parking.data.carIsParked; }
    if (this.accessory.context.device.event == 'notParked') { state = !this.platform.vwConn.idData.parking.data.carIsParked; }
    if (this.accessory.context.device.event == 'statusNotSafe') { state = this.platform.vwConn.config.unSafe; }
    if (this.accessory.context.device.event == 'noExternalPower') { state = this.platform.vwConn.config.noExternalPower; }
    return state;
  }
}
