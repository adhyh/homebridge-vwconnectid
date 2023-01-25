import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ChargingAccessory } from './chargingAccessory';
import { ClimatisationAccessory } from './climatisationAccessory';
import { LocationMotionSensorAccessory } from './locationMotionSensorAccessory';
import { EventMotionSensorAccessory } from './eventMotionSensorAccessory';

import * as vwapi from 'npm-vwconnectidapi';
import { config } from 'process';


/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class WeConnectIDPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly vwlog = new vwapi.Log();
  public readonly vwConn = new vwapi.VwWeConnect();
  public readonly idStatusEmitter = vwapi.idStatusEmitter;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.log.info('Finished initializing platform:', this.config.name);
    //this.vwConn.setLogLevel('DEBUG');
    this.vwConn.setCredentials(this.config.weconnect.username, this.config.weconnect.password);
    this.vwlog.setlo;



    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.info('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.vwConn.getData()
        .then(() => {
          this.vwConn.setActiveVin(this.config.weconnect.vin); // must exist in vwConn.vehicles
          this.discoverDevices();
        })
        .catch((error) => {
          log.error(error);
          process.exit(1);
        });

    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {

    //Charging accessory
    const chargingUuid = this.api.hap.uuid.generate('charging');
    const existingChargingAccessory = this.accessories.find(accessory => accessory.UUID === chargingUuid);
    if (existingChargingAccessory) {
      this.log.info('Restoring existing charging accessory from cache:', existingChargingAccessory.displayName);
      new ChargingAccessory(this, existingChargingAccessory);
    } else {
      this.log.info('Adding new charging accessory:', this.config.options.chargingAccessory || 'Charging');

      // create a new accessory
      const accessory = new this.api.platformAccessory(this.config.options.chargingAccessory || 'Charging', chargingUuid);

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      //accessory.context.deviceName = device;

      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new ChargingAccessory(this, accessory);

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    // climatisation accessory
    const climatisationUuid = this.api.hap.uuid.generate('climatisation');
    const existingClimatisationAccessory = this.accessories.find(accessory => accessory.UUID === climatisationUuid);
    if (existingClimatisationAccessory) {
      this.log.info('Restoring existing climatisation accessory from cache:', existingClimatisationAccessory.displayName);
      new ClimatisationAccessory(this, existingClimatisationAccessory);
    } else {
      this.log.info('Adding new climatisation accessory:', this.config.options.climatisationAccessory || 'Climatisation');

      // create a new accessory
      const accessory = new this.api.platformAccessory(this.config.options.climatisationAccessory ||
        'Climatisation', climatisationUuid);

      new ClimatisationAccessory(this, accessory);

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of this.config.options.locationMotionSensors) {

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(device.name);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`

        new LocationMotionSensorAccessory(this, existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new LocationMotionSensorAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    for (const device of this.config.options.eventMotionSensors) {

      const uuid = this.api.hap.uuid.generate(device.name);

      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {

        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        new EventMotionSensorAccessory(this, existingAccessory);

      } else {
        this.log.info('Adding new accessory:', device.name);

        const accessory = new this.api.platformAccessory(device.name, uuid);

        accessory.context.device = device;

        new EventMotionSensorAccessory(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
