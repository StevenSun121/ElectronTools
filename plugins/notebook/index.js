const {remote, ipcRenderer} = require('electron')
const { Menu, MenuItem } = remote
const fs = require("fs");
const path = require('path')
const config = require('../../common/js/config').file('plugins/notebook')
const Vditor = require('vditor')
const $ = require('../../common/js/domUtils')
const vditor = new Vditor("vditorDiv", {
    height: '100%',
    mode: 'ir',
    after() {
        init()
    }
})
                                                                                                                                                             
var notebook = config.get("notebook")
var currency = config.get("currency")

var status = {
    saving: false
}

function getFilePath() {
    return currency.filePath + currency.uuid + "\\" + 'note.md'
}

function saveFile(md) {
    if(!md) {
        md = vditor.getValue()
    }
    if(!status.saving) {
        status.saving = true
        fs.writeFileSync(getFilePath(), md)
        status.saving = false
    }
}

function showNote(node) {
    let uuid = node.dataset.uuid
    if(currency.uuid) {
        saveFile()
    }
    if (currency.uuid == uuid) {
        return
    }
    if (currency.uuid && currency.uuid != uuid) {
        $("container-left").getNodeByClass("active").removeClass("active")
    }
    $(node).addClass("active")
    currency.uuid = uuid
    config.set("currency", currency)
    fs.readFile(getFilePath(), function (err, data) {
        if (err) {
            return console.error(err)
        }
        vditor.disabled()
        vditor.setValue(data.toString(), true)
        vditor.enable()
    })
}

function getNodeIndexData(node) {
    let parent = node.parentNode
    if(node.id == "container-left") {
        return notebook
    } else if (node.classList.contains("folder")) {
        return getNodeIndexData(parent)[node.dataset.index].child
    } else {
        return getNodeIndexData(parent)
    }
}

// 可见转换
function toggleInputSpan(input, span){
    let func = input.onblur
    input.onblur = null
    input.classList.toggle("hide")
    span.classList.toggle("hide")
    input.blur()
    input.onblur = func
}

// 更新文件夹或笔记名
function updateName(node, index, name){
    getNodeIndexData(node)[index].name = name
    config.set('notebook', notebook)
}

function sortItem(evt) {
    if(evt.from == evt.srcElement) {
        let fromData = getNodeIndexData(evt.from)
        let toData
        if(evt.from == evt.to){
            toData = fromData
        } else {
            toData = getNodeIndexData(evt.to)
        }
        toData.splice(evt.newIndex, 0, fromData.splice(evt.oldIndex, 1)[0])
        config.set('notebook', notebook)

        let fromNodes = evt.from.childNodes
        for(let index=0; index<fromNodes.length; index++) {
            fromNodes[index].dataset.index = index
        }
        if(evt.from != evt.to) {
            let toNodes = evt.to.childNodes
            for(let index=0; index<toNodes.length; index++) {
                toNodes[index].dataset.index = index
            }
        }
    }
}

function initTree(node, tree) {
    for(var i=0; i<tree.length; i++){
        let item = tree[i]
        if (item.folder) {
            addFolder(node, item, i)
        } else {
            addItem(node, item, i)
        }
    }
}

function addItem(node, item, index) {

    let itemDiv = document.createElement("div")
    itemDiv.classList.add("item")
    itemDiv.classList.add("itemIcon")
    if (item.uuid == currency.uuid) {
        itemDiv.classList.add("active")
    }
    itemDiv.dataset.index = index
    itemDiv.dataset.uuid = item.uuid

    let itemSpan = document.createElement("span")
    itemSpan.innerText = item.name

    let itemInput = document.createElement("input")
    itemInput.classList.add("hide")

    itemDiv.appendChild(itemSpan)
    itemDiv.appendChild(itemInput)

    itemDiv.onclick = function(evt) {
        evt.preventDefault()
        evt.stopPropagation()
        showNote(this)
    }
    itemInput.onblur = function(evt){
        evt.preventDefault()
        evt.stopPropagation()
        if(itemInput.value != ""){
            itemSpan.innerText = itemInput.value
            updateName(itemInput, itemDiv.dataset.index, itemInput.value)
        }
        toggleInputSpan(itemInput, itemSpan)
    }

    itemDiv.ondblclick = function(evt){
        evt.preventDefault()
        evt.stopPropagation()
        toggleInputSpan(itemInput, itemSpan)
        itemInput.value = itemSpan.innerText
        itemInput.focus()
    }
    node.appendChild(itemDiv)
}

