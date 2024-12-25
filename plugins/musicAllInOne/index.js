const {remote, ipcRenderer, shell, nativeImage} = require('electron')
const http = require('http');
const request = require('request');
const path = require('path');
const fs = require('fs');
const { Menu, MenuItem } = remote

const config = require('../../common/js/config').file('plugins/musicAllInOne');

const $ = require('../../common/js/domUtils')

const search = require('./search')

var playerConfig = config.get("playerConfig")
var playerStatus = config.get("playerStatus")
var musicSearch = config.get("musicSearch")
var musicLocal = config.get("musicLocal")
var musicHistory = config.get("musicHistory")

//搜索框获取焦点时，按空格不会暂停歌曲
var searchSpace = false

/**
 * 基础方法
 */

//同步播放设置
function configSync() {
    config.set("playerConfig", playerConfig)
}

//同步播放状态
function statusSync() {
    config.set("playerStatus", playerStatus)
}

//同步查询结果
function searchSync() {
    config.set("musicSearch", musicSearch)
}

//同步本地列表
function localSync() {
    config.set("musicLocal", musicLocal)
}

//同步播放历史
function historySync() {
    config.set("musicHistory", musicHistory)
}

//网站代码转名称
function siteCodeToName(site) {
    let name = ""
    switch (site) {
        case 'netease':
            name = "网易云"
            break;
        case 'qq':
            name = "QQ音乐"
            break;
    }
    return name
}

//时长格式化
function timeFormate(time) {
    return $.numFill(parseInt(time / 60)) + ":" + $.numFill(time % 60)
}

//上次收听时间格式化
function lastTimeFormat(time) {
    let between = Date.parse(new Date()) - time
    if(between < 1000 * 60) {
        return "刚刚"
    }else if(between < 1000 * 60 * 60) {
        return parseInt(between /(1000 * 60)) + "分钟前"
    }else if(between < 1000 * 60 * 60 * 24) {
        return parseInt(between /(1000 * 60 * 60)) + "小时前"
    }else {
        let last = new Date(time)
        return last.getFullYear() + "-" + $.numFill(last.getMonth() + 1) + "-" + $.numFill(last.getDate())
    }
}

//根据歌曲信息生成歌曲链接
function getLocalMusicFileInfo(data) {
    let file = data.name + "-" + data.author
    return {
        "file"  : file,
        "music" : playerConfig.localURL + "music/" + file + "." + data.mtype,
        "pic"   : playerConfig.localURL + "pic/" + file + "." + data.ptype,
        "lrc"   : playerConfig.localURL + "lrc/" + file + ".lrc",
    }
}

/**
 * 功能列表点击展示对应功能
 */

var currentContainer = "musicPlayFunc"
//正在播放功能点击
$("musicPlayFunc").click(_ => {
    if(currentContainer != "musicPlayFunc") {
        $("musicPlayContainer").show()
        $("musicListContainer").hide()
        $("musicSearchCondition").hide()
        $("musicPlayFunc").addClass("hover")
        $(currentContainer).removeClass("hover")
        currentContainer = "musicPlayFunc"
        $("musicLrcUl").scrollTop(lrcNodes[currentLrcLine].offsetTop - 251)
    }
})

//音乐搜索功能点击
$("musicSearchFunc").click(_ => {
    if(currentContainer != "musicSearchFunc") {
        $("musicPlayContainer").hide()
        $("musicListContainer").show()
        $("musicSearchCondition").show()
        $("musicSearchFunc").addClass("hover")
        $(currentContainer).removeClass("hover")
        currentContainer = "musicSearchFunc"

        $("musicListOl").html("")
        let ol = $(document.createElement("li"))

        ol.append("<span style='width: 30px;'>序号</span>")
            .append("<span style='width: 200px;'>标题</span>")
            .append("<span style='width: 130px;'>歌手</span>")
            .append("<span style='width: 60px;'>网站</span>")
            .append("<span style='width: 60px;'>时长</span>")
            .append("<span style='width: 60px;'>操作</span>")

        $("musicListOl").append(ol)

        $("musicListUl").html("")
        
        buildSearchResultList()
    
        $("musicSearchInput").value(musicSearch.query),
        $("musicSearchTypeValue").value(musicSearch.type)
        $("musicSearchType").value(musicSearch.type_name)
        $("musicSearchSiteValue").value(musicSearch.site)
        $("musicSearchSite").value(musicSearch.site_name)
    }
})

