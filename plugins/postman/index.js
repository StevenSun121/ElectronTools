const {remote, ipcRenderer} = require('electron')

const config = require('../../common/js/config').file('plugins/postman');

const $ = require('../../common/js/domUtils');

const request = require('request')

// 同步配置
function syncPostmanConfig() {
    config.set("postman", postmanConfig)
}

// 当前使用的组
var currentGroupIndex = undefined
// 当前使用的历史
var currentHistoryIndex = undefined
// 页面初始化
function init() {
    for(var i = 0; i < postmanConfig.length; i++){
        addGroupItem(i)
    }
    Sortable.create($("history").node, {
        group: "history",
        animation: 150,
        ghostClass: 'ghost',
        onSort: function(evt){
            let item = postmanConfig[currentGroupIndex].list[evt.oldIndex]
            postmanConfig[currentGroupIndex].list.splice(evt.oldIndex, 1)
            postmanConfig[currentGroupIndex].list.splice(evt.newIndex, 0, item)
            if (evt.oldIndex == currentHistoryIndex) {
                currentHistoryIndex = evt.newIndex
            } else if (evt.oldIndex < currentHistoryIndex && evt.newIndex >= currentHistoryIndex) {
                currentHistoryIndex --
            } else if (evt.oldIndex > currentHistoryIndex && evt.newIndex <= currentHistoryIndex) {
                currentHistoryIndex ++
            }
            syncPostmanConfig()
        }
    })
    //模拟option点击事件
    let liList = $("selectUl").children()
    for(var i=0;i<liList.length;i++){
        liList[i].onclick = function(){
            var method = this.getAttribute('method');
            $("method").value(method)
            $("selectUl").hide()
            // GET POST 等方法更改对页面造成的变化
        }
    }
}

// 添加一个组
function addGroupItem(index) {
    let groupData = postmanConfig[index]
    let tempNode = group_item_template.clone(true)
    tempNode.getNodeByClass("group-item-span").text(groupData.name)
    $("group").append(tempNode, _ => {
        let childs = $("group").children()
        for (let i = 0; i < childs.length; i++) {
            let child = childs[i]
            if (i == index) {
                $(child).addClass("active")
            } else {
                $(child).removeClass("active")
            }
        }
        currentGroupIndex = index
        currentHistoryIndex = undefined
        $("history").html("")
        $("postman").hide()
        initHistory()
    })
}

// 初始化历史记录
function initHistory() {
    let historyList = postmanConfig[currentGroupIndex].list
    for(var i = 0; i < historyList.length; i++){
        addHistoryItem(i)
    }
}

// 添加一条历史
function addHistoryItem(historyIndex) {
    let historyList = postmanConfig[currentGroupIndex].list
    let history = historyList[historyIndex]
    let tempNode = history_item_template.clone(true)
    tempNode.getNodeByClass("history-item-span").text(history.name)
    if (currentHistoryIndex === historyIndex) {
        tempNode.addClass("active")
    }
    let historyNode = $("history")
    historyNode.append(tempNode, _ => {
        let childs = historyNode.children()
        for (let i = 0; i < childs.length; i++) {
            $(childs[i]).removeClass("active")
        }
        tempNode.addClass("active")
        let valArr = Object.keys(historyNode.node.childNodes).map(function(i){return historyNode.node.childNodes[i]});
        currentHistoryIndex = valArr.indexOf(tempNode.node)
        showHistoryDetail()
    })
}

// 添加一个参数
function addParam(index, params) {
    let myTable = $("myTable").node.firstElementChild
    let tr = document.createElement("tr")

    let td_id = document.createElement("td")
    let td_key = document.createElement("td")
    let td_value = document.createElement("td")
    let td_desc = document.createElement("td")
    let td_del = document.createElement("td")

    td_id.innerText = index
    td_key.innerText = params.key
    td_value.innerText = params.value
    td_desc.innerText = params.desc

    td_key.contentEditable = true
    td_value.contentEditable = true
    td_desc.contentEditable = true

    tr.appendChild(td_id)
    tr.appendChild(td_key)
    tr.appendChild(td_value)
    tr.appendChild(td_desc)
    tr.appendChild(td_del)
    myTable.appendChild(tr)
}

// 历史详情
function showHistoryDetail() {
    let historyList = postmanConfig[currentGroupIndex].list
    let history = historyList[currentHistoryIndex]
    $("postman").show()
    $("name").value(history.name)
    $("url").value(history.url)
    $("method").value(history.method)
    initParams()
    if (history.params == undefined) {
        history.params = []
    }
    for (let index = 1; index <= history.params.length; index ++) {
        addParam(index, history.params[index - 1])
    }
    $("json").html("")
    generateJson(history.json)
}

