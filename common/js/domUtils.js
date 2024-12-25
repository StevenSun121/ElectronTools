/**
 * 链式 操作页面元素 方法
 */

function $(id) {
    let node = typeof id == "string" ? document.getElementById(id) : id
    if(node)
        return new domUtils(node)
}

//创建node
$.creat = function(nodeName) {
    return $(document.createElement(nodeName))
}

class domUtils {
    constructor(node) {
        this.node = node;
        ( "blur focus focusin focusout resize scroll click dblclick " +
        "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
        "change select submit keydown keypress keyup contextmenu input ended timeupdate" ).split( " " ).forEach((item, index) => {
            this[item] = callback => {
                let event = "on" + item
                callback ? this.node[event] = callback : this.node[item]()
                return this
            }
        })
        return this;
    }
    //隐藏节点
    hide() {
        this.addClass("hide")
        return this
    }
    //显示节点
    show() {
        this.removeClass("hide")
        return this
    }
    //切换 样式
    toggle(className = "hide") {
        this.node.classList.toggle(className)
        return this
    }
    //是否显示
    isShow() {
        return !this.node.classList.contains("hide")
    }
    //添加样式
    addClass(className) {
        this.node.classList.add(className)
        return this
    }
    //移除样式
    removeClass(className) {
        this.node.classList.remove(className)
        return this
    }
    //判断样式
    hasClass(className) {
        return this.node.classList.contains(className)
    }
    //设置样式
    setClass(className) {
        this.node.className = className
        return this
    }
    clone(deep) {
        return new domUtils(this.node.cloneNode(deep))
    }
    //添加向节点末尾添加子节点   // let fragment = document.createDocumentFragment()
    append(html, callback, event) {
        let targetNode
        if(typeof html == "string") {
            let temp = document.createElement("div")
            temp.innerHTML = html
            targetNode = temp.lastElementChild
        }else {
            targetNode = html.node || html
        }
        if(callback) {
            targetNode["on" + (event ? event : "click")] = callback
        }
        this.node.appendChild(targetNode)
        return this
    }
    // 在已存在节点前插入
    insert(newItem, existingItem) {
        if(existingItem) {
            this.node.insertBefore(newItem.node || newItem, existingItem.node || existingItem)
        }else {
            this.node.parentElement.insertBefore(newItem.node || newItem, this.node)
        }
        return this
    }
    // 当前节点的兄弟节点
    siblings() {
        return this.node.parentElement.children
    }
    // 当前节点的子节点
    children() {
        return this.node.children
    }
    // 第一个子元素
    firstChild() {
        // this.node = this.node.firstElementChild
        return new domUtils(this.node.firstElementChild)
    }
    // 最后的一个子元素
    lastChild() {
        return new domUtils(this.node.lastElementChild)
    }
    // 根据class获取第一个子元素
    getNodeByClass(className, isInDocument) {
        let tempNode = (isInDocument ? document : this.node).getElementsByClassName(className)[0]
        return new domUtils(tempNode)
    }
    // 移除当前元素
    remove() {
        this.node.remove()
    }
    //获取/设置节点参数
    attr(name, value) {
        if(value || value == "") {
            this.node.setAttribute(name, value)
            return this
        }else {
            return this.node.getAttribute(name)
        }
    }
    //获取元素值
    value(value) {
        if(value || value == "" || value == "0") {
            this.node.value = value
            return this
        }else {
            return this.node.value
        }
    }
    //修改节点html代码
    html(html) {
        if(html == "" || html == "0" || html) {
            this.node.innerHTML = html
            return this
        } else {
            return this.node.innerHTML
        }
    }
    //修改节点 文本
    text(text) {
        if(text == "" || text == "0" || text) {
            this.node.innerText = text
            return this
        }else {
            return this.node.innerText
        }
    }
    //重定向到当前节点的父节点
    parent() {
        return new domUtils(this.node.parentElement)
    }
    //滚动当前节点 相对于父节点
    scrollTop(scrollTop) {
        this.node.scrollTop = scrollTop
        return this
    }
    //当前节点 高度
    scrollHeight() {
        return this.node.scrollHeight
    }
    //滚动当前节点 内部
    scrollTo(x, y) {
        this.node.scrollTo(x, y)
        return this
    }
}