//本地音乐功能点击
$("musicLocalFunc").click(_ => {
    $("musicPlayContainer").hide()
    $("musicListContainer").show()
    $("musicSearchCondition").hide()
    if(currentContainer != "musicLocalFunc") {
        $("musicLocalFunc").addClass("hover")
        $(currentContainer).removeClass("hover")
        currentContainer = "musicLocalFunc"
        $("musicListOl").html("")

        let ol = $(document.createElement("li"))

        ol.append("<span style='width: 30px;'>序号</span>")
            .append("<span style='width: 230px;'>标题</span>")
            .append("<span style='width: 180px;'>歌手</span>")
            .append("<span style='width: 60px;'>时长</span>")
            .append("<span style='width: 60px;'>操作</span>")

        $("musicListOl").append(ol)

        $("musicListUl").html("")
        
        for (let index = 0; index < musicLocal.length; index++) {
            let data = musicLocal[index]
    
            let li = $(document.createElement("li"))
    
            li.append("<span style='width: 30px;'>" + (index + 1) + "</span>")
                .append("<span style='width: 230px;'>" + data.name + "</span>")
                .append("<span style='width: 180px;'>" + data.author + "</span>")
                .append("<span style='width: 60px;'>" + timeFormate(data.time) + "</span>")
                .append("<div class='delete'></div>", _ =>{

                remote.dialog.showMessageBox(remote.getCurrentWindow(), {
                    // type        : "question",
                    buttons     : ["删除", "取消"],
                    defaultId   : 1,
                    title       : "删除歌曲",
                    message     : "是否删除歌曲" + data.name,
                    // detail      : "detail",
                    // icon        : nativeImage.createFromPath(path.join(__dirname, "./img/delete-hover.png")),
                    cancelId    : 1,
                    noLink      : true
                }).then(data => {
                    return new Promise(resolve => {
                        console.log(data.response)
                        if(data.response == 0) {
                            musicDelete(index)
                        }
                        resolve()
                    })
                    
                })
            })
            
            li.dblclick(_ => {
                buildSetMusicInfo(index, true)
            })
    
            $("musicListUl").append(li)
        }
    }
})

//播放历史功能点击
$("musicHistoryFunc").click(_ => {
    $("musicPlayContainer").hide()
    $("musicListContainer").show()
    $("musicSearchCondition").hide()

    if(currentContainer != "musicHistoryFunc") {
        $("musicHistoryFunc").addClass("hover")
        $(currentContainer).removeClass("hover")
        currentContainer = "musicHistoryFunc"
        $("musicListOl").html("")

        let ol = $(document.createElement("li"))

        ol.append("<span style='width: 30px;'>序号</span>")
            .append("<span style='width: 230px;'>标题</span>")
            .append("<span style='width: 180px;'>歌手</span>")
            .append("<span style='width: 120px;'>上次收听</span>")

        $("musicListOl").append(ol)

        $("musicListUl").html("")

        for (let index = 0; index < musicHistory.length; index++) {
            let data = musicHistory[index]
    
            let li = $(document.createElement("li"))
    
            li.append("<span style='width: 30px;'>" + (index + 1) + "</span>")
            li.append("<span style='width: 230px;'>" + data.name + "</span>")
            li.append("<span style='width: 180px;'>" + data.author + "</span>")
            li.append("<span style='width: 120px;'>" + lastTimeFormat(data.last) + "</span>")
    
            $("musicListUl").append(li)
        }
    }
})

