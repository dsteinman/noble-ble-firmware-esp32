var async = require('async');
var noble = require('@abandonware/noble');

var peripheralIdOrAddress = process.argv[2]? process.argv[2].toLowerCase() : '240ac4121576'; //b6fccf36ef6f419995b3b31c4eb972c6

noble.on('stateChange', function (state) {
	if (state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
	}
});

noble.on('discover', function (peripheral) {
	if (peripheral.id === peripheralIdOrAddress || peripheral.address === peripheralIdOrAddress) {
		noble.stopScanning();
		
		console.log('peripheral with ID ' + peripheral.id + ' found');
		var advertisement = peripheral.advertisement;
		
		var localName = advertisement.localName;
		var txPowerLevel = advertisement.txPowerLevel;
		var manufacturerData = advertisement.manufacturerData;
		var serviceData = advertisement.serviceData;
		var serviceUuids = advertisement.serviceUuids;
		
		if (localName) {
			console.log('  Local Name        = ' + localName);
		}
		
		if (txPowerLevel) {
			console.log('  TX Power Level    = ' + txPowerLevel);
		}
		
		if (manufacturerData) {
			console.log('  Manufacturer Data = ' + manufacturerData.toString('hex'));
		}
		
		if (serviceData) {
			console.log('  Service Data      = ' + JSON.stringify(serviceData, null, 2));
		}
		
		if (serviceUuids) {
			console.log('  Service UUIDs     = ' + serviceUuids);
		}
		
		console.log();
		
		explore(peripheral);
	}
});

function explore(peripheral) {
	console.log('services and characteristics:');
	
	peripheral.on('disconnect', function () {
		process.exit(0);
	});
	
	peripheral.connect(function (error) {
		console.log('connected');
		
		peripheral.discoverServices([], function (error, services) {
			console.log('services', services.length);
			
			var serviceIndex = 0;
			
			async.whilst(
				function () {
					return (serviceIndex < services.length);
				},
				function (callback) {
					var service = services[serviceIndex];
					var serviceInfo = service.uuid;
					
					if (service.name) {
						serviceInfo += ' (' + service.name + ')';
					}
					console.log(serviceInfo);
					
					service.discoverCharacteristics([], function (error, characteristics) {
						console.log('characteristics', characteristics.length);
						
						var characteristicIndex = 0;
						
						async.whilst(
							function () {
								return (characteristicIndex < characteristics.length);
							},
							function (callback) {
								var characteristic = characteristics[characteristicIndex];
								var characteristicInfo = '  ' + characteristic.uuid;
								
								if (characteristic.name) {
									characteristicInfo += ' (' + characteristic.name + ')';
								}
								
								async.series([
									function (callback) {
										characteristic.discoverDescriptors(function (error, descriptors) {
											console.log('descriptors', descriptors.length);
											async.detect(
												descriptors,
												function (descriptor, callback) {
													if (descriptor.uuid === '2901') {
														return callback(descriptor);
													} else {
														return callback();
													}
												},
												function (userDescriptionDescriptor) {
													if (userDescriptionDescriptor) {
														userDescriptionDescriptor.readValue(function (error, data) {
															if (data) {
																characteristicInfo += ' (' + data.toString() + ')';
															}
															callback();
														});
													} else {
														callback();
													}
												}
											);
										});
									},
									function (callback) {
										characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');
										
										if (characteristic.properties.indexOf('read') !== -1) {
											characteristic.read(function (error, data) {
												if (data) {
													var string = data.toString('ascii');

													characteristicInfo += '\n    value       ' + data.toString('hex') + ' | \'' + string + '\'';
												}
												callback();
											});

											// read & write
											if (characteristic.properties.indexOf('write') !== -1) {
												console.log('writing...');
												var newvalue = 'test'+Math.random().toString().substring(2,5);
												var buf = Buffer.from(newvalue);
												characteristic.write(buf, false, function (e) {
													console.log('wrote', buf);

													// try reading again
													characteristic.read(function (error, data) {
														if (data) {
															var string = data.toString('ascii');
															console.log('new value:', string);
														}
													});
												});
											}
										} else if (characteristic.properties.indexOf('notify') !== -1) {
											console.log('found notify');
											
											characteristic.on('data', function (data) {
												var value = data.readUIntBE(0, 1);
												console.log('notify:', value); // never gets called
											});
											
											characteristic.subscribe(function () {
												console.log('subscribed'); // never gets called
											});
											
											console.log('after subscribe'); // does get called but all BLE communication stops here
											
											callback();
										} else {
											callback();
										}
									},
									function () {
										console.log(characteristicInfo);
										characteristicIndex++;
										callback();
									}
								]);
							},
							function (error) {
								serviceIndex++;
								callback();
							}
						);
					});
				},
				function (err) {
					// peripheral.disconnect();
				}
			);
		});
	});
}


// xx
