const {BrowserWindow, ipcMain} = require('electron')
const url = require('url');
const path = require('path');

const cancelTitleBarMenu = require('../../common/js/cancelTitleBarMenu')

const musicWindow = {
    creat: function(){
        this.win = new BrowserWindow({
            width: 850,
            height: 550,
            frame: false,
            show: false,
            resizable: false,
            maximizable: false,
            minimizable: false,
            closable: false,
            fullscreenable: false,
            // transparent: true,
            webPreferences: {
                nodeIntegration: true,
                webSecurity: false
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
        this.win.on('closed', _ => {
            this.win = this.win.isDestroyed() ? undefined : this.win.destroy()
            this.lrcWin = this.lrcWin ? this.lrcWin.destroy() : null
        })
    },
    show: function(){
        (this.win && !this.win.isDestroyed()) ? this.win.show() : this.creat()
    }
}

ipcMain.on("creatLrcWindow", (event, args) => {
    if (musicWindow.lrcWin) {
        return
    }
    musicWindow.lrcWin = new BrowserWindow({
        width: 1200,
        height: args.single ? 60 : 100,
        frame: false,
        show: false,
        resizable: false,
        maximizable: false,
        minimizable: false,
        closable: false,
        fullscreenable: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
        }
    })
    musicWindow.lrcWin.loadURL(url.format({
        pathname: path.join(__dirname, './lrc.html'),
        protocol: 'file:',
        slashes: true
    }))
    musicWindow.lrcWin.once('ready-to-show', () => {
        // musicWindow.lrcWin.webContents.openDevTools()
        musicWindow.lrcWin.setPosition(args.position[0], args.position[1])
        musicWindow.lrcWin.setIgnoreMouseEvents(args.locked, { 'forward': true})
        musicWindow.lrcWin.webContents.send("currentLrc", args.lrc)
        cancelTitleBarMenu(musicWindow.lrcWin)
        musicWindow.lrcWin.show()
    })
    musicWindow.lrcWin.on("focus", _ => {
        musicWindow.lrcWin.webContents.send("lrcWindowFocused", true)
    })
    musicWindow.lrcWin.on("blur", _ => {
        musicWindow.lrcWin.webContents.send("lrcWindowFocused", false)
        musicWindow.win.webContents.send("lrcWindowMovePosition", musicWindow.lrcWin.getPosition())
    })
})

ipcMain.on("currentLrc", (event, arg) => {
    if(musicWindow.lrcWin) {
        musicWindow.lrcWin.webContents.send("currentLrc", arg)
    }
})

ipcMain.on("lockLrcWindow", (event,arg) => {
    if(musicWindow.lrcWin) {
        musicWindow.lrcWin.setIgnoreMouseEvents(arg, { 'forward': true})
    }
})

ipcMain.on("LrcWindowLrcSingle", (event,arg) => {
    if(musicWindow.lrcWin) {
        musicWindow.lrcWin.setSize(1200, arg ? 60 : 100)
        musicWindow.lrcWin.setContentSize(1200, arg ? 60 : 100)
    }
})

ipcMain.on("destroyLrcWindow", (event, arg) => {
    if(musicWindow.lrcWin) {
        musicWindow.lrcWin = musicWindow.lrcWin.destroy()
    }
})
module.exports = musicWindow