import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

export class ClimatisationAccessory {
  private service: Service;

  constructor(
    private readonly platform: WeConnectIDPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) => vin === this.platform.config.weconnect.vin).model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);

    this.service = this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.displayName);

    const MorningClimaSwitchService = this.accessory.getService('Morning clima') ||
      this.accessory.addService(this.platform.Service.Switch, 'Morning clima', 'YourUniqueIdentifier-4');

    MorningClimaSwitchService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Morning clima');
    MorningClimaSwitchService.setCharacteristic(this.platform.Characteristic.IsConfigured,
      this.platform.Characteristic.IsConfigured.CONFIGURED);
      
    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onSet(this.setTargetTemperature.bind(this))
      .onGet(this.getTargetTemperature.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onSet(this.setCurrentHeatingCoolingState.bind(this))
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getTargetTemperature.bind(this));

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
    value = Math.round((value as number) * 2) / 2;
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

  async getTargetTemperature(): Promise<CharacteristicValue> {
    const targetTemperature = this.platform.vwConn.idData.climatisation.climatisationSettings.value.targetTemperature_C;

    this.platform.log.info('Get Characteristic TargetTemperature ->', targetTemperature);

    return targetTemperature;
  }
}
