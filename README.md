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
                "locationMotionSensors": [
                    {
                        "name": "Home",
                        "lat": 52.1234567,
                        "lon": 5.1234567,
                        "radius": 200
                    },
                    {
                        "name": "Work",
                        "lat": 52.2234567,
                        "lon": 4.1234567,
                        "radius": 100
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
* Set charging- and climatisation accessory names. Remove these options to avoid creating the accessories alltogether.
* Select setting switches to be exposed by Homekit. 
* You can add as many motion sensors to `locationMotionSensors` as you like (?). For each item a motion sensor will be created with `name` that triggers whenever the car is parked within `radius` distance around the location  (GPS `lat` and `lon`). Please respect the driver's privacy if using this option.
* You can add even more motion sensors to `eventMotionSensors`. These create a motion sensor with `name` that triggers on a preset event. You can choose from the following list of events:

Events:
* 'statusNotSafe' - car is parked and doors remain unlocked or windows opened for >5 minutes.
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
* 1.0.6: 
* * Added light sensor (lux) that indicates the remaining range in km.
* * Added 'locked' event (motion sensor) that changes state with door (un)lock.
* * 'noExternalPower' event triggers when plug is connected and external power does not become available (charging cannot be started).
* * Prettified backend & plugin log messages.
* 1.0.5: Bugfix events.
* 1.0.4: Add setting switches for climatisation and charging. Set charging 'brightness' for target battery level.
