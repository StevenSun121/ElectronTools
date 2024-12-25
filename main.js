const electron = require('electron')
const app = electron.app
const Menu = electron.Menu
const Tray = electron.Tray
const nativeImage = electron.nativeImage
const globalShortcut = electron.globalShortcut
// const os = require('os')
// const BrowserWindow = electron.BrowserWindow
// const ipc = electron.ipcMain
// const fs = require('fs')

const config = require('./common/js/config').file('config');

// 关闭安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true

const mainWindow = require('./main/main')

// const translateWindow = require('./translate/main')
// const todoListWindow = require('./plugin/todoList/main')
// const clock = require('./clock/js/index')
// const douyin = require('./douyin/main')
// const giphy = require('./giphy/js/index')
// const overview = require('./overview/js/index')
// const weiboPic = require('./weiboPic/js/index')

//获取本地配置文件
// let app_dir = os.homedir() + '/.ElectronTools'
// let config_dir = app_dir + '/.common'
// let config_ini = config_dir + '/config.ini'
//配置文件夹创建
// common.mkDir(app_dir)
// common.mkDir(config_dir)
// common.mkFile(config_ini)
//开机启动配置
// let startUp = os.homedir() + '/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup'
// let linkName = 'ElectronTools'
// common.startUp(startUp,linkName)
//配置文件读取
// let config = common.readFile(config_ini) || {
//   clock: true
// }
// let mainWindow
//创建窗口
// const createWindow = () => {
//   mainWindow = new BrowserWindow({
//     width: 1280,
//     height: 800,
//     useContentSize: true,
// webPreferences: {
//   nodeIntegration: false,
//   preload: path.join(__dirname, 'preload.js')
// }
// })

//   mainWindow.loadURL(`file://${__dirname}/renderer/index.html`)

//   mainWindow.on('closed', () => {
//     mainWindow = null
//   })
// }
//任务栏图标
let tray = null
app.on('ready', () => {
    tray = new Tray(nativeImage.createFromPath(__dirname + '/common/img/icon.ico'))
    // //菜单
    // var clockSwitch = config.get("clock").switch;
    const contextMenu = Menu.buildFromTemplate([
        //   {label: '签到', submenu: [
        //     {label: '示例', type: 'normal', click: function(){
        //       clock.remind({time: '00:00',todo: '签到'})
        //     }},
        //     {label: '开启', type: 'checkbox', checked:clockSwitch, click: function(){
        //       clockSwitch = !clockSwitch;
        //       clockSwitch ? clock.init() : clock.destory();
        //       config.set("clock:switch", clockSwitch);
        //     }},
        // {label: '设置', type: 'normal', click: function(){
        //   clock.custom({time: '00:00',todo: '签到'})
        // }}
        // ]},
        // {label: '概览', type: 'normal', click: function(){
        //   overview.init(__dirname)
        // }},
        // {label: 'giphy', type: 'normal', click: function(){
        //   giphy.init()
        // }},
        //   {label: '翻译', type: 'normal', click: function(){
        //     translateWindow.show();
        //   }},
        //   {label: '备忘', type: 'normal', click: function(){
        //     todoListWindow.init();
        //   }},
        //   {label: '抖音', type: 'normal', click: function(){
        //     douyin.show();
        //   }},
        {
            label: '退出', type: 'normal', click: function () {
                // unloadPlugin();
                app.quit();
            }
        }
    ])
    //任务栏图标文字
    // tray.setToolTip()
    tray.setContextMenu(contextMenu)
    // tray.on('click', () => {
    //   tray.setToolTip('index:')
    // })
    // 注册一个 'Alt+R' 的全局快捷键
    // globalShortcut.register('Alt+R', () => {
    //   translateWindow.show();
    // });
    //启动子项目
    // loadPlugin();
    mainWindow.init()
})

// var loadPlugin = () => {
//   config.get("clock").switch && clock.init();
//   translateWindow.init();
//mainWindow.init();
// }

// var unloadPlugin = () => {
//   clock.destory();
//   translateWindow.destory();
// }

app.on('window-all-closed', function () {
    console.log("all close")
})
app.on('will-quit', () => {
    // 清空所有快捷键
    globalShortcut.unregisterAll()
})

// 开机自启
// app.setLoginItemSettings
// https://www.electronjs.org/docs/latest/api/app#appsetloginitemsettingssettings-macos-windows