function addFolder(node, item, index) {

    let folderDiv = document.createElement("div")
    folderDiv.classList.add("folder")

    let folderSpan = document.createElement("span")
    folderSpan.classList.add("folderSpan")

    let folderArrow = document.createElement("i")
    folderArrow.classList.add("folderArrow")

    let folderIcon = document.createElement("i")
    folderIcon.classList.add("folderIcon")

    let folderNameSpan = document.createElement("span")
    folderNameSpan.innerText = item.name

    let folderNameInput = document.createElement("input")
    folderNameInput.classList.add("hide")

    folderSpan.appendChild(folderArrow)
    folderSpan.appendChild(document.createTextNode(" "))
    folderSpan.appendChild(folderIcon)
    folderSpan.appendChild(document.createTextNode(" "))
    folderSpan.appendChild(folderNameSpan)
    folderSpan.appendChild(folderNameInput)

    let childDiv = document.createElement("div")
    childDiv.classList.add("sort-able")

    if(item.open) {
        folderArrow.classList.add("opened")
    } else {
        childDiv.classList.add("closed")
    }

    Sortable.create(childDiv, {
        group: "tree",
        animation: 150,
        ghostClass: 'ghost',
        onSort: function(evt){
            sortItem(evt)
        }
    })

    folderDiv.appendChild(folderSpan)
    folderDiv.appendChild(childDiv)
    folderDiv.dataset.index = index

    folderDiv.onclick = function(evt) {
        evt.preventDefault()
        evt.stopPropagation()
        folderArrow.classList.toggle("opened")
        childDiv.classList.toggle("closed")
        let data = getNodeIndexData(this.parentNode)[this.dataset.index]
        data.open = !data.open
        config.set('notebook', notebook)
    }

    folderNameInput.onblur = function(evt){
        evt.preventDefault()
        evt.stopPropagation()
        if(folderNameInput.value != ""){
            folderNameSpan.innerText = folderNameInput.value
            updateName(folderDiv.parentNode, folderDiv.dataset.index, folderNameInput.value)
        }
        toggleInputSpan(folderNameInput, folderNameSpan)
    }

    folderDiv.ondblclick = function(evt){
        evt.preventDefault()
        evt.stopPropagation()
        toggleInputSpan(folderNameInput, folderNameSpan)
        folderNameInput.value = folderNameSpan.innerText
        folderNameInput.focus()
    }

    if (item.child.length > 0) {
        initTree(childDiv, item.child)
    }

    node.appendChild(folderDiv)
}

