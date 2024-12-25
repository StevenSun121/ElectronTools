const {remote} = require('electron');
const { Menu, MenuItem } = remote

const $ = require('../../common/js/domUtils')

//nconf 实例
const config = require('../../common/js/config').file('plugins/todoList');

//分组div
var column_container = getByClass(0, "column-container");
//column 模板
var todo_column_div = getByClass(0, "todo-column-div");
//任务模板
var item = getByClass(0, "item");

//待办事项全局对象
var groupData = config.get('todoList')
//设置全局对象
var configData = config.get('config')

//页面初始化
function init() {
    initColumn()
}

//初始化分组
function initColumn() {
    for(var i=0; i<groupData.length; i++){
        addColumnFunc(i)
    }
}

//初始化任务
function initItem(group, itemList) {
    for(var i=0; i<itemList.length; i++){
        addItemFunc(group, itemList[i])
    }
}

//根据class查找node
function getByClass(node, className) {
    return (node || document).getElementsByClassName(className)[0]
}

init()

//同步待办事项
function syncToDoList() {
    config.set('todoList', groupData)
}

//同步代办设置
function syncConfig() {
    config.set('config', configData)
}

//代办分组排序
new Sortable(column_container, {
    group: 'column',
    animation: 150,
    ghostClass: 'ghost',
    onSort: function(evt){
        sortColumn(evt.oldIndex, evt.newIndex)
    }

});

//分组可见转换
function toggleColumnInputSpan(input, span){
    let func = input.onblur
    input.onblur = null
    input.classList.toggle("hide")
    span.classList.toggle("hide")
    input.blur()
    input.onblur = func
}

//添加分组方法
function addColumnFunc(index, node) {
    let tempNode = Sortable.utils.clone(todo_column_div)
    let todo_column = getByClass(tempNode, "todo-column")
    let column = getByClass(todo_column, "column")
    let group = getByClass(todo_column, "group")
    let input = getByClass(column, "column-input")
    let span = getByClass(column, "column-span")

    input.onblur = input.onkeydown = function(evt){
        let spanVal = span.innerText
        if(evt.type == "blur" || evt.keyCode == $.keyCode.Enter) {
            if(input.value == ""){
                if(spanVal == ""){
                    input.parentElement.parentElement.parentElement.remove()
                    return
                }else{
                    input.value = spanVal
                }
            }else{
                span.innerText = input.value
                let columnIndex = getNodeIndex(tempNode, column_container)
                if(spanVal == ""){
                    addColumn(columnIndex, input.value)
                }else if(input.value != spanVal){
                    updateColumn(columnIndex, input.value)
                }
            }
            toggleColumnInputSpan(input, span)
        }else if(evt.keyCode == $.keyCode.Escape) {
            if(spanVal == ""){
                input.onblur = null
                this.parentElement.parentElement.parentElement.remove()
            }else{
                input.value = spanVal
                toggleColumnInputSpan(input, span)
            }
        }
    }

    span.ondblclick = function(){
        toggleColumnInputSpan(input, span)
        input.focus()
    }

    if(typeof(index) == "number") {
        let groupIndex = groupData[index]
        input.value = groupIndex.groupName
        span.appendChild(document.createTextNode(groupIndex.groupName))
        initItem(group, groupIndex.toDoItemList)
        column_container.appendChild(tempNode)
    }else if(typeof(index) == "string") {
        if(index == "left") {
            column_container.insertBefore(tempNode, column_container.childNodes[0])
        }else if(index == "previous") {
            column_container.insertBefore(tempNode, node)
        }else if(index == "next") {
            if(column_container.lastElementChild == node){
                column_container.appendChild(tempNode)
            }else {
                column_container.insertBefore(tempNode, node.nextSibling)
            }
        }
        toggleColumnInputSpan(input, span)
        input.focus()
    }else {
        column_container.appendChild(tempNode)
        toggleColumnInputSpan(input, span)
        input.focus()
    }

    Sortable.create(group,{
        group: "item",
        animation: 150,
        ghostClass: 'ghost',
        onSort: function(evt){
            sortItem(evt)
        }
    })
}

