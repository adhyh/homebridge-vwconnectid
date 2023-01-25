import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ClimatisationAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    On: false,
    Brightness: 80,
  };

  constructor(
    private readonly platform: WeConnectIDPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) => vin === this.platform.config.weconnect.vin).model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);


    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.displayName);//accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic

    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onSet(this.setTargetTemperature.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getTargetTemperature.bind(this));               // GET - bind to the `getOn` method below

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onSet(this.setCurrentHeatingCoolingState.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getCurrentHeatingCoolingState.bind(this));               // GET - bind to the `getOn` method below

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getTargetTemperature.bind(this));               // GET - bind to the `getOn` method below

    this.platform.idStatusEmitter.on('climatisationHeatingStarted', () => {
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState,
        this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
      this.service.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState,
        this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
    });

    this.platform.idStatusEmitter.on('climatisationCoolingStarted', () => {
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState,
        this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
      this.service.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState,
        this.platform.Characteristic.TargetHeatingCoolingState.COOL);
    });

    this.platform.idStatusEmitter.on('climatisationStopped', () => {
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState,
        this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
      this.service.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState,
        this.platform.Characteristic.TargetHeatingCoolingState.OFF);
    });

    this.platform.idStatusEmitter.on('climatisationTemperatureUpdated', () => {
      this.service.updateCharacteristic(this.platform.Characteristic.TargetTemperature,
        this.platform.vwConn.idData.climatisation.climatisationSettings.value.targetTemperature_C);
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentTemperature,
        this.platform.vwConn.idData.climatisation.climatisationSettings.value.targetTemperature_C);
    });
  }

  async setTargetTemperature(value: CharacteristicValue) {
    value = Math.round((value as number)*2)/2;
    this.platform.vwConn.setClimatisation(value);

    this.platform.log.info('Set Characteristic TargetTemperature ->', value);
  }

  async getCurrentHeatingCoolingState(): Promise<CharacteristicValue> {

    const state = this.platform.vwConn.idData.climatisation.climatisationStatus.value.climatisationState;
    let ret = 0;

    this.platform.log.info('Get Characteristic CurrentHeatingCoolingState ->', state);

    if (state === 'cooling') {
      ret = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
    } else if (state === 'heating') {
      ret = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
    }

    return ret;
  }

  async setCurrentHeatingCoolingState(value: CharacteristicValue) {
    if (value === this.platform.Characteristic.CurrentHeatingCoolingState.OFF) {
      this.platform.vwConn.stopClimatisation();
    } else {
      this.platform.vwConn.startClimatisation();
    }

    this.platform.log.info('Set Characteristic CurrentHeatingCoolingState ->', value);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */

  async getTargetTemperature(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const targetTemperature = this.platform.vwConn.idData.climatisation.climatisationSettings.value.targetTemperature_C;

    this.platform.log.info('Get Characteristic TargetTemperature ->', targetTemperature);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return targetTemperature;
  }
}