//构建查询结果列表
function buildSearchResultList(startIndex) {

    if($("musicListUl").children().length == 0 && musicSearch.data.length > 0) {
        $("musicListUl").append("<li><span style='width: 600px;text-align: center;'>加载下一页</span></li>", _ => {
            musicSearch.page = musicSearch.page + 1
            musicSearchResult()
        })
    }

    var loadPageLi = $("musicListUl").lastChild()

    for (let index = startIndex || 0; index < musicSearch.data.length; index++) {
        let data = musicSearch.data[index]

        let li = $(document.createElement("li"))

        let delLine = data.url ? "'>" : " text-decoration: line-through;'>"

        li.append("<span style='width: 30px;" + delLine + (index + 1) + "</span>")
            .append("<span style='width: 200px;" + delLine + data.name + "</span>")
            .append("<span style='width: 130px;" + delLine + data.author + "</span>")
            .append("<span style='width: 60px;" + delLine + siteCodeToName(data.site) + "</span>")
            .append("<span style='width: 60px;" + delLine + timeFormate(data.time) + "</span>")
            .append("<div class='link'></div>", _ => {
                openLink(data.link)
        })

        var localIndex = musicLocal.length ? musicLocal.findIndex(item => { return item.name == data.name && item.author == data.author }) : -1

        if (data.url) {
            if(localIndex < 0) {
                //歌曲信息可能过期,需要重新获取
                // data = getNewMusicDataInfo()
                li.append("<div class='download'></div>", _ => {
                    musicLocal.unshift({
                        "name"  : data.name,
                        "author": data.author,
                        "mtype" : data.mtype,
                        "ptype" : data.ptype,
                        "time"  : data.time
                    })
                    downloadMusicFiles(data, _ => {
                        li.lastChild().remove()
                    })
                    localSync()
                    playerStatus.index = playerStatus.index + 1
                    statusSync()
                })
            }
            
            li.dblclick(_ => {
                setMusicInfo(data.name, data.author, data.time, data.url, data.pic, data.lrc, true, false)
            })
        }

        $("musicListUl").insert(li, loadPageLi)
    }
    $("musicListUl").scrollTop($("musicListUl").scrollHeight())
}

/**
 * 标题栏功能
 */

//设置
let settingMouse = false
$("setting").click(_ => {
    $("settingDiv").toggle()
})

$("titleBarContainer").mouseleave(_ => {
    $("settingDiv").hide()
})

//最小化
$("min").click(_ => {
    remote.getCurrentWindow().minimize()
})

//关闭
$("close").click(_ => {
    if($("playMusic").hasClass("pause")) {
        remote.getCurrentWindow().hide()
    }else {   
        remote.getCurrentWindow().destroy()
    }
})

//选择网站select
$("musicSearchSite").focus(_ => {
    $("musicSearchSiteUl").show()
})
$("musicSearchSite").blur(_ => {
    setTimeout(_ => {
        $("musicSearchSiteUl").hide()
    }, 200)
})

//模拟option点击事件
let musicSearchSiteLiList = $("musicSearchSiteUl").children()
for(var i=0;i<musicSearchSiteLiList.length;i++){
    $(musicSearchSiteLiList[i]).click(event => {
        $("musicSearchSite").value($(event.currentTarget).text())
        $("musicSearchSiteValue").value($(event.currentTarget).attr('to'))
    })
}

//选择查询方式select
$("musicSearchType").focus(_ => {
    $("musicSearchTypeUl").show()
})
$("musicSearchType").blur(_ => {
    setTimeout(_ => {
        $("musicSearchTypeUl").hide()
    }, 200)
})

//模拟option点击事件
let musicSearchTypeLiList = $("musicSearchTypeUl").children()
for(var i=0;i<musicSearchTypeLiList.length;i++){
    $(musicSearchTypeLiList[i]).click(event => {
        $("musicSearchType").value($(event.currentTarget).text())
        $("musicSearchTypeValue").value($(event.currentTarget).attr('to'))
    })
}

