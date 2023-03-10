import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ChargingAccessory } from './chargingAccessory';
import { ClimatisationAccessory } from './climatisationAccessory';
import { LocationMotionSensorAccessory } from './locationMotionSensorAccessory';
import { EventMotionSensorAccessory } from './eventMotionSensorAccessory';
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

    for (const device of this.config.options.locationMotionSensors) {
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