//数字补位
$.numFill = function(number, length = 2, fill = "0") {
    return (Array(length).join(fill) + number).slice(-length)
}

//随机整数
$.random = function(min, max) {
    switch (arguments.length) {
        case 1:
            return Math.floor(Math.random() * min)
        case 2:
            return Math.floor(Math.random() * (max - min)) + min
        default:
            return Math.random();
    }
}

//键盘代码
$.keyCode = {
    "BackSpace"     : 8,
    "Tab"           : 9,
    "Clear"         : 12,
    "Enter"         : 13,
    "Shift_L"       : 16,
    "Control_L"     : 17,
    "Alt_L"         : 18,
    "Pause"         : 19,
    "Caps_Lock"     : 20,
    "Escape"        : 27,
    "Space"         : 32,
    "Page_Up"       : 33,
    "Page_Down"     : 34,
    "End"           : 35,
    "Home"          : 36,
    "Left"          : 37,
    "Up"            : 38,
    "Right"         : 39,
    "Down"          : 40,
    "Select"        : 41,
    "Print"         : 42,
    "Execute"       : 43,
    "Insert"        : 45,
    "Delete"        : 46,
    "Help"          : 47,
    "0_)"           : 48,
    "1_!"           : 49,
    "2_@"           : 50,
    "3_#"           : 51,
    "4_$"           : 52,
    "5_%"           : 53,
    "6_^"           : 54,
    "7_&"           : 55,
    "8_*"           : 56,
    "9_("           : 57,
    "a_A"           : 65,
    "b_B"           : 66,
    "c_C"           : 67,
    "d_D"           : 68,
    "e_E"           : 69,
    "f_F"           : 70,
    "g_G"           : 71,
    "h_H"           : 72,
    "i_I"           : 73,
    "j_J"           : 74,
    "k_K"           : 75,
    "l_L"           : 76,
    "m_M"           : 77,
    "n_N"           : 78,
    "o_O"           : 79,
    "p_P"           : 80,
    "q_Q"           : 81,
    "r_R"           : 82,
    "s_S"           : 83,
    "t_T"           : 84,
    "u_U"           : 85,
    "v_V"           : 86,
    "w_W"           : 87,
    "x_X"           : 88,
    "y_Y"           : 89,
    "z_Z"           : 90,
    "KP_0"          : 96,
    "KP_1"          : 97,
    "KP_2"          : 98,
    "KP_3"          : 99,
    "KP_4"          : 100,
    "KP_5"          : 101,
    "KP_6"          : 102,
    "KP_7"          : 103,
    "KP_8"          : 104,
    "KP_9"          : 105,
    "KP_*"          : 106,
    "KP_+"          : 107,
    "KP_Enter"      : 108,
    "KP_-"          : 109,
    "KP_."          : 110,
    "KP_/"          : 111,
    "F1"            : 112,
    "F2"            : 113,
    "F3"            : 114,
    "F4"            : 115,
    "F5"            : 116,
    "F6"            : 117,
    "F7"            : 118,
    "F8"            : 119,
    "F9"            : 120,
    "F10"           : 121,
    "F11"           : 122,
    "F12"           : 123,
    "F13"           : 124,
    "F14"           : 125,
    "F15"           : 126,
    "F16"           : 127,
    "F17"           : 128,
    "F18"           : 129,
    "F19"           : 130,
    "F20"           : 131,
    "F21"           : 132,
    "F22"           : 133,
    "F23"           : 134,
    "F24"           : 135,
    "Num_Lock"      : 136,
    "Scroll_Lock"   : 137,
    "=+"            : 187,
    ",<"            : 188,
    "-_"            : 189,
    ".>"            : 190,
    "/?"            : 191,
    "`~"            : 192,
    "[{"            : 219,
    "\\|"           : 220,
    "]}"            : 221,
    "'\""           : 222
}

window.onkeydown = function(e) {
    if(e.keyCode == $.keyCode.r_R && e.ctrlKey) {
        return false
    }
}

module.exports = $