//添加分组同步
function addColumn(index, value) {
    let group = {
        'groupName': value,
        'toDoItemList': []
    }
    if(typeof(index) == "number"){
        groupData.splice(index, 0, group)
    }else {
        groupData.push(group)
    }
    
    syncToDoList()
}

//分组排序同步
function sortColumn(oldIndex, newIndex) {
    let group = groupData[oldIndex]
    groupData.splice(oldIndex, 1)
    groupData.splice(newIndex, 0, group)
    syncToDoList()
}

//分组名称更新同步
function updateColumn(index, value) {
    groupData[index].groupName = value
    syncToDoList()
}

//删除分组同步
function deleteColumn(index) {
    groupData.splice(index, 1)
    syncToDoList()
}

//获取节点索引
function getNodeIndex(node, parent) {
    var valArr = Object.keys(parent.childNodes).map(function(i){return parent.childNodes[i]});
    return valArr.indexOf(node)
}

//添加任务方法
function addItemFunc(group, itemData, position, node) {
    let tempNode = Sortable.utils.clone(item)
    let checkbox = getByClass(tempNode, "item-checkbox")
    let span = getByClass(tempNode, "item-span")

    span.onblur = span.onkeydown = function(evt){
        let spanText = this.innerText
        let spanVal = this.value
        if (evt.keyCode == $.keyCode.Enter && evt.shiftKey) {
            cursorAppendEnter()
            evt.preventDefault();
            evt.stopPropagation();
        } else if (evt.type == "blur" || evt.keyCode == $.keyCode.Enter) {
            if (spanText == "") {
                if (spanVal == "") {
                    this.parentElement.remove()
                    return
                } else {
                    this.innerText = spanVal
                }
            } else {
                this.value = spanText
                let columnIndex = getNodeIndex(tempNode.parentElement.parentElement.parentElement, column_container)
                let itemIndex = getNodeIndex(tempNode, tempNode.parentElement)
                if (spanVal == "") {
                    addItem(columnIndex, itemIndex, spanText)
                } else if (spanText != spanVal) {
                    updateItem(columnIndex, itemIndex, spanText, checkbox.checked)
                }
            }
            span.contentEditable = false
        } else if (evt.keyCode == $.keyCode.F1) {
            addItemFunc(group, null, "up", tempNode)
        } else if (evt.keyCode == $.keyCode.F4) {
            addItemFunc(group, null, "down", tempNode)
        } else if (evt.keyCode == $.keyCode.Escape) {
            if(spanVal == ""){
                this.onblur = null
                this.parentElement.remove()
            }else{
                this.innerText = spanVal
            }
            span.contentEditable = false
        }
    }

    span.ondblclick = function() {
        span.contentEditable = true
        span.focus()
        cursorMoveToEnd(this)
    }

    checkbox.onclick = function() {
        span.classList.toggle("delLine")
        let itemIndex = getNodeIndex(tempNode, tempNode.parentElement)
        let columnIndex = getNodeIndex(tempNode.parentElement.parentElement.parentElement, column_container)
        autoSortItem(columnIndex, itemIndex, tempNode, span.innerText, this.checked)
    }

    if(itemData){
        span.appendChild(document.createTextNode(itemData.itemName))
        span.value = itemData.itemName
        checkbox.checked = itemData.checked
        if(itemData.checked){
            span.classList.toggle("delLine")
        }
        group.appendChild(tempNode)
    }else {
        span.value = ""
        span.contentEditable = true

        if(position == "top"){
            group.insertBefore(tempNode, group.childNodes[0])
        }else if(position == "up"){
            group.insertBefore(tempNode, node)
        }else if(position == "down"){
            if(group.lastElementChild == node){
                group.appendChild(tempNode)
            }else {
                group.insertBefore(tempNode, node.nextSibling)
            }
        }else {
            group.appendChild(tempNode)
        }
        span.focus()
    }
}