//输入框回车
$("musicSearchInput").keydown(e => {
    if(e.keyCode == $.keyCode.Enter) {
        $("musicSearchBtn").click()
    }
}).focus(_ => {
    searchSpace = true
}).blur(_ => {
    searchSpace = false
})

//点击查询按钮
$("musicSearchBtn").click(_ => {

    if($("musicSearchInput").value().trim() == "") {
        $("musicSearchInput").value("")
        return
    }

    musicSearch = {
        "query" : $("musicSearchInput").value(),
        "type"  : $("musicSearchTypeValue").value(),
        "type_name"  : $("musicSearchType").value(),
        "site"  : $("musicSearchSiteValue").value(),
        "site_name"  : $("musicSearchSite").value(),
        "page"  : 1,
        "data"  : []
    }

    $("musicListUl").html("")

    musicSearchResult()
})

/**
 * 音乐播放页
 */

//设置歌词
let currentLrcLine = -1
let currentLrcContext = {}
let lrcLines = []
let lrcNodes = []
function setMusicLrc(lrc) {
    // console.log(lrc)
    let musicLrcUl = $("musicLrcUl").html("")
    //将文本分隔成一行一行，存入数组
    var lines = lrc.split('\n'),
    //用于匹配时间的正则表达式，匹配的结果类似[xx:xx.xx]
    pattern = /\[\d{2}:\d{2}(.\d{1,3})?\]/g;
    //切换歌曲时初始化所有状态
    currentLrcLine = -1
    currentLrcContext = {
        currentLine: "",
        nextLine: ""
    }
    lrcLines = []
    lrcNodes = []
    musicLrcUl.removeClass("noPadding")
    //去掉头尾不含时间的行 同一个正则多次test会有问题 所以加了个 !(pattern.lastIndex = 0) 重置 index
    while (lines.length > 0 && !(pattern.lastIndex = 0) && !pattern.test(lines[0])) {
        lines = lines.slice(1);
    };
    while (lines.length > 0 && !(pattern.lastIndex = 0) && !pattern.test(lines[lines.length - 1])) {
        lines.pop();
    };
    if(lines.length > 0){
        lines.forEach(function(v /*数组元素值*/ , i /*元素索引*/ , a /*数组本身*/ ) {
            //提取出时间[xx:xx.xx]
            var time = v.match(pattern),
                //提取歌词
                value = v.replace(pattern, '');
            //因为一行里面可能有多个时间，所以time有可能是[xx:xx.xx][xx:xx.xx][xx:xx.xx]的形式，需要进一步分隔
            time.forEach(function(v1, i1, a1) {
                //去掉时间里的中括号得到xx:xx.xx
                var t = v1.slice(1, -1).split(':');
                //将结果压入最终数组
                //空行是否需要排除,暂时先排除了  注意文件行尾格式为 LF
                if(value != ""){
                    lrcLines.push([parseInt(t[0], 10) * 60 + parseFloat(t[1]), value]);
                }
            });
        });
        //最后将结果数组中的元素按时间大小排序，以便保存之后正常显示歌词
        lrcLines.sort(function(a, b) {
            return a[0] - b[0];
        });
        for(let i=0;i<lrcLines.length;i++){
            musicLrcUl.append("<li>" + lrcLines[i][1] + "</li>", _ => {
                isMoving = true
                let musicAudio = $("musicAudio").node
                musicAudio.pause();
                $("playRange").value(lrcLines[i][0])
                playRangeInput()
                musicAudio.currentTime = lrcLines[i][0]
                musicAudio.play();
                $("playMusic").addClass("pause")
                isMoving = false
            }, "dblclick")
        }
        lrcNodes = musicLrcUl.children()
        if (lrcLines[0][0] == 0) {
            currentLrcContext.currentLine = lrcLines[0][1]
            currentLrcContext.nextLine = lrcLines[1][1]
        } else {
            currentLrcContext.nextLine = lrcLines[0][1]
        }
        // musicLrcUl.firstChild.classList.add("current")
    }else{
        //当歌词内无时间。全部展示
        lines = lrc.split('\n')
        if(lines.length > 0){
            for(var i=0;i<lines.length;i++){
                musicLrcUl.append("<li>" + lines[i] + "</li>")
            }
            musicLrcUl.addClass("noPadding")
            currentLrcContext.currentLine = "请打开主界面查看歌词"
            if(playerStatus.desktopLrc) {
                currentLrcFunc()
            }
        }else{
            musicLrcUl.append("<li>暂无歌词</li>")
            musicLrcUl.firstChild.addClass("current")
            currentLrcContext.currentLine = "暂无歌词"
            if(playerStatus.desktopLrc) {
                currentLrcFunc()
            }
        }
    }
}

