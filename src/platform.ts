import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ChargingAccessory, RemainingRangeAccessory } from './chargingAccessory';
import { ClimatisationAccessory } from './climatisationAccessory';
import { SettingAccessory } from './settingsAccessory';
import { LocationMotionSensorAccessory } from './locationMotionSensorAccessory';
import { EventMotionSensorAccessory } from './eventMotionSensorAccessory';
import { DestinationSwitchAccessory } from './destinationSwitchAccessory';
import { RouteSwitchAccessory } from './routeSwitchAccessory';
import * as vwapi from 'npm-vwconnectidapi';
import { config } from 'process';
import { SmartChargingAccessory } from './smartChargingAccessory';

export class WeConnectIDPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly vwLog = new vwapi.Log();
  public readonly vwConn = new vwapi.VwWeConnect();
  public readonly idStatusEmitter = vwapi.idStatusEmitter;
  public readonly idLogEmitter = vwapi.idLogEmitter;
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.log.info('Finished initializing platform:', this.config.name);
    this.vwConn.setLogLevel(this.config.options.logLevel || 'ERROR', true);
    //this.vwConn.setLogLevel()

    this.idLogEmitter.on('DEBUG', (data) => { this.log.info(data); });
    this.idLogEmitter.on('ERROR', (data) => { this.log.error(data); });
    this.idLogEmitter.on('INFO', (data) => { this.log.info(data); });
    this.idLogEmitter.on('WARN', (data) => { this.log.warn(data); });

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

    const smartChargingUuid = this.api.hap.uuid.generate('smartCharging');
    const existingSmartChargingAccessory = this.accessories.find(accessory => accessory.UUID === smartChargingUuid);
    if (existingSmartChargingAccessory) {
      this.log.info('Restoring existing smart charging accessory from cache:', existingSmartChargingAccessory.displayName);
      new SmartChargingAccessory(this, existingSmartChargingAccessory);
    } else {
      if (this.config.options.smartChargingAccessory !== undefined) {
        this.log.info('Adding new smart charging accessory:', this.config.options.smartChargingAccessory || 'Smart Charging');
        const accessory = new this.api.platformAccessory(this.config.options.smartChargingAccessory.name || 'Smart Charging', smartChargingUuid);
        accessory.context.device = this.config.options.smartChargingAccessory;
        new SmartChargingAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    const remainingRangeUuid = this.api.hap.uuid.generate('remainingRange');
    const existingRemainingRangeAccessory = this.accessories.find(accessory => accessory.UUID === remainingRangeUuid);
    if (existingRemainingRangeAccessory) {
      this.log.info('Restoring existing remaining range accessory from cache:', existingRemainingRangeAccessory.displayName);
      new RemainingRangeAccessory(this, existingRemainingRangeAccessory);
    } else {
      if (this.config.options.remainingRangeAccessory !== undefined) {
        this.log.info('Adding new remaining range accessory:', this.config.options.remainingRangeAccessory || 'Remaining range');
        const accessory = new this.api.platformAccessory(this.config.options.remainingRangeAccessory || 'Remaining range', remainingRangeUuid);
        new RemainingRangeAccessory(this, accessory);
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

    // location based stuff
    if (typeof this.config.options.destinations !== 'undefined') {

      if (typeof this.config.options.locationMotionSensors !== 'undefined') {
        this.log.error('You have both \'destinations\' and \'locationMotionSensors\' blocks in your config. The latter is not processed, please remove.');
      }

      for (const device of this.config.options.destinations) {

        // destination switches
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

        // destination motion sensors
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
    } else if (typeof this.config.options.locationMotionSensors !== 'undefined') {
      this.log.error('Location aware functionality has changed. Please update your config.json. You\'re missing out on a cool new feature! See https://github.com/adhyh/homebridge-vwconnectid#upgrading-from-105-to-110 for details.');
      for (const device of this.config.options.locationMotionSensors) {
        const uuid = this.api.hap.uuid.generate(device.name);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          this.log.info('Restoring existing location motion sensor accessory from cache:', existingAccessory.displayName);
          new LocationMotionSensorAccessory(this, existingAccessory);
        } else {
          this.log.info('Adding new location motion sensor accessory:', device.name);
          const accessory = new this.api.platformAccessory(device.name, uuid);

          accessory.context.device = device;
          new LocationMotionSensorAccessory(this, accessory);

          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    }

    if (typeof this.config.options.routes !== 'undefined') {

      for (const route of this.config.options.routes) {

        // route switches
        if (typeof route.name !== 'undefined') {
          const uuid = this.api.hap.uuid.generate(route.name + '-route');
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new RouteSwitchAccessory(this, existingAccessory);
          } else {
            this.log.info('Adding new accessory:', route.name);
            const accessory = new this.api.platformAccessory(route.name, uuid);
            accessory.context.route = route;
            new RouteSwitchAccessory(this, accessory);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }
      }
    }

    for (const device of this.config.options.eventMotionSensors) {
      const uuid = this.api.hap.uuid.generate(device.name);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing event motions sensor accessory from cache:', existingAccessory.displayName);
        new EventMotionSensorAccessory(this, existingAccessory);
      } else {
        this.log.info('Adding new event motion sensor accessory:', device.name);
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
        this.log.info('Restoring existing setting switch accessory from cache:', existingAccessory.displayName);
        new SettingAccessory(this, existingAccessory);
      } else {
        this.log.info('Adding new setting switch accessory:', device.name);
        const accessory = new this.api.platformAccessory(device.name, uuid);

        accessory.context.device = device;
        new SettingAccessory(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