// 双击文本修改时，光标移动到最后
function cursorMoveToEnd(node) {
    let range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    let sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

}

// 修改文本内容时，在光标位置添加回车
function cursorAppendEnter() {
    let sel = getSelection()
    let offset = sel.focusOffset
    let isEnd = sel.focusNode.constructor.name == "HTMLSpanElement"
    offset = isEnd ? sel.focusNode.textContent.length : offset
    sel.focusNode.textContent = sel.focusNode.textContent.substr(0, offset) + "\n" + sel.focusNode.textContent.substr(offset) + (isEnd ? " " : "")
    offset = isEnd ? sel.focusNode.textContent.length - 1 : offset + 1
    isEnd ? sel.setBaseAndExtent(sel.focusNode.firstChild, offset, sel.focusNode.firstChild, offset) : sel.setBaseAndExtent(sel.focusNode, offset, sel.focusNode, offset)
}

//添加任务同步
function addItem(columnIndex, index, value){
    let item = {
        "itemName": value,
        "checked" : false
      }
    if(typeof(index) == "number"){
        groupData[columnIndex].toDoItemList.splice(index, 0, item)
    }else {
        groupData[columnIndex].toDoItemList.push(item)
    }
    
    syncToDoList()
}

//任务更新同步
function updateItem(columnIndex, itemIndex, itemName, itemChecked) {
    groupData[columnIndex].toDoItemList[itemIndex] = {
        "itemName": itemName,
        "checked" : itemChecked
    }
    syncToDoList()
}

//任务排序同步
function sortItem(evt) {
    let index = getNodeIndex(evt.srcElement.parentElement.parentElement, column_container)

    if(evt.from == evt.to){
        groupData[index].toDoItemList.splice(evt.newIndex, 0, groupData[index].toDoItemList.splice(evt.oldIndex, 1)[0])
    }else{
        if(evt.from == evt.srcElement) {
            groupData[index].toDoItemList.splice(evt.oldIndex, 1)
        }else if(evt.to == evt.srcElement) {
            groupData[index].toDoItemList.splice(evt.newIndex, 0, {
                "itemName"  : evt.item.lastElementChild.innerText,
                "checked"   : evt.item.firstElementChild.checked
            })
        }
    }
    syncToDoList()
}

// 移动任务到最前面
function moveItemToTopFunc (group, node) {
    let itemIndex = getNodeIndex(node, group)
    let columnIndex = getNodeIndex(group.parentElement.parentElement, column_container)
    if (itemIndex == 0) {
        return
    }
    group.insertBefore(node, group.firstElementChild)
    groupData[columnIndex].toDoItemList.unshift(groupData[columnIndex].toDoItemList.splice(itemIndex, 1)[0])
    syncToDoList()
}

//任务自动排序
function autoSortItem(columnIndex, itemIndex, node, itemName, itemChecked) {
    let itemList = groupData[columnIndex].toDoItemList
    let newIndex = 0
    let noChecked = true
    if (itemChecked) {
        newIndex = itemList.length - 1
        for (let index = 0; index < itemList.length; index ++) {
            if (itemList[index].checked) {
                newIndex = index - 1
                noChecked = false
                break;
            }
        }
    }
    if (itemIndex != newIndex) {
        itemList.splice(newIndex, 0, itemList.splice(itemIndex, 1)[0])
        if (noChecked && itemChecked) {
            node.parentElement.append(node)
        } else {
            node.parentElement.insertBefore(node, $(node).siblings()[itemChecked ? newIndex + 1 : newIndex])
        }
    }
    itemList[newIndex].checked = itemChecked
    syncToDoList()
}