function init() {
    let container_left = $("container-left").node
    initTree(container_left, notebook)
    Sortable.create(container_left, {
        group: "tree",
        animation: 150,
        ghostClass: 'ghost',
        onSort: function(evt){
            sortItem(evt)
        }
    })
    container_left.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        let menu = new Menu()
    
        for(var i=0; i<e.path.length; i++) {
            let node = e.path[i]
            let classList = node.classList
            // 笔记右键
            if(classList.contains("item")){
                menu.append(new MenuItem({
                    label: '添加笔记',
                    click(){
                        let uuid = Date.now()
                        let dirPath = currency.filePath + uuid
                        let data = {
                            "folder": false,
                            "name": "未命名",
                            "uuid": uuid
                        }
                        if (!fs.existsSync(dirPath)) {
                            fs.mkdirSync(dirPath)
                            fs.writeFileSync(dirPath  + "\\" + 'note.md', "")
                            let index = node.parentNode.childElementCount
                            addItem(node.parentNode, data, index)
                            getNodeIndexData(node).push(data)
                            config.set('notebook', notebook)
                            showNote(node.parentNode.childNodes[index])
                        }
                    }
                }))
                menu.append(new MenuItem({ type: 'separator' }))
                menu.append(new MenuItem({
                    label: '删除笔记',
                    click(){
                        saveFile()
                        getNodeIndexData(node).splice(node.dataset.index, 1)
                        let uuid = node.dataset.uuid
                        let dirPath = currency.filePath + uuid
                        fs.readdir(dirPath, (err, files) => {
                            function next(index) {
                                if (index == files.length) return fs.rmdirSync(dirPath)
                                let newPath = path.join(dirPath, files[index])
                                fs.stat(newPath, (err, stat) => {
                                    if (stat.isDirectory() ) {
                                        rmdirSync(newPath)
                                    } else {
                                        fs.unlinkSync(newPath)
                                    }
                                    next(++ index)
                                })
                            }
                            next(0)
                        })
                        let fromNodes = node.parentNode
                        node.remove()
                        for(let index=0; index<fromNodes.childNodes.length; index++) {
                            fromNodes.childNodes[index].dataset.index = index
                        }
                        config.set('notebook', notebook)
                        if (uuid == currency.uuid) {
                            vditor.disabled()
                            vditor.setValue("", true)
                            vditor.enable()
                            currency.uuid = ""
                            config.set("currency", currency)
                        }
                    }
                }))
                break
            // 文件夹右键
            }else if(classList.contains("folder")){
                menu.append(new MenuItem({
                    label: '新建文件夹',
                    click(){
                        let data = {
                            "folder": true,
                            "name": "未命名",
                            "open": true,
                            "child": []
                          }
                        addFolder(node.childNodes[1], data, node.childNodes[1].childElementCount)
                        getNodeIndexData(node).push(data)
                        config.set('notebook', notebook)
                    }
                }))
                menu.append(new MenuItem({ type: 'separator' }))
                menu.append(new MenuItem({
                    label: '添加笔记',
                    click(){
                        let uuid = Date.now()
                        let dirPath = currency.filePath + uuid
                        let data = {
                            "folder": false,
                            "name": "未命名",
                            "uuid": uuid
                        }
                        if (!fs.existsSync(dirPath)) {
                            fs.mkdirSync(dirPath)
                            fs.writeFileSync(dirPath  + "\\" + 'note.md', "")
                            let index = node.childNodes[1].childElementCount
                            addItem(node.childNodes[1], data, index)
                            getNodeIndexData(node).push(data)
                            config.set('notebook', notebook)
                            showNote(node.childNodes[1].childNodes[index])
                        }
                    }
                }))
                menu.append(new MenuItem({ type: 'separator' }))
                menu.append(new MenuItem({
                    label: '删除文件夹',
                    click(){
                        let fromNodes = node.parentNode
                        if (node.childNodes[1].childNodes.length > 0) {
                            remote.dialog.showMessageBoxSync({
                                type:'none',
                                title: '文件夹不是空的',
                                message: '请将文件夹内的笔记删除或移动后再删除文件夹',
                                buttons:['明白']
                            })
                            return
                        }
                        getNodeIndexData(fromNodes).splice(node.dataset.index, 1)
                        config.set('notebook', notebook)
                        node.remove()
                        for(let index=0; index<fromNodes.childNodes.length; index++) {
                            fromNodes.childNodes[index].dataset.index = index
                        }
                    }
                }))
                break
            //空白右键
            }else if(classList.contains("container-div")){
                menu.append(new MenuItem({
                    label: '新建文件夹',
                    click(){
                        let data = {
                            "folder": true,
                            "name": "未命名",
                            "open": true,
                            "child": []
                          }
                        addFolder(container_left, data, container_left.childElementCount)
                        notebook.push(data)
                        config.set('notebook', notebook)
                    }
                }))
                menu.append(new MenuItem({ type: 'separator' }))
                menu.append(new MenuItem({
                    label: '添加笔记',
                    click(){
                        let uuid = Date.now()
                        let dirPath = currency.filePath + uuid
                        let data = {
                            "folder": false,
                            "name": "未命名",
                            "uuid": uuid
                        }
                        if (!fs.existsSync(dirPath)) {
                            fs.mkdirSync(dirPath)
                            fs.writeFileSync(dirPath  + "\\" + 'note.md', "")
                            let index = container_left.childElementCount
                            addItem(container_left, data, index)
                            notebook.push(data)
                            config.set('notebook', notebook)
                            showNote(node.childNodes[index])
                        }
                    }
                }))
                break
            }
        }
    
        menu.popup({ window: remote.getCurrentWindow() })
    
    }, false)
}

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
    saveFile()
    remote.getCurrentWindow().hide()
})