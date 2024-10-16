const scanButton = document.getElementById('scanButton');
const disconnectButton = document.getElementById('disconnectButton');
const sendButton = document.getElementById('sendButton');
const fastRateButton = document.getElementById('fastRateButton');
const slowRateButton = document.getElementById('slowRateButton');
const messageDiv = document.getElementById('messageDiv');
const value1 = document.getElementById('value1');
const value2 = document.getElementById('value2');
const value3 = document.getElementById('value3');

const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'; // Nordic UART Service UUID
const UART_RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // RX Characteristic UUID
const UART_TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // TX Characteristic UUID

let device, server, uartService, txCharacteristic, rxCharacteristic;

function displayMessage(message) {
    messageDiv.textContent = message;
}

function getCurrentTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

scanButton.addEventListener('click', async () => {
    try {
        const options = {
            filters: [{ services: [UART_SERVICE_UUID] }],
            optionalServices: [UART_SERVICE_UUID]
        };
        const device = await navigator.bluetooth.requestDevice(options);
        await connectToDevice(device);
    } catch (error) {
        console.error('Error during scan:', error);
        displayMessage('エラー: デバイスが見つかりませんでした');
    }
});

async function connectToDevice(selectedDevice) {
    try {
        device = selectedDevice;
        displayMessage('接続中...');

        server = await device.gatt.connect();
        uartService = await server.getPrimaryService(UART_SERVICE_UUID);
        txCharacteristic = await uartService.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);
        rxCharacteristic = await uartService.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);

        // Set up notifications for incoming data
        txCharacteristic.addEventListener('characteristicvaluechanged', handleDataReceived);
        await txCharacteristic.startNotifications();

        sendButton.disabled = false;
        fastRateButton.disabled = false; // Enable Fast Rate button
        slowRateButton.disabled = false; // Enable Slow Rate button
        disconnectButton.disabled = false;
        displayMessage('接続完了');
    } catch (error) {
        console.error('Error during connection:', error);
        displayMessage('エラー: デバイスと接続できませんでした');
    }
}

disconnectButton.addEventListener('click', async () => {
    try {
        if (server) {
            await server.disconnect();
            server = null;
            uartService = null;
            txCharacteristic = null;
            rxCharacteristic = null;

            disconnectButton.disabled = true;
            sendButton.disabled = true;
            fastRateButton.disabled = true; // Disable Fast Rate button
            slowRateButton.disabled = true; // Disable Slow Rate button
            displayMessage('デバイスが切断されました');
        }
    } catch (error) {
        console.error('Error during disconnection:', error);
        displayMessage('エラー: デバイスを切断できませんでした');
    }
});

sendButton.addEventListener('click', async () => {
    try {
        if (!rxCharacteristic) {
            displayMessage('エラー: デバイスと接続できませんでした');
            return;
        }

        const num1 = parseInt(value1.value, 10) || 0;
        const num2 = parseInt(value2.value, 10) || 0;
        const num3 = parseInt(value3.value, 10) || 0;

        if (num1 < 0 || num1 > 65535 || num2 < 0 || num2 > 65535 || num3 < 0 || num3 > 65535) {
            displayMessage('エラー: 入力不可の値が含まれています');
            return;
        }

        const data = new Uint8Array(7); // 1バイトのアドレス + 6バイトのデータ
        data[0] = 0x01; // アドレスとして使用する1バイト
        data[1] = num1 & 0xFF;
        data[2] = (num1 >> 8) & 0xFF;
        data[3] = num2 & 0xFF;
        data[4] = (num2 >> 8) & 0xFF;
        data[5] = num3 & 0xFF;
        data[6] = (num3 >> 8) & 0xFF;

        await rxCharacteristic.writeValue(data);

        // Get current time
        const timeString = getCurrentTimeString();
        displayMessage(`データ送信完了( ${timeString} )`);
    } catch (error) {
        console.error('Error during data send:', error);
        displayMessage('エラー: データ送信に失敗しました');
    }
});

// Fast Rate button event listener
fastRateButton.addEventListener('click', async () => {
    try {
        if (!rxCharacteristic) {
            displayMessage('エラー: デバイスと接続できませんでした');
            return;
        }

        const fastRateData = new Uint8Array(3); // 1バイトのアドレス + 2バイトのデータ
        fastRateData[0] = 0x02; // アドレス
        fastRateData[1] = 6 & 0xFF;
        fastRateData[2] = (6 >> 8) & 0xFF;
		fastRateData[3] = 12 & 0xFF;
        fastRateData[4] = (12 >> 8) & 0xFF;

        await rxCharacteristic.writeValue(fastRateData);
        const timeString = getCurrentTimeString();
        displayMessage(`Fast Rate 送信完了( ${timeString} )`);
    } catch (error) {
        console.error('Error during fast rate send:', error);
        displayMessage('エラー: Fast Rate送信に失敗しました');
    }
});

// Slow Rate button event listener
slowRateButton.addEventListener('click', async () => {
    try {
        if (!rxCharacteristic) {
            displayMessage('エラー: デバイスと接続できませんでした');
            return;
        }

        const slowRateData = new Uint8Array(3); // 1バイトのアドレス + 2バイトのデータ
        slowRateData[0] = 0x03; // アドレス
        slowRateData[1] = 10 & 0xFF;
        slowRateData[2] = (10 >> 8) & 0xFF;
		slowRateData[3] = 100 & 0xFF;
        slowRateData[4] = (100 >> 8) & 0xFF;

        await rxCharacteristic.writeValue(slowRateData);
        const timeString = getCurrentTimeString();
        displayMessage(`Slow Rate 送信完了( ${timeString} )`);
    } catch (error) {
        console.error('Error during slow rate send:', error);
        displayMessage('エラー: Slow Rate送信に失敗しました');
    }
});

function handleDataReceived(event) {
    // Handle received data if needed
}

function preventNegativeInput(event) {
    if (event.target.value < 0) {
        event.target.value = 0;
    }
}

value1.addEventListener('input', preventNegativeInput);
value2.addEventListener('input', preventNegativeInput);
value3.addEventListener('input', preventNegativeInput);
