import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ChargingAccessory } from './chargingAccessory';
import { ClimatisationAccessory } from './climatisationAccessory';
import { SettingAccessory } from './settingsAccessory';
import { LocationMotionSensorAccessory } from './locationMotionSensorAccessory';
import { EventMotionSensorAccessory } from './eventMotionSensorAccessory';
import { DestinationSwitchAccessory } from './destinationSwitchAccessory';
import * as vwapi from 'npm-vwconnectidapi';
import { config } from 'process';

export class WeConnectIDPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly vwlog = new vwapi.Log();
  public readonly vwConn = new vwapi.VwWeConnect();
  public readonly idStatusEmitter = vwapi.idStatusEmitter;
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.log.info('Finished initializing platform:', this.config.name);
    this.vwConn.setLogLevel(this.config.options.logLevel || 'ERROR');
    this.vwConn.setCredentials(this.config.weconnect.username, this.config.weconnect.password);

    this.api.on('didFinishLaunching', () => {
      log.info('Executed didFinishLaunching callback');

      this.vwConn.getData()
        .then(() => {
          this.vwConn.setActiveVin(this.config.weconnect.vin);
          this.discoverDevices();
        })
        .catch((error) => {
          log.error(error);
          process.exit(1);
        });

    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {

    //Charging accessory
    const chargingUuid = this.api.hap.uuid.generate('charging');
    const existingChargingAccessory = this.accessories.find(accessory => accessory.UUID === chargingUuid);
    if (existingChargingAccessory) {
      this.log.info('Restoring existing charging accessory from cache:', existingChargingAccessory.displayName);
      new ChargingAccessory(this, existingChargingAccessory);
    } else {
      if (this.config.options.chargingAccessory !== undefined) {
        this.log.info('Adding new charging accessory:', this.config.options.chargingAccessory || 'Charging');
        const accessory = new this.api.platformAccessory(this.config.options.chargingAccessory || 'Charging', chargingUuid);
        new ChargingAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // climatisation accessory
    const climatisationUuid = this.api.hap.uuid.generate('climatisation');
    const existingClimatisationAccessory = this.accessories.find(accessory => accessory.UUID === climatisationUuid);
    if (existingClimatisationAccessory) {
      this.log.info('Restoring existing climatisation accessory from cache:', existingClimatisationAccessory.displayName);
      new ClimatisationAccessory(this, existingClimatisationAccessory);
    } else {
      if (this.config.options.climatisationAccessory !== undefined) {
        this.log.info('Adding new climatisation accessory:', this.config.options.climatisationAccessory || 'Climatisation');
        const accessory = new this.api.platformAccessory(this.config.options.climatisationAccessory ||
          'Climatisation', climatisationUuid);

        new ClimatisationAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    if (typeof this.config.options.destinations !== 'undefined') {
      for (const device of this.config.options.destinations) {

        if (typeof device.address !== 'undefined') {
          const uuid = this.api.hap.uuid.generate(device.name + '-dest');
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new DestinationSwitchAccessory(this, existingAccessory);
          } else {
            this.log.info('Adding new accessory:', device.name);
            const accessory = new this.api.platformAccessory(device.name, uuid);

            accessory.context.device = device;
            new DestinationSwitchAccessory(this, accessory);

            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }

        if (typeof device.notificationRadius !== 'undefined') {
          const uuid = this.api.hap.uuid.generate(device.name);
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new LocationMotionSensorAccessory(this, existingAccessory);
          } else {
            this.log.info('Adding new accessory:', device.name);
            const accessory = new this.api.platformAccessory(device.name, uuid);

            accessory.context.device = device;
            new LocationMotionSensorAccessory(this, accessory);

            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }
      }

    } else {
      for (const device of this.config.options.locationMotionSensors) {
        this.log.warn("warning: you're missing out on some cool new features. Please update your config.json.");
        const uuid = this.api.hap.uuid.generate(device.name);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          new LocationMotionSensorAccessory(this, existingAccessory);
        } else {
          this.log.info('Adding new accessory:', device.name);
          const accessory = new this.api.platformAccessory(device.name, uuid);

          accessory.context.device = device;
          new LocationMotionSensorAccessory(this, accessory);

          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    }

    if (typeof this.config.options.locationMotionSensors !== 'undefined' && typeof this.config.options.destinations !== 'undefined') {
      this.log.warn("warning: you have upgraded your configuration. The 'locationMotionSensors' block in your current config.json is not processed and may be removed.");
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

    for (const device of this.config.options.settingSwitches) {
      const uuid = this.api.hap.uuid.generate(device.name);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new SettingAccessory(this, existingAccessory);
      } else {
        this.log.info('Adding new accessory:', device.name);
        const accessory = new this.api.platformAccessory(device.name, uuid);

        accessory.context.device = device;
        new SettingAccessory(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
