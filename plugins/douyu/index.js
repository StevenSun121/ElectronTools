const {remote, ipcRenderer} = require('electron')

// const config = require('../../common/js/config').file('plugins/_template');

const $ = require('../../common/js/domUtils')

const Barrage = require('./danmu');
// const ROOM_ID = '4615502';
// const ROOM_ID = '3544169';

$("link").click(_=>{
    linkRoom($("room").value())
})

function linkRoom(roomID) {
    let server = new Barrage(roomID);
    server.start((msg) => {
    
        if(msg.type == "chatmsg") {
            addDanmu(msg.txt)
        }else {
            // console.log(msg);
        }
    
    });
    $("setting").hide()
} 

let danmu = $("danmu")

// 创建弹幕
function addDanmu(msg) {
    let li = $.creat("li")
    li.text(msg)
    danmu.append(li)
    clearDanmu()
}

// 清空历史弹幕
function clearDanmu() {
    if(danmu.children().length > 40) {
        danmu.firstChild().remove()
    }
    danmu.scrollTo(0,danmu.scrollHeight());
}

$("close").click(function() {
    remote.getCurrentWindow().hide()
})