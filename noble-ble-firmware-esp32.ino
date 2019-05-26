/*
    Based on Neil Kolban example for IDF: https://github.com/nkolban/esp32-snippets/blob/master/cpp_utils/tests/BLE%20Tests/SampleServer.cpp
    Ported to Arduino ESP32 by Evandro Copercini
    updates by chegewara
*/

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

// See the following for generating UUIDs:
// https://www.uuidgenerator.net/

BLEServer* pServer = NULL;
BLECharacteristic* readWriteCharacteristic = NULL;
BLECharacteristic* notifyCharacteristic = NULL;

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define READ_WRITE_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define NOTIFY_CHARACTERISTIC_UUID "83866e18-a529-44c2-9250-f82ac976aac5"

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE work!");

  BLEDevice::init("BLE Noble");
  
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  readWriteCharacteristic = pService->createCharacteristic(
                                 READ_WRITE_CHARACTERISTIC_UUID,
                                 BLECharacteristic::PROPERTY_READ |
                                 BLECharacteristic::PROPERTY_WRITE
                               );
  readWriteCharacteristic->addDescriptor(new BLE2902());
  readWriteCharacteristic->setValue("test123");

  notifyCharacteristic = pService->createCharacteristic(
                                 NOTIFY_CHARACTERISTIC_UUID,
                                 BLECharacteristic::PROPERTY_NOTIFY
                               );
  notifyCharacteristic->addDescriptor(new BLE2902());
  
  pService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // functions that help with iPhone connections issue
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("Characteristic defined! Now you can read it in your phone!");
}

unsigned long now = 0;
unsigned long seconds = 0;

void loop() {
  now = millis();
  long s = round(now / 1000);
  if (seconds != s) {
    seconds = s;
    Serial.println(String(seconds));

    unsigned char value[] = {seconds};
    notifyCharacteristic->setValue(value, 2);
    notifyCharacteristic->notify();
    
  }
}
