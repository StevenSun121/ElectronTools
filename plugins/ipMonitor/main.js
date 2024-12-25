const {BrowserWindow, ipcMain} = require('electron')
const url = require('url')
const path = require('path')
const request = require('request')
const exec = require('child_process').exec

// const config = require('../../common/js/config').file('plugins/ipMonitor');

const cancelTitleBarMenu = require('../../common/js/cancelTitleBarMenu')

const mainWindow = {
    creat: function(){
        this.win = new BrowserWindow({
            width: 800, 
            height: 600, 
            frame: false,
            show: false,
            // resizable: false,
            maximizable: false,
            minimizable: false,
            fullscreenable: false,
            closable: false,
            // skipTaskbar: true,
            // transparent: true,
            webPreferences: {
                nodeIntegration: true
            },
            icon: path.join(__dirname, './img/logo-32.png')
        })
        this.win.loadURL(url.format({
            pathname: path.join(__dirname, './index.html'),
            protocol: 'file:',
            slashes: true
        }))
        this.win.once('ready-to-show', () => {
            this.win.webContents.openDevTools()
            cancelTitleBarMenu(this.win)
            this.win.show()
        })
        this.win.on('hide', _ => {
            this.win = this.win.destroy()
        })
        // this.win.on('blur', () => {
        //     this.win.hide()
        // })
    },
    show: function() {
        // (this.win && !this.win.isDestroyed()) ? this.win.show() : this.creat()
        request('https://api.ipify.org/', function (err, response, body) {
            if (!err && response.statusCode == 200) {
                mainWindow.retry = 0
                let ip = body.trim()
                exec('clip').stdin.end(ip)
            }
        })
    },
    auto: function() {
        this.ip = config.get("ip")
        this.retry = 0
        setInterval(_ => {
            this.monitor()
        }, 1000 * 60 * 10)
    },
    monitor: function() {
        request('http://ip-api.com/line/?fields=query', function (err, response, body) {
            if (!err && response.statusCode == 200) {
                mainWindow.retry = 0
                let newIp = body.trim()
                if (mainWindow.ip != newIp) {
                    mainWindow.ip = newIp
                    config.set("ip", newIp)
                    // 变动邮件

                }
            } else {
                mainWindow.retry = mainWindow.retry + 1
                if (mainWindow.retry == 15) { // 5分钟都得不到正确IP地址
                    // 错误邮件
                } else if (mainWindow.retry > 15) { // 断网了那就是
                       
                } else {
                    setTimeout(_ => {
                        mainWindow.monitor()
                    }, 1000 * 20)
                }
            }
        })
    }
}

module.exports = mainWindow