// 数据
var postmanConfig = config.get("postman")
// 组模板
const group_item_template = $("template").getNodeByClass("group-item")
// 历史模板
const history_item_template = $("template").getNodeByClass("history-item")
// 参数模板
const params_item_template = $("template").getNodeByClass("params-item")

init()

// 点击方法选择，弹出列表
$("method").click(_ => {
    $("selectUl").show()
})
$("method").blur(_ => {
    setTimeout(_ => {
        $("selectUl").hide()
    }, 200)
})

// 删除item
$("deleteItem").click(_ => {
    postmanConfig[currentGroupIndex].list.splice(currentHistoryIndex, 1)
    $("history").children()[currentHistoryIndex].remove()
    $("postman").hide()
    syncPostmanConfig()
})

// 初始化参数表格
function initParams() {
    $("myTable").html("<tr class='header'><th>ID</th><th>Key</th><th>Value</th><th>Desc</th><th>Del</th></tr>")
}

// 添加一行参数
$("addParam").click(_ => {
    addParam($("myTable").node.firstElementChild.childElementCount + 1, {key:"", value:"", desc:""})
})

// 发送请求
$("request").click(_ => {
    $("json").html("")
    // 获取备注
    let name = $("name").value()
    // 获取地址
    let url = $("url").value()
    // 请求类型
    let method = $("method").value()
    // 请求参数
    let params = ""
    let paramsData = []
    let paramsNode = $("myTable").node.firstElementChild.children
    for (let index = 1; index < paramsNode.length; index ++) {
        let key = paramsNode[index].childNodes[1].innerText
        let value = paramsNode[index].childNodes[2].innerText
        let desc = paramsNode[index].childNodes[3].innerText
        paramsData.push({key: key, value: value, desc: desc})
        if (key) {
            params = params + "&" + key + "=" + value
        }
    }
    params = "?" + params.substr(1)
    // 请求配置
    let requestParams = {
        url: url + params, //请求路径
        method: method, //请求方式，默认为get
        // headers: { //设置请求头
        //     "content-type": "application/x-www-form-urlencoded",
        // }
    }
    // 发送请求
    request(requestParams, function(error, response, body) {
        // 返回json
        let json = body || error || response
        try {
            // 美化json
            if (typeof json == "string")
                json = JSON.parse(json)
        } catch {
            // 美化失败
        }
        generateJson(json)
        // 保存请求
        let addHistoryObject = {
            name: name,
            url: url,
            method: method,
            params: paramsData,
            json: json
        }
        if (currentHistoryIndex == undefined) {
            postmanConfig[currentGroupIndex].list.unshift(addHistoryObject)
            currentHistoryIndex = 0
        } else {
            postmanConfig[currentGroupIndex].list[currentHistoryIndex] = addHistoryObject
        }
        // 同步配置
        syncPostmanConfig()
        // 刷新历史记录
        $("history").html("")
        initHistory()
        console.log("error")
        console.log(error)
        console.log("response")
        console.log(response)
        console.log("body")
        console.log(body)
    })
})

// 生成返回报文
function generateJson(json) {
    // 如果是字符串，美化失败
    if (typeof json == "string") {
        $("json").html("<code>" + json + "</code>")
    } else { // 不是字符串
        let lines = JSON.stringify(json, null, 4).split("\n")
        if (lines.length <= 1)
            return $("json").html("<code>" + json + "</code>")
        let html = ""
        let linePrev = "<span>"
        let lineNext = "</span><br>"
        for(let i = 0; i < lines.length; i++) {
            html += (linePrev + (lines[i].replace(new RegExp(" ", "g"), "&nbsp;")) + lineNext)
        }
        $("json").html(html)
    }
}

$("addHistory").click(_ => {
    if(currentGroupIndex != undefined) {
        currentHistoryIndex = undefined
        $("postman").show()
        $("name").value("")
        $("url").value("http://")
        $("method").value("GET")
        initParams()
        $("json").html("")
    }
})

/**
 * 标题栏按钮
 */

//设置
// document.getElementById("setting").onclick = toggleSetting

//最小化
$("min").click(_ => {
    remote.getCurrentWindow().minimize()
})
//最大化
$("max").click(_ => {
    max.classList.toggle("hide")
    resize.classList.toggle("hide")
    remote.getCurrentWindow().maximize()
})
//取消最大化
$("resize").click(_ => {
    max.classList.toggle("hide")
    resize.classList.toggle("hide")
    remote.getCurrentWindow().unmaximize()
})
//关闭
$("close").click(_ => {
    remote.getCurrentWindow().hide()
})