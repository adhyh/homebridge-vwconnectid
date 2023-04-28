import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import * as vwapi from 'npm-vwconnectidapi';
import { WeConnectIDPlatform } from './platform';

export class RouteSwitchAccessory {
    private service: Service;

    constructor(
        private readonly platform: WeConnectIDPlatform,
        private readonly accessory: PlatformAccessory,
    ) {
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volkswagen')
            .setCharacteristic(this.platform.Characteristic.Model, this.platform.vwConn.vehicles.data.find(({ vin }) =>
                vin === this.platform.config.weconnect.vin).model)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.weconnect.vin);

        this.service = this.accessory.getService(this.platform.Service.Switch) ||
            this.accessory.addService(this.platform.Service.Switch);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.route.name);

        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.getOn.bind(this))
            .onSet(this.setOn.bind(this));
    }

    async getOn(): Promise<CharacteristicValue> {
        return false;
    }

    async setOn(value: CharacteristicValue) {

        try {
            if (value as boolean) {

                let destination = {};
                let destinations = new Array();

                for (const dest of this.accessory.context.route.stopovers) {
                    const stopover = {
                        poiProvider: 'unknown',
                        destinationType: 'stopover',
                        destinationName: dest.name,
                        address: dest.address,
                        geoCoordinate: { longitude: dest.lon, latitude: dest.lat }
                    };
                    destinations.push(stopover);
                };

                destination['destinations'] = destinations;

                console.log(JSON.stringify(destination));
                this.platform.vwConn.setDestination(destination);

                setTimeout(() => {
                    this.accessory.getService(this.platform.Service.Switch)!.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                }, 500);
            }
        } catch (err) {
            console.log(err);
        }
    }
}
