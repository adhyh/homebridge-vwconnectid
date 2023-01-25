import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ChargingAccessory {
  private service: Service;

  constructor(
    private readonly platform: WeConnectIDPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    //console.log(JSON.stringify(idStatusEmitter));
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) => vin === this.platform.config.weconnect.vin).model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);


    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    // Example: add two "motion sensor" services to the accessory
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
    //motionSensorOneService.addCharacteristic(this.platform.Characteristic.Brightness);
    //motionSensorOneService.addCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel);

    const targetSOCreachedService = this.accessory.getService('Charge Level Reached') ||
      this.accessory.addService(this.platform.Service.MotionSensor, 'Charge Level Reached', 'YourUniqueIdentifier-2');

    this.platform.idStatusEmitter.on('chargePurposeReached', () => {
      targetSOCreachedService.updateCharacteristic(this.platform.Characteristic.MotionDetected, true);

      setInterval(() => {
        targetSOCreachedService.updateCharacteristic(this.platform.Characteristic.MotionDetected, false);
      }, 10000);
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

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    //const motionDetected = false;
    // setInterval(() => {
    //   // EXAMPLE - inverse the trigger
    //   motionDetected = !motionDetected;

    //   // push the new value to HomeKit
    //   //motionSensorOneService.updateCharacteristic(this.platform.Characteristic.Brightness, Math.random()*100);
    //   //motionSensorTwoService.updateCharacteristic(this.platform.Characteristic.MotionDetected, !motionDetected);

    //   this.platform.log.info('Triggering motionSensorOneService:', motionDetected);
    //   this.platform.log.info('Triggering motionSensorTwoService:', !motionDetected);
    // }, 10000);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    if (value as boolean) {
      this.platform.vwConn.startCharging();
    } else {
      this.platform.vwConn.stopCharging();
    }

    this.platform.log.info('Set Characteristic On ->', value);
  }

  async setBatteryLevel(value: CharacteristicValue) {

    this.platform.log.info('Set Characteristic Brightness ->', value);
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
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.platform.vwConn.idData.charging.chargingStatus.value.chargingState === 'charging';

    //this.platform.log.info('Get Characteristic On ->', isOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOn;
  }

  async getBatteryLevel(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const brightness = this.platform.vwConn.idData.charging.batteryStatus.value.currentSOC_pct;

    //this.platform.log.info('Get Characteristic On ->', brightness);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return brightness;
  }

  async getBatteryLevelOn(): Promise<CharacteristicValue> {

    return true;
  }
}