//任务删除同步
function deleteItem(columnIndex, itemIndex) {
    groupData[columnIndex].toDoItemList.splice(itemIndex, 1)
    syncToDoList()
}

//设置页面
var setting_div = getByClass(0, "setting-div")
//遮罩层
var cover_div = getByClass(0, "cover-div")

function toggleSetting() {
    if(cover_div.classList.contains("hide")) {
        cover_div.classList.toggle("hide")
    }else {
        setTimeout(_ => {
            cover_div.classList.toggle("hide")
        }, 300)
    }
    setting_div.classList.toggle("setting-div-open")
}

cover_div.onclick = toggleSetting

//设置
// document.getElementById("setting").onclick = toggleSetting
//最小化
document.getElementById("min").onclick = function() {
    remote.getCurrentWindow().minimize()
}
//最大化
document.getElementById("max").onclick = function() {
    max.classList.toggle("hide")
    resize.classList.toggle("hide")
    remote.getCurrentWindow().maximize()
}
//取消最大化
document.getElementById("resize").onclick = function() {
    max.classList.toggle("hide")
    resize.classList.toggle("hide")
    remote.getCurrentWindow().unmaximize()
}
//关闭
document.getElementById("close").onclick = function() {
    remote.getCurrentWindow().hide()
}

//上下文菜单
column_container.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    let menu = new Menu()

    for(var i=0; i<e.path.length; i++) {
        let node = e.path[i]
        let classList = node.classList
        //任务右键
        if(classList.contains("item")){
            let group = node.parentElement
            let index = getNodeIndex(node, group)
            menu.append(new MenuItem({
                label: '添加任务到顶部',
                click(){
                    addItemFunc(group, null, "top", null)
                }
            }))
            menu.append(new MenuItem({
                label: '添加任务到上一个',
                click(){
                    addItemFunc(group, null, "up", node)
                }
            }))
            menu.append(new MenuItem({
                label: '添加任务到下一个',
                click(){
                    addItemFunc(group, null, "down", node)
                }
            }))
            if (!$(node).lastChild().hasClass("delLine")) {
                menu.append(new MenuItem({ type: 'separator' }))
                menu.append(new MenuItem({
                    label: '移动到最前',
                    click(){
                        moveItemToTopFunc(group, node)
                    }
                }))
            }
            menu.append(new MenuItem({ type: 'separator' }))
            menu.append(new MenuItem({
                label: '删除任务',
                click(){
                    node.remove()
                    deleteItem(getNodeIndex(group.parentElement.parentElement, column_container), index)
                }
            }))
            break
        //分组右键
        }else if(classList.contains("todo-column-div")){
            let index = getNodeIndex(node, column_container)
            menu.append(new MenuItem({
                label: '添加任务',
                click(){
                    addItemFunc(getByClass(node, "group"))
                }
            }))
            menu.append(new MenuItem({ type: 'separator' }))
            menu.append(new MenuItem({
                label: '添加分组',
                click(){
                    addColumnFunc()
                }
            }))
            menu.append(new MenuItem({
                label: '添加分组到首位',
                click(){
                    addColumnFunc("left", null, 0)
                }
            }))
            menu.append(new MenuItem({
                label: '添加分组到前一个',
                click(){
                    addColumnFunc("previous", node, index)
                }
            }))
            menu.append(new MenuItem({
                label: '添加分组到后一个',
                click(){
                    addColumnFunc("next", node, index+1)
                }
            }))
            menu.append(new MenuItem({ type: 'separator' }))
            menu.append(new MenuItem({
                label: '删除分组',
                click(){
                    node.remove()
                    deleteColumn(index)
                }
            }))
            break
        //空白右键
        }else if(classList.contains("column-container")){
            menu.append(new MenuItem({
                label: '添加分组',
                click(){
                    addColumnFunc()
                }
            }))
            break
        }
    }

    menu.popup({ window: remote.getCurrentWindow() })

}, false)