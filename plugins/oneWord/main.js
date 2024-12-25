const {BrowserWindow, ipcMain} = require('electron')
const url = require('url');
const path = require('path');

const childProcess = require('child_process');

// const config = require('../../common/js/config').file('plugins/oneWord');
// let oneWord = config.get("oneWord")

const oneWordWindow = {
    creat: function(){
        this.win = new BrowserWindow({
            width: 800,
            height: 550,
            frame: false,
            show: false,
            resizable: false,
            maximizable: false,
            minimizable: false,
            closable: false,
            fullscreenable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            // transparent: true,
            webPreferences: {
                nodeIntegration: true
            }
        })
        this.win.loadURL(url.format({
            pathname: path.join(__dirname, './index.html'),
            protocol: 'file:',
            slashes: true
        }))
        this.win.once('ready-to-show', () => {
            // this.win.webContents.openDevTools()
            this.win.show()
        })
        this.win.on('blur', () => {
            this.loop = false
            this.win.destroy()
        })
        this.autoMove()
    },
    loop: true,
    autoMove: function() {
        this.loop = true
        let interval = setInterval(_=> {
            if (this.loop) {
                childProcess.exec(path.join(__dirname, './autoMove.exe'))
            } else {
                clearInterval(interval)
            }
        }, 1000 * 5)
    },
    show: function(){
        this.creat()
    }
}

module.exports = oneWordWindow