/**
 * 音乐列表页
 */

//查询歌曲构建列表
function musicSearchResult() {
    search(musicSearch).then(_ => {
        buildSearchResultList(musicSearch.page * 10 - 10)
        searchSync()
    }, err => {
        console.log(err)
    })
}

//下载歌曲相关文件
function downloadMusicFiles(data, callback) {

    let musicInfo = getLocalMusicFileInfo(data)

    new Promise(resolve => {
        request(data.url).pipe(fs.createWriteStream(musicInfo.music)).on('finish', () => {
            console.log(musicInfo.file + '歌曲完成');
            resolve()
        })
    }).then( _ => {
        return new Promise(resolve => {
            request(data.pic).pipe(fs.createWriteStream(musicInfo.pic)).on('finish', () => {
                console.log(musicInfo.file + '封面完成');
                resolve()
            })
        })
    }).then( _ => {
        return new Promise(resolve => {
            fs.writeFileSync(musicInfo.lrc, data.lrc)
            console.log(musicInfo.file + '歌词完成');
            resolve()
        })
    }).finally( _ => {
        if(callback) {
            callback()
            console.log('回调');
        }
    })
}

//组建设置歌曲信息
function buildSetMusicInfo(index, autoPlay) {
    
    let data = musicLocal[index]
    let musicInfo = getLocalMusicFileInfo(data)
    setMusicInfo(data.name, data.author, data.time, musicInfo.music, musicInfo.pic, musicInfo.lrc, autoPlay, true)
    if(index != playerStatus.index) {
        playerStatus.index = index
        statusSync()
    }
}

//设置歌曲
function setMusicInfo(name, author, time, musicURL, picURL, lrcURL, autoPlay, lrcNeedTrans) {

    if(lrcNeedTrans){
        lrcURL = fs.readFileSync(lrcURL, "UTF-8")
    }
    
    let musicAudio = $("musicAudio").node
    musicAudio.pause()
    setMusicLrc(lrcURL)
    musicAudio.src = musicURL
    $("funcMusicPic").node.src = picURL
    $("funcMusicName").text(name)
    $("funcMusicAuthor").text(author)
    document.title = name + "-" + author
    setMusicTime(time)
    if(autoPlay) {
        musicAudio.play()
        $("playMusic").addClass("pause")
        musicHistorySort(name, author)
    }
}

//播放历史排序
function musicHistorySort(name, author) {
    let index = musicHistory.length ? musicHistory.findIndex(item => { return item.name == name && item.author == author }) : -1
    if(index < 0) {
        musicHistory.unshift({
            "name": name,
            "author": author,
            "last": Date.parse(new Date())
        })
    }else {
        let data = musicHistory.splice(index, 1)[0]
        data.last = Date.parse(new Date())
        musicHistory.unshift(data)
    }
    if(musicHistory.length > 100){
        musicHistory.pop()
    }
    historySync()
}

//设置歌曲时间
function setMusicTime(time) {
    $("playRange").attr("max", time)
    $("musicDuraTime").text(timeFormate(time))
}

