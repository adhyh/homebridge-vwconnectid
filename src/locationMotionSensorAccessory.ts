import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LocationMotionSensorAccessory {
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
        this.service = this.accessory.getService(this.platform.Service.MotionSensor) || this.accessory.addService(this.platform.Service.MotionSensor);

        // set the service name, this is what is displayed as the default name on the Home app
        // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
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
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);  // deg2rad below
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return (d * 1000 <= radius);
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    async getMotionDetected(): Promise<CharacteristicValue> {
        // implement your own code to check if the device is on
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
