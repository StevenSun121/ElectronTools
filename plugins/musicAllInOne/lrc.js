const {remote, ipcRenderer} = require('electron')

var body = document.body
var currentLine = document.getElementById("currentLine")
var nextLine = document.getElementById("nextLine")

//更新歌词
ipcRenderer.on("currentLrc", (event, arg) => {
    currentLine.innerText = arg.currentLine
    nextLine.innerText = arg.nextLine
})

//解锁/锁定歌词时改变背景  首次获得焦点时不改变背景
let firstTimeFocused = false
ipcRenderer.on("lrcWindowFocused", (event, arg) => {
    if(!firstTimeFocused) {
        firstTimeFocused = true
        remote.getCurrentWindow().blur()
        return
    }
    arg ? body.classList.add("move") : body.classList.remove("move")
})

/**
 * 鼠标穿透
 * 这里有问题 在 ignore 为 true 时 forward
 * 只能触发一次 onmouseenter  无法触发 onmouseleave
 * onmousemove 可以触发多次 
 * 考虑到cpu负载
 * 不监控此方法
 * 可能是开启了开发者工具的问题
 * 在任务栏小图标处添加 解锁/锁定 方法
 */
// remote.getCurrentWindow().setIgnoreMouseEvents(true)