//在浏览器中打开链接
function openLink(url) {
    shell.openExternal(url);
}

//音乐删除
function musicDelete(index) {

    let data = musicLocal.splice(index, 1)[0]

    if(playerStatus.index == index) {
        unlinkLocalMusic()
        playerStatus.index = playerStatus.index - 1
        nextMusic()
    }else if(playerStatus.index > index) {
        playerStatus.index = playerStatus.index - 1
        statusSync()
    }


    let musicInfo = getLocalMusicFileInfo(data)
    fs.unlinkSync(musicInfo.music)
    fs.unlinkSync(musicInfo.pic)
    fs.unlinkSync(musicInfo.lrc)

    localSync()
}

//解除本地文件占用
function unlinkLocalMusic() {
    let musicAudio = $("musicAudio")
    musicAudio.pause()
    musicAudio.src = ""
}

/**
 * 底部播放功能
 */

//上一曲
$("prevMusic").click(prevMusic)

//上一曲方法
function prevMusic() {
    
    let index = -1

    if(musicLocal.length == 0) {
        return
    }else if(musicLocal.length == 1){
        buildSetMusicInfo(0, true)
        return
    }
    if(playerStatus.mode == "random") {
        while(index == playerStatus.index || index == -1) {
            index = Math.floor(Math.random() * musicLocal.length)
        }
    }else {
        index = playerStatus.index - 1
        if(index < 0) {
            index = musicLocal.length - 1
        }
    }
    buildSetMusicInfo(index, true)
}

//播放 暂停 按钮点击
var pauseInterval
$("playMusic").click(_ => {
    let musicAudio = $("musicAudio").node
    let volumeRange = $("volumeRange").value() / 100
    let volumeStep = volumeRange / 10
    clearInterval(pauseInterval)
    if($("playMusic").hasClass("pause")) {
        pauseInterval = setInterval(_ => {
            let volume = musicAudio.volume - volumeStep
            console.log(volume)
            if (volume < 0.001) {
                musicAudio.volume = 0
                musicAudio.pause()
                musicAudio.volume = volumeRange
                clearInterval(pauseInterval)
            } else {
                musicAudio.volume = volume
            }
        }, 100)
    }else {
        musicAudio.volume = 0
        musicAudio.play()
        pauseInterval = setInterval(_ => {
            let volume = musicAudio.volume + volumeStep
            console.log(volume)
            if (volume + 0.001 >= volumeRange) {
                musicAudio.volume = volumeRange
                clearInterval(pauseInterval)
            } else {
                musicAudio.volume = volume
            }
        }, 100)
    }
    $("playMusic").toggle("pause")
})

//空格键播放 暂停
window.onkeydown = function(e) {
    if(e.keyCode == $.keyCode.Space && !searchSpace) {
        e.preventDefault()
        $("playMusic").click()
    }
}

//下一曲 按钮点击
$("nextMusic").click(nextMusic)

//下一曲方法
function nextMusic() {

    let index = -1

    if(musicLocal.length == 0) {
        return
    }else if(musicLocal.length == 1){
        buildSetMusicInfo(0, true)
        return
    }

    if(playerStatus.mode == "random") {
        while(index == playerStatus.index || index == -1) {
            index = Math.floor(Math.random() * musicLocal.length)
        }
    }else {
        index = playerStatus.index + 1
        if(index == musicLocal.length) {
            index = 0
        }
    }
    buildSetMusicInfo(index, true)
}

//播放进度条
$("playRange").input(_ => {
    isMoving = true
    playRangeInput()
})

//正在移动进度条
var isMoving = false
function playRangeInput() {
    let playRange = $("playRange")
    $("musicCurrTime").text(timeFormate(playRange.value()))
    playRange.node.style.backgroundSize = playRange.value() / playRange.attr("max") * 100 + "% 100%"
}

