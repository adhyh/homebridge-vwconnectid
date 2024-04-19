import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';
import axios from 'axios';

export class SmartChargingAccessory {
    private service: Service;

    constructor(
        private readonly platform: WeConnectIDPlatform,
        private readonly accessory: PlatformAccessory,
        private intervalId: number | null = null,
    ) {

        this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
            .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) => vin === this.platform.config.weconnect.vin).model)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);

        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setOn.bind(this));
        //.onGet(this.getOn.bind(this));

        // this.platform.idStatusEmitter.on('chargePurposeReached', () => {
        //   targetSOCreachedService.updateCharacteristic(this.platform.Characteristic.MotionDetected, true);

        //   setInterval(() => {
        //     targetSOCreachedService.updateCharacteristic(this.platform.Characteristic.MotionDetected, false);
        //   }, 60 * 1000);
        // });
        

    }

    async fetchJSONData(url: string): Promise<any> {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            this.platform.log.info('Error fetching JSON data:', error);
            throw error;
        }
    }

    async smartChargingLoop() {
        
        const range = this.platform.vwConn.idData.charging.batteryStatus.value.cruisingRangeElectric_km;
        const isCharging = this.platform.vwConn.idData.charging.chargingStatus.value.chargingState === 'charging';
        const isReadyForCharging = this.platform.vwConn.idData.charging.chargingStatus.value.chargingState === 'readyForCharging';
        const isReduced = this.platform.vwConn.idData.charging.chargingSettings.value.maxChargeCurrentAC === 'reduced';
        const highTariffKmTreshold = this.accessory.context.device.highTariffKmTreshold;
        const lowTariffKmTreshold = this.accessory.context.device.lowTariffKmTreshold;
        const minRedeliveryTreshold = -1 * this.accessory.context.device.minRedeliveryTreshold;
        const maxDeliveryTreshold = this.accessory.context.device.maxDeliveryTreshold;

        //this.platform.log.info('range: ', range);
        //this.platform.log.info('charging: ', this.platform.vwConn.idData.charging.chargingStatus.value.chargingState);

        //chargeready?

        if (range < highTariffKmTreshold) {
            if (isReduced) {
                this.platform.vwConn.setChargingSetting('chargeCurrent', 'maximum');
            }
            if (isReadyForCharging) {
                this.platform.vwConn.startCharging();
            }
        } else if (range < lowTariffKmTreshold) {
            if (!isReduced) {
                this.platform.vwConn.setChargingSetting('chargeCurrent', 'reduced');
            }
            if (isReadyForCharging) {
                this.platform.vwConn.startCharging();
            }
        } else {
            const url = this.accessory.context.device.energyDataSource;
            this.fetchJSONData(url)
                .then((data) => {
                    this.platform.log.info('JSON Data minAvg: ', data.minAvg);

                    if (data.minAvg < minRedeliveryTreshold) {

                        if (isCharging && isReduced) {
                            this.platform.vwConn.setChargingSetting('chargeCurrent', 'maximum');
                            this.platform.log.info('set maximum');
                            return;
                        }
                        if (!isReduced) {
                            this.platform.vwConn.setChargingSetting('chargeCurrent', 'reduced');
                            this.platform.log.info('set reduced');
                        }
                        if (isReadyForCharging) {
                            this.platform.vwConn.startCharging();
                            this.platform.log.info('start charging');
                        }

                    } else if (data.minAvg > maxDeliveryTreshold && !isReduced && isCharging) {
                        this.platform.vwConn.setChargingSetting('chargeCurrent', 'reduced');
                        this.platform.log.info('set reduced');
                        return;
                    } else if (data.minAvg > maxDeliveryTreshold && isCharging) {
                        this.platform.vwConn.stopCharging();
                        this.platform.log.info('stop charging');
                    }

                })
                .catch((error) => {
                    // Handle errors
                });
        }
    }

    async setOn(value: CharacteristicValue) {
        if (value as boolean) {
            
            this.intervalId = setInterval(() => {
                this.smartChargingLoop(); 
            }, 60000);
            
        } else {
            
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            
        }
    
        this.platform.log.info('Set Characteristic On ->', value);
    }

    //   async getOn(): Promise<CharacteristicValue> {
    //     const isOn = this.platform.vwConn.idData.charging.chargingStatus.value.chargingState === 'charging';

    //     return isOn;
    //   }
}
