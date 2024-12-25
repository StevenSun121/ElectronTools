const {BrowserWindow, ipcMain} = require('electron')
const url = require('url')
const path = require('path')

const cancelTitleBarMenu = require('../../common/js/cancelTitleBarMenu')

const idcardWindow = {
    creat: function(){
        this.win = new BrowserWindow({
            width: 600, 
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
            // this.win.webContents.openDevTools()
            cancelTitleBarMenu(this.win)
            this.win.show()
        })
        this.win.on('hide', _ => {
            this.win = this.win.destroy()
        })
    },
    show: function() {
        (this.win && !this.win.isDestroyed()) ? this.win.show() : this.creat()
    }
}

module.exports = idcardWindow