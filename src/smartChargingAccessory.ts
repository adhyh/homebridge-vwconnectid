import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';
import axios from 'axios';

export class SmartChargingAccessory {
    private service: Service;

    constructor(
        private readonly platform: WeConnectIDPlatform,
        private readonly accessory: PlatformAccessory,
        private intervalId: NodeJS.Timer | null = null,
    ) {

        this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
            .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) =>
                vin === this.platform.config.weconnect.vin).model)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);

        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setOn.bind(this))
            .onGet(this.getOn.bind(this));
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



        try {
            const range = this.platform.vwConn.idData?.charging?.batteryStatus?.value?.cruisingRangeElectric_km;
            const targetSOC = this.platform.vwConn.idData?.charging?.chargingSettings?.value?.targetSOC_pct;
            const currentSOC = this.platform.vwConn.idData?.charging?.batteryStatus?.value?.currentSOC_pct;
            const isCharging = this.platform.vwConn.idData?.charging?.chargingStatus?.value?.chargingState === 'charging';
            const isReadyForCharging = this.platform.vwConn.idData?.charging?.chargingStatus?.value?.chargingState === 'readyForCharging';
            const isReduced = this.platform.vwConn.idData?.charging?.chargingSettings?.value?.maxChargeCurrentAC === 'reduced';
            const highTariffKmTreshold = this.accessory?.context?.device?.highTariffKmTreshold;
            const lowTariffKmTreshold = this.accessory?.context?.device?.lowTariffKmTreshold;
            const minRedeliveryTreshold = -1 * this.accessory?.context?.device?.minRedeliveryTreshold;
            const maxDeliveryTreshold = this.accessory?.context?.device?.maxDeliveryTreshold;
            const currentMonth = new Date().getMonth() + 1; 
            const targetSolarRange = lowTariffKmTreshold + (range / currentSOC * targetSOC - lowTariffKmTreshold) * this.getMonthlyFraction(currentMonth);

            if (range < highTariffKmTreshold) {
                if (isReduced) {
                    this.platform.log.info('range below highTariffKmTreshold, setting max charge current');
                    this.platform.vwConn.setChargingSetting('chargeCurrent', 'maximum');
                }
                if (isReadyForCharging) {
                    this.platform.log.info('range below highTariffKmTreshold, start charging');
                    this.platform.vwConn.startCharging();
                }
            } else {
                const url = this.accessory.context.device.energyDataSource;
                this.fetchJSONData(url)
                    .then((data) => {

                        console.log(range);
                        console.log(targetSolarRange);
                        console.log(data.lowTariff);
                        if (range < targetSolarRange && data.lowTariff) {
                            if (isReduced) {
                                this.platform.log.info('range below targetSolarRange, setting maximum charge current');
                                this.platform.vwConn.setChargingSetting('chargeCurrent', 'maximum');
                            }

                            if (isReadyForCharging) {
                                this.platform.log.info('range below targetSolarRange and low tariff, start charging');
                                this.platform.vwConn.startCharging();
                            }
                        } else if (data.minAvg < minRedeliveryTreshold) {

                            if (isCharging && isReduced) {
                                this.platform.log.info('JSON Data minAvg: ', data.minAvg);
                                this.platform.log.info('minute average power < minRedeliveryTreshold, currently charging, so setting maximum charge current');
                                this.platform.vwConn.setChargingSetting('chargeCurrent', 'maximum');
                                return;
                            }
                            if (!isReduced) {
                                this.platform.log.info('JSON Data minAvg: ', data.minAvg);
                                this.platform.log.info('minute average power < minRedeliveryTreshold, currently maximum charge current, setting to reduced');
                                this.platform.vwConn.setChargingSetting('chargeCurrent', 'reduced');
                            }
                            if (isReadyForCharging) {
                                this.platform.log.info('JSON Data minAvg: ', data.minAvg);
                                this.platform.log.info('minute average power < minRedeliveryTreshold, start charging');
                                this.platform.vwConn.startCharging();
                            }

                        } else if (data.minAvg > maxDeliveryTreshold && !isReduced && isCharging) {
                            this.platform.log.info('JSON Data minAvg: ', data.minAvg);
                            this.platform.log.info('minute average power > maxDeliveryTreshold, currently charging at max, so setting to reduced');
                            this.platform.vwConn.setChargingSetting('chargeCurrent', 'reduced');
                            return;
                        } else if (data.minAvg > maxDeliveryTreshold && isCharging) {
                            this.platform.log.info('JSON Data minAvg: ', data.minAvg);
                            this.platform.log.info('minute average power > maxDeliveryTreshold, currently charging, so stop charging');
                            this.platform.vwConn.stopCharging();
                        }

                    })
                    .catch((error) => {
                        this.platform.log.error('Error in fetching energy data: ', error);
                    });
            }
        } catch (error) {
            console.error("Error in smartChargingLoop:", error);
            // Handle the error (e.g., logging, fallback values, etc.)
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

        this.platform.log.info('Set smart charging Characteristic On ->', value);
    }

    async getOn(): Promise<CharacteristicValue> {

        return (this.intervalId != null);
    }

    private getMonthlyFraction(currentMonth: number): number {
        if (currentMonth < 1 || currentMonth > 12) {
            throw new Error("Invalid month. Month should be between 1 and 12.");
        }

        // Calculate the cosine value
        const radians = (2 * Math.PI / 12) * (currentMonth - 6);
        return (1 + Math.cos(radians)) / 2;
    }
    
}
