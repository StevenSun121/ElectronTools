const {remote, ipcRenderer} = require('electron')

// const config = require('../../common/js/config').file('plugins/_template');

const $ = require('../../common/js/domUtils')

const dict = require('./dict')
const scheme = require('./scheme')

let dictItem

function next() {
    let sheng = dict.list[$.random(dict.list.length)]
    let shengUpper = sheng ? sheng.toUpperCase().slice(0, 1) + sheng.slice(1) : sheng
    let yun = dict[sheng].list[$.random(dict[sheng].list.length)]
    let word = dict[sheng][yun]
    let shengKey = sheng ? scheme.detail.sheng[sheng] : scheme.detail.other[yun][0]
    let yunKey = sheng ? scheme.detail.yun[yun] : scheme.detail.other[yun][1]

    dictItem = {
        "sheng": shengUpper,
        "yun": yun,
        "word": word,
        "shengKey": shengKey,
        "yunKey": yunKey
    }

    $("dict").text(word)
    $("symbol").text(sheng + yun)
    $("shuang").text("")

    keyHover(shengKey)
}

function keyHover(key) {
    let keys = document.getElementsByClassName("Key")
    for(let i = 0; i < keys.length; i++) {
        keys[i].classList.remove("hover")
    }
    $(key).addClass("hover")
}

let shuangNode = $("shuang")
shuangNode.keyup(e => {
    if(e.keyCode >= $.keyCode.a_A && e.keyCode <= $.keyCode.z_Z) {
        switch (shuangNode.value().length) {
            case 1:
                keyHover(dictItem.yunKey)
                break;
            case 2:
                if(shuangNode.value().toUpperCase() == dictItem.shengKey + dictItem.yunKey) {
                    next()
                }else {
                    keyHover(dictItem.shengKey)
                }
                shuangNode.value("")
                break;
        }
    }else {
        if(shuangNode.value().length == 2) {
            shuangNode.value(shuangNode.value().slice(0, 1))
        }
    }
})

document.onclick = function() {
    shuangNode.focus()
}

next()

/**
 * 标题栏按钮
 */

//设置
// document.getElementById("setting").onclick = toggleSetting

//最小化
$("min").click(_ => {
    remote.getCurrentWindow().minimize()
})
// //最大化
// $("max").click(_ => {
//     max.classList.toggle("hide")
//     resize.classList.toggle("hide")
//     remote.getCurrentWindow().maximize()
// })
// //取消最大化
// $("resize").click(_ => {
//     max.classList.toggle("hide")
//     resize.classList.toggle("hide")
//     remote.getCurrentWindow().unmaximize()
// })
//关闭
$("close").click(_ => {
    remote.getCurrentWindow().hide()
})