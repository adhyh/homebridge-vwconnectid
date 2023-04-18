# Homebridge Volkswagen ID.x plugin

This is a plugin for Homebridge to allow controlling your Volkswagen ID series (ID.3, ID.4, ID.5) car through iOS' HomeKit.

Uses the [`npm-vwconnectidapi`](https://github.com/adhyh/npm-vwconnectidapi) module under the hood to communicate with the Volkwagen backend.

## 405 error Login Failed

If you see 405 error Login Failed in your homebridge log, you can fix it by going to http://myvolkswagen.de, login, and accept the (new) terms and conditions. You may need to login multiple times and accept T&C each time.

## Installation

```
$ npm i homebridge-vwconnectid -g
```

Homebridge plugins need to be installed globally, so the `-g` is mandatory.

## Upgrading from 1.0.5 to 1.1.0

The config has slightly changed. the `locationMotionSensors` block is not used anymore. Instead, the `destinations` block is used to configure a location as a destination for navigation (if `address` is specified) and/ or as a location aware motion trigger (if `notificationRadius` is specified). Migrating from 1.0.5 to 1.1.0, if you give the locations the same name, the old location motion sensor accessory will be reused. 

## Speed

Communication between you and the backend and between the backend and the car is slow. Any changes take up to a minute or so to propagate to the car.

## Configuration

First, you need a working Homebridge installation.

Once you have that working, edit `~/.homebridge/config.json` and add a new accessory:

```
"accessories": [
    ...
    {
            "name": "We Connect ID",
            "platform": "WeConnectID",
            "weconnect": {
                "username": "We Connect username",
                "password": "We Connect password",
                "vin": "VIN OF YOUR CAR"
            },
            "options": {
                "logLevel": "NONE",
                "chargingAccessory": "Charging",
                "climatisationAccessory": "Climatisation",
                "remainingRangeAccessory: "Remaining km",
                "destinations": [
                    {
                        "name": "Home",
                        "lat": 52.123456,
                        "lon": 5.123456,
                        "address": {
                            "country": "Nederland",
                            "street": "My street 4",
                            "zipCode": "1234 AA",
                            "city": "My town"
                        },
                        "notificationRadius": 300
                    },
                    {
                        "name": "Work",
                        "lat": 52.234567,
                        "lon": 4.234567,
                        "address": {
                            "country": "Nederland",
                            "street": "Cool street 75",
                            "zipCode": "2345 BB",
                            "city": "Your city"
                        },
                        "notificationRadius": 200
                    }
                ],
                "settingSwitches": [
                    {
                        "name": "Reduced AC",
                        "setting": "reducedAC"
                    },
                    {
                        "name": "Plug Unlock",
                        "setting": "autoUnlockPlug"
                    },
                    {
                        "name": "Climatization at unlock",
                        "setting": "climatizationAtUnlock"
                    },
                    {
                        "name": "Window Heating",
                        "setting": "climatisationWindowHeating"
                    },
                    {
                        "name": "Front Left Zone",
                        "setting": "climatisationFrontLeft"
                    },
                    {
                        "name": "Front Right Zone",
                        "setting": "climatisationFrontRight"
                    }
                ],
                "eventMotionSensors": [
                    {
                        "name": "Car unsafe state",
                        "event": "statusNotSafe"
                    }
                ]
            }
        },
]
```

* The `name` will be the identifier that you can use, for example, in Siri commands;
* Replace `weconnect` options with the correct values;
* set `logLevel` to `NONE`, `DEBUG`, `INFO` or `ERROR`. Set to NONE if you think backend is too chatty. Defaults to ERROR. 
* Set charging, remaining range, and climatisation accessory names. Remove these options to avoid creating the accessories alltogether.
* Select setting switches to be exposed by Homekit. 
* You can add locations to `destinations` block. 
* * If a `notificationRadius` is specified a motion sensor will be created with `name` that triggers whenever the car is parked within `notificationRadius` distance around the location  (GPS `lat` and `lon`). Please respect the driver's privacy if using this option.
* * If an `address` block is specified a switch will be created that sends the destination to your car's navigation system.
* You can add even more motion sensors to `eventMotionSensors`. These create a motion sensor with `name` that triggers on a preset event. You can choose from the following list of events:

Events:
* 'statusNotSafe' - car is parked and doors remain unlocked or windows opened for >5 minutes.
* 'locked' - Indicates lock state
* 'parked' - Car is parked. Emits parking position as argument.
* 'notParked' - Car is on the move.
* 'chargePurposeReached' - Target state of charge reached.
* 'chargingStarted' - Charging started.
* 'chargingStopped' - Charging stopped.
* 'noExternalPower' - Plug is connected and external power does not become available (charging cannot be started).
* 'currentSOC' - Actuel state of charge changed. Emits SOC as argument.
* 'climatisationStopped' - Climatisation stopped.
* 'climatisationStarted' - Climatisation started.
* 'climatisationCoolingStarted' - Climatisation started cooling.
* 'climatisationHeatingStarted' - Climatisation started heating.
* 'climatisationTemperatureUpdated' - Target climatisation temperature changed.

## Charging accessory
* Creates a switch for charging start and stop.
* The switch contains a Lightbulb service to (visually) indicate current state of charge in percent. It can also be used to set the target charge percentage of the battery (>= 50%).
* Contains a BatteryLevel service, so you can ask siri as well
* Creates a motion sensor that triggers when the target charge level is reached

## Motion sensors
* One motion sensor is created that triggers whenever your car is parked and remains in an unsafe state (windows open, doors unlocked) for >5 minutes.

## Climatisation
* Set climatisation temperature 
* Set climatisation on and off. Setting the temperature doesn't automatically trigger on/ off state.

## Changelog
* 1.1.0: 
* * Added switches to send a destination to your car's navigation system.
* * Added light sensor (lux) that indicates the remaining range in km.
* * Added 'locked' event (motion sensor) that changes state with door (un)lock.
* * 'noExternalPower' event triggers when plug is connected and external power does not become available (charging cannot be started).
* * Prettified backend & plugin log messages.
* 1.0.5: Bugfix events.
* 1.0.4: Add setting switches for climatisation and charging. Set charging 'brightness' for target battery level.
