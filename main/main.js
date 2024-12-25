const {BrowserWindow, ipcMain, globalShortcut} = require('electron')
const url = require('url')
const path = require('path')

const config = require('../common/js/config').file('config')

const utils = require('../common/js/utils')

const plugins = config.get("plugins")

const mainWindow = {
    creat: function(){
        this.win = new BrowserWindow({
            // width: 750, 
            // height: 600, 
            frame: false,
            show: false,
            resizable: false,
            maximizable: false,
            minimizable: false,
            fullscreen: true,
            // transparent: true,
            // alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: true
            }
        })
        this.win.loadFile(path.join(__dirname, './index.html'))
        this.win.once('ready-to-show', () => {
            // this.show()
        })
        this.win.on('blur', () => {
            this.hide()
        })
    },
    init: function(){ 
        this.initConfigData()
        this.creat()
        globalShortcut.register("Alt+Space", _ => {
            if (this.win.isVisible()) {
                this.hide()
            } else {
                this.show()
            }
        })
        this.pluginBuild()
    },
    pluginBuild: function() {
        for(let i = 0; i < plugins.length; i ++) {
            let plugin = plugins[i];
            (_ => {
                if(plugin.auto) {
                    let pluginMain = require("../plugins/" + plugin.code + '/main')
                    // 这里还是要判断一下的，不一定会有auto方法
                    pluginMain.auto ? pluginMain.auto() : ""
                }
            })()
        }
    },
    pluginShow: pluginCode => {

        let pluginWindow = require("../plugins/" + pluginCode + '/main')
        if (!pluginWindow || !pluginWindow.win || pluginWindow.win.isDestroyed()){
            for(let i = 0; i < plugins.length; i ++) {
                let plugin = plugins[i]
                if (plugin.code == pluginCode) {
                    plugin.amount = plugin.amount + 1
                    plugin.lastRun = utils.dateFormat()
                }
            }
        }
        pluginWindow.show()
    },
    show: function(){
        this.win.show()
        mainWindow.win.webContents.send("enter_start_interval")
        // this.win.webContents.openDevTools()
    },
    hide: function(){
        this.win.hide()
        mainWindow.win.webContents.send("hide_clear_interval")
    },
    initConfigData: function() {
        for(let i = 0; i < plugins.length; i ++) {
            let plugin = plugins[i]
            // 2021-01-05 配置文件增加自启动配置和是否显示配置
            // plugin.auto = false // 默认不会自动运行
            // plugin.visiable = true // 默认可见
            // delete plugin.shortcut
            // delete plugin.visiable
            // delete plugin.auto
            // plugin.develop = false
            // delete plugin.usable
        }
        config.set("plugins", plugins)
    }
}

// ipc打开插件窗口
ipcMain.on('show-plugin-window', (event, arg) => {
    mainWindow.pluginShow(arg)
    mainWindow.win.hide()
    config.set("plugins", plugins)
    mainWindow.win.webContents.send("reloadPlugins")
})

module.exports = mainWindow