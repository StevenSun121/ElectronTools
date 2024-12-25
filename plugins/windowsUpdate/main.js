const {BrowserWindow, ipcMain} = require('electron')
const url = require('url')
const path = require('path')

// const config = require('../../common/js/config').file('plugins/_template');

const mainWindow = {
    creat: function(){
        this.win = new BrowserWindow({
            width: 800, 
            height: 600, 
            show: false,
            frame: false,
            skipTaskbar: true,
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
            this.win.setFullScreen(true)
            this.win.setAlwaysOnTop(true, "screen-saver")
            this.win.focus()
        })
        this.win.on('hide', _ => {
            this.win = this.win.destroy()
        })
    },
    show: function() {
        (this.win && !this.win.isDestroyed()) ? this.win.show() : this.creat()
    }
}

module.exports = mainWindow