//停止移动进度条
$("playRange").mouseup(_ => {
    let musicAudio = $("musicAudio").node
    musicAudio.pause();
    musicAudio.currentTime = $("playRange").value()
    musicAudio.play();
    $("playMusic").addClass("pause")
    isMoving = false
})

//静音
$("musicMute").click(_ => {
    let volumeRange = $("volumeRange")
    if($("musicMute").hasClass("mute")){
        volumeRange.value(playerStatus.volume)
    }else {
        volumeRange.value(0)
    }
    volumeRangeInput()
    statusSync()
})

//音量调节
$("volumeRange").input(volumeRangeInput)

function volumeRangeInput() {
    let volume =  $("volumeRange")
    let volumeVal = volume.value()
    if(volumeVal != "0") {
        $("musicMute").removeClass("mute")
        playerStatus.mute = false
    }else {
        $("musicMute").addClass("mute")
        playerStatus.mute = true
    }
    $("musicVolume").text(volumeVal)
    volume.node.style.backgroundSize = volumeVal + "% 100%"
    $("musicAudio").node.volume = (volumeVal - 0) / 100
}

//音量调节完成
$("volumeRange").mouseup(_ => {
    playerStatus.volume = $("volumeRange").value()
    statusSync()
})

//播放模式
$("playMode").click(_ => {
    let playMode = $("playMode")
    if(playMode.hasClass("list")){
        playMode.removeClass("list")
        playMode.addClass("random")
        playerStatus.mode = "random"
    }else if(playMode.hasClass("random")){
        playMode.removeClass("random")
        playMode.addClass("single")
        playerStatus.mode = "single"
    }else if(playMode.hasClass("single")){
        playMode.removeClass("single")
        playMode.addClass("list")
        playerStatus.mode = "list"
    }
    statusSync()
})

//桌面歌词
$("musicLrc").click(_ => {
    if($("musicLrc").hasClass("hover")) {
        destroyLrcWindow()
        playerStatus.desktopLrc = false
    }else {
        creatLrcWindow()
        playerStatus.desktopLrc = true
    }
    statusSync()
    $("musicLrc").toggle("hover")
})

//播放完成
$("musicAudio").ended(_ => {
    if(playerStatus.mode == "single") {
        $("musicAudio").node.play()
    }else {
        nextMusic()
    }
})

//播放进度随时间变化
$("musicAudio").timeupdate(event => {
    let currentTime = event.currentTarget.currentTime
    if(!isMoving){
        $("playRange").value(currentTime)
        playRangeInput()
    }
    if(lrcLines.length > 0) {
        //歌词偏移量 正数提前 负数延迟
        let lrcOffset = 0.1
        let currentIndex = -1
        for (var index = 0; index < lrcLines.length; index++) {
            //当前时间 < 歌词行
            if (currentTime < lrcLines[index][0] - lrcOffset) {
                currentIndex = index - 1
                break
            }
            //最后一行
            if(index == lrcLines.length - 1) {
                currentIndex = index
                break
            }
        }
        if(currentIndex >= 0 && currentLrcLine != currentIndex) {
            if(currentLrcLine >= 0) {
                $(lrcNodes[currentLrcLine]).removeClass("current")
            }
            $(lrcNodes[currentIndex]).addClass("current")
            $("musicLrcUl").scrollTop(lrcNodes[currentIndex].offsetTop - 251)
            currentLrcContext.currentLine = lrcLines[currentIndex][1]
            currentLrcContext.nextLine = currentIndex == lrcLines.length - 1 ? "" : lrcLines[currentIndex + 1][1]
            if(playerStatus.desktopLrc) {
                currentLrcFunc()
            }
        }
        currentLrcLine = currentIndex
    }
})

//创建桌面歌词 向主进程通信
function creatLrcWindow() {
    ipcRenderer.send("creatLrcWindow", {
        "lrc": currentLrcContext,
        "position": playerStatus.desktopLrcPosition,
        "locked": playerStatus.desktopLrcLocked,
        "single": playerStatus.desktopLrcSingleLine
    })
}

