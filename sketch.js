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

// 数値入力が変更されたときにグラフを更新
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', drawCuboid);
});

function drawCuboid() {
    // 入力値を取得
    var x = parseFloat(document.getElementById('value1').value);
    var y = parseFloat(document.getElementById('value2').value);
    var z = parseFloat(document.getElementById('value3').value);

    // 直方体の各頂点の座標を計算
    var vertices = [
        [-x, -y, -z], [ x, -y, -z],
        [ x,  y, -z], [-x,  y, -z],
        [-x, -y,  z], [ x, -y,  z],
        [ x,  y,  z], [-x,  y,  z]
    ];

    // 直方体の辺を構成する点を結ぶためのラインセグメント
    var edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    // 座標軸に対応する x, y, z の値を分けて配列に格納
    var x_vals = [], y_vals = [], z_vals = [];
    for (var i = 0; i < vertices.length; i++) {
        x_vals.push(vertices[i][0]);
        y_vals.push(vertices[i][1]);
        z_vals.push(vertices[i][2]);
    }

    // 原点を大きな点で表示
    var origin = {
        type: 'scatter3d',
        mode: 'markers',
        x: [0],
        y: [0],
        z: [0],
        marker: {
            size: 10,  // 原点のサイズを大きく
            color: 'rgb(0, 0, 0)',  // 黒色
            symbol: 'circle'
        },
        showlegend: false
    };

    // エッジを結ぶためのラインを描画
    var edge_x = [], edge_y = [], edge_z = [];
    for (var i = 0; i < edges.length; i++) {
        var start = edges[i][0];
        var end = edges[i][1];
        edge_x.push(vertices[start][0], vertices[end][0], null);
        edge_y.push(vertices[start][1], vertices[end][1], null);
        edge_z.push(vertices[start][2], vertices[end][2], null);
    }
			
    // 各軸の最大・最小値を取得
    var x_min = Math.min(...x_vals);
    var x_max = Math.max(...x_vals);
    var y_min = Math.min(...y_vals);
    var y_max = Math.max(...y_vals);
    var z_min = Math.min(...z_vals);
    var z_max = Math.max(...z_vals);

    // 最大の範囲に合わせるための調整
    var max_range = Math.max(Math.max(...x_vals), Math.max(...y_vals), Math.max(...z_vals), 0);
    var min_range = Math.min(Math.min(...z_vals), Math.min(...y_vals), Math.min(...x_vals), 0);

    // グラフのレイアウト設定
    var layout = {
        scene: {
            xaxis: {
                title: 'X',
                range: [min_range - 1, max_range + 1]
            },
            yaxis: {
                title: 'Y',
                range: [min_range - 1, max_range + 1]
            },
            zaxis: {
                title: 'Z',
                range: [min_range - 1, max_range + 1]
            },
            aspectmode: 'cube' 
        },
        responsive: true  // レスポンシブにする
    };
			
    // エッジのデータを追加
    var data = [{
        type: 'scatter3d',
        mode: 'lines',
        x: edge_x,
        y: edge_y,
        z: edge_z,
        line: {
            color: 'rgb(255, 0, 0)',
            width: 3
        },
        showlegend: false  // ここで凡例を非表示にする
    }, origin];

    // グラフを描画
    Plotly.newPlot('graph', data, layout);
}
		
function getCurrentTimeString() {
    const now = new Date();
    const year = now.getFullYear() % 100; // 年
    const month = now.getMonth() + 1; // 月（0から始まるため +1）
    const day = now.getDate(); // 日
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const timedata = new Uint8Array(8); // 1バイトのアドレス + 6バイトのデータ
    timedata[0] = 0x03; // アドレスとして使用する1バイト
    timedata[1] = seconds + Math.floor(seconds / 10) * 6;
    timedata[2] = minutes + Math.floor(minutes / 10) * 6;
    timedata[3] = hours + Math.floor(hours / 10) * 6;
    timedata[4] = 0x00;
    timedata[5] = day + Math.floor(day / 10) * 6;
    timedata[6] = month + Math.floor(month / 10) * 6;
    timedata[7] = year + Math.floor(year / 10) * 6;
    rxCharacteristic.writeValue(timedata);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
		
function resetButtons() {
    scanButton.disabled = false;
    sendButton.disabled = true;
    disconnectButton.disabled = true;
    fastRateButton.disabled = true; // Disable Fast Rate button
    slowRateButton.disabled = true; // Disable Slow Rate button
    demoRateButton.disabled = true; // Disable Slow Rate button
}
		
// 接続が切れた場合の処理
function handleDisconnection() {
    resetButtons();
    displayMessage('デバイスが切断されました');
}
		
scanButton.addEventListener('click', async () => {
    try {
        const options = {
            filters: [{ services: [UART_SERVICE_UUID] }],
            optionalServices: [UART_SERVICE_UUID]
        };
        const device = await navigator.bluetooth.requestDevice(options);
        // 接続が切れたときのイベントを設定
        device.addEventListener('gattserverdisconnected', handleDisconnection);
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

        // Immediately send 0x0A after connection
        const dataToSend = new Uint8Array([0x0A]);
        await rxCharacteristic.writeValue(dataToSend);

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

            handleDisconnection();    //handling when a connection is lost
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

        const fastRateData = new Uint8Array(7); // 1バイトのアドレス + 2バイトのデータ
        fastRateData[0] = 0x02; // アドレス
        fastRateData[1] = 6 & 0xFF;
        fastRateData[2] = (6 >> 8) & 0xFF;
        fastRateData[3] = 12 & 0xFF;
        fastRateData[4] = (12 >> 8) & 0xFF;
        fastRateData[5] = 5 & 0xFF;
        fastRateData[6] = (5 >> 8) & 0xFF;

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

        const slowRateData = new Uint8Array(7); // 1バイトのアドレス + 2バイトのデータ
        slowRateData[0] = 0x02; // アドレス
        slowRateData[1] = 6 & 0xFF;
        slowRateData[2] = (6 >> 8) & 0xFF;
        slowRateData[3] = 60 & 0xFF;
        slowRateData[4] = (60 >> 8) & 0xFF;
        slowRateData[5] = 4 & 0xFF;
        slowRateData[6] = (4 >> 8) & 0xFF;

        await rxCharacteristic.writeValue(slowRateData);
        const timeString = getCurrentTimeString();
        displayMessage(`Slow Rate 送信完了( ${timeString} )`);
    } catch (error) {
        console.error('Error during slow rate send:', error);
        displayMessage('エラー: Slow Rate送信に失敗しました');
    }
});
		
function handleDataReceived(event) {
    const value = event.target.value;
    // 受信したデータを解析して、value1, value2, value3に反映
    const receivedData = new Uint8Array(value.buffer);

    // 受信データをvalue1, value2, value3に設定
    if (receivedData[0] == 0x10) {
        const num1 = receivedData[1] | (receivedData[2] << 8);  // 2バイトの数値
        const num2 = receivedData[3] | (receivedData[4] << 8);  // 2バイトの数値
        const num3 = receivedData[5] | (receivedData[6] << 8);  // 2バイトの数値
        value1.value = num1;
        value2.value = num2;
        value3.value = num3;
    }
    else {
        displayMessage('エラー: 不正なデータを受信しました');
    }
}

function preventNegativeInput(event) {
    if (event.target.value < 0) {
        event.target.value = 0;
    }
}
		
// 初期表示で直方体を描画
drawCuboid();
resetButtons();

value1.addEventListener('input', preventNegativeInput);
value2.addEventListener('input', preventNegativeInput);
value3.addEventListener('input', preventNegativeInput);
