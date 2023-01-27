import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

export class LocationMotionSensorAccessory {
    private service: Service;

    constructor(
        private readonly platform: WeConnectIDPlatform,
        private readonly accessory: PlatformAccessory,
    ) {
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
            .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) => vin === this.platform.config.weconnect.vin).model)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);

        this.service = this.accessory.getService(this.platform.Service.MotionSensor) || this.accessory.addService(this.platform.Service.MotionSensor);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

        this.service.getCharacteristic(this.platform.Characteristic.MotionDetected)
            .onGet(this.getMotionDetected.bind(this));

        this.platform.idStatusEmitter.on('parked', (data) => {
            if (this.parkedInRange(
                this.accessory.context.device.lat,
                this.accessory.context.device.lon,
                data.lat,
                data.lon,
                this.accessory.context.device.radius)) {
                this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, true);
            }
        });

        this.platform.idStatusEmitter.on('notParked', () => {
            this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, false);
        });


    }

    parkedInRange(lat1, lon1, lat2, lon2, radius) {
        const R = 6371; 
        const dLat = this.deg2rad(lat2 - lat1);  
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; 
        return (d * 1000 <= radius);
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    async getMotionDetected(): Promise<CharacteristicValue> {
        const data = this.platform.vwConn.idData.parking.data;
        const state = this.parkedInRange(
            this.accessory.context.device.lat,
            this.accessory.context.device.lon,
            data.lat,
            data.lon,
            this.accessory.context.device.radius);

        return state;
    }
}
