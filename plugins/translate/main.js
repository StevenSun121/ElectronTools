const {BrowserWindow, ipcMain} = require('electron')
const url = require('url');
const path = require('path');
const childProcess = require('child_process');

// const config = require('../../common/js/config').file('plugins/translate');

const translateWindow = {
    creat: function(){
        this.win = new BrowserWindow({
            width: 450,
            height: 400,
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
            this.isReady = true
            this.sendQuery()
        })
        this.win.on('blur', () => {
            this.isReady = false
            clearInterval(this.focusInterval)
            this.win = this.win.destroy()
        })
    },
    sendQuery: function() {
        if(this.isReady && this.isClip) {
            this.isClip = false
            this.win.show()
            this.win.webContents.send('translateQuery', this.query);
            this.focusLoop()
        }
    },
    show: function(){
        this.focusInterval = 0
        //TODO 有时页面打不开
        if(!this.win)
            this.creat()
        getClipText(query => {
            this.isClip = true
            this.query = query
            this.sendQuery()
        })
    },
    focusLoop: function(){
        clearInterval(this.focusInterval)
        this.focusInterval = setInterval(_ => {
            if(this.win)
                this.win.focus()
        }, 250)
    }
}

function getClipText(callback){
    var clipService = childProcess.exec(path.join(__dirname, './clipService.exe'));
    var isReturn = false;
    clipService.on('close', function(code) {  
        if(callback && !isReturn){
            // console.log("close")
            callback('');
        }
        clipService.kill();
        // console.log('kill')
    }); 
    clipService.stdout.on('data', function(data) {
        // console.log(`stdout: ${data}`);
        if(callback){
            isReturn = true;
            callback(data);
        }
    });
    clipService.stderr.on('data', function (data) { 
        // console.log(`stderr: ${data}`);
    }); 
}

module.exports = translateWindow