//同步桌面歌词 向主进程通信
function currentLrcFunc() {
    ipcRenderer.send("currentLrc", currentLrcContext)
}

//销毁桌面歌词 向主进程通信
function destroyLrcWindow() {
    ipcRenderer.send("destroyLrcWindow")
}

//桌面歌词移动时 记录移动后位置
ipcRenderer.on("lrcWindowMovePosition", (event, args) => {
    if(args[0] != playerStatus.desktopLrcPosition[0] || args[1] != playerStatus.desktopLrcPosition[1]) {
        playerStatus.desktopLrcPosition = args
        statusSync()
    }
})

/**
 * 歌词设置
 */
// 锁定桌面歌词
let desktopLrcLocked = $("desktopLrcLocked")
let desktopLrcLockedLabel = $("desktopLrcLockedLabel")
let desktopLrcSingleLine = $("desktopLrcSingleLine")
let desktopLrcSingleLineLabel = $("desktopLrcSingleLineLabel")
desktopLrcLockedLabel.text(playerStatus.desktopLrcLocked ? "✅" : "❎")
desktopLrcSingleLineLabel.text(playerStatus.desktopLrcSingleLine ? "✅" : "❎")
desktopLrcLocked.click(_ => {
    playerStatus.desktopLrcLocked = !playerStatus.desktopLrcLocked
    ipcRenderer.send("lockLrcWindow", playerStatus.desktopLrcLocked)
    desktopLrcLockedLabel.text(playerStatus.desktopLrcLocked ? "✅" : "❎")
    statusSync()
})
desktopLrcSingleLine.click(_ => {
    playerStatus.desktopLrcSingleLine = !playerStatus.desktopLrcSingleLine
    ipcRenderer.send("LrcWindowLrcSingle", playerStatus.desktopLrcSingleLine)
    desktopLrcSingleLineLabel.text(playerStatus.desktopLrcSingleLine ? "✅" : "❎")
    statusSync()
})

/**
 * 页面右键上下文菜单
 */

// document.addEventListener('contextmenu', (e) => {
//     e.preventDefault()
//     let menu = new Menu()

//     console.log(e.srcElement.id)

//     //桌面歌词 解锁/锁定 时 记录状态
//     if(e.srcElement.id == "musicLrc") {
//         if(playerStatus.desktopLrcLocked) {
//             menu.append(new MenuItem({
//                 label: '解锁桌面歌词',
//                 click(){
//                     playerStatus.desktopLrcLocked = false
//                     ipcRenderer.send("lockLrcWindow", false)
//                     statusSync()
//                 }
//             }))
//         }else {
//             menu.append(new MenuItem({
//                 label: '锁定桌面歌词',
//                 click(){
//                     playerStatus.desktopLrcLocked = true
//                     ipcRenderer.send("lockLrcWindow", true)
                    // statusSync()
//                 }
//             }))
//         }
//         menu.popup({ window: remote.getCurrentWindow() })
//     }

// }, false)

/**
 * 页面初始化
 */

//初始化播放设置


//初始化音量
$("volumeRange").value(playerStatus.mute ? "0" : playerStatus.volume)
volumeRangeInput()

//初始化音乐列表播放模式
$("playMode").addClass(playerStatus.mode)

//初始化歌曲
if(playerStatus.index >= 0) {
    buildSetMusicInfo(playerStatus.index, false)
}

//初始化桌面歌词
if(playerStatus.desktopLrc) {
    $("musicLrc").addClass("hover")
    creatLrcWindow()
}

/**
 * TODO
 * 
 * 任务栏鼠标悬停图片和按钮
 * 迷你模式
 * 从歌词当前位置播放
 * 背景 字体颜色 设置 
 *      背景 body background-img 
 *      .body background #fffffff5
 * 
 * 歌词空行删除 setMusicLrc
 * 歌词偏移设置 ontimeupdate
 * 当前歌词逻辑优化,减少循环,减轻cpu负担
 */