const {remote, ipcRenderer} = require('electron')

// const config = require('../../common/js/config').file('plugins/_template');

const $ = require('../../common/js/domUtils')


// 测试题目
// 双向十字交叉循环链表节点类
class CrossCycleLinkNode {

    constructor(val, row_id) {
        this.val = val
        this.row = row_id
        this.col = this
        this.up = this
        this.down = this
        this.left = this
        this.right = this
        return this
    }  
    
    removeColumn() {
        let node = this
        while (true) {
            node.left.right = node.right
            node.right.left = node.left
            node = node.down
            if (node == this)
                break
        }
    }

    restoreColumn() {
        let node = this
        while (true) {
            node.left.right = node
            node.right.left = node
            node = node.down
            if (node == this)
                break
        }
    }

    removeRow() {
        let node = this
        while (true) {
            node.up.down = node.down
            node.down.up = node.up
            node = node.right
            if (node == this)
                break
        }
    }

    restoreRow() {
        let node = this
        while (true) {
            node.up.down = node
            node.down.up = node
            node = node.right
            if (node == this)
                break
        }
    }
}

/**
 * 初始化列方法
 * 数独共有324列，表示全部填完正确的数字后应该满足的324个约束条件
 * 0 - 8 表示 第一行的九个格子是否有数字
 * 0 - 80 表示是否全都填了数字
 * 81 表示 第一行是否有数字1
 * 161 表示最后一行是否有数字9
 * 162 表示第一列是否有数字1
 * 242 表示最后一列是否有数字9
 * 243 表示第一个九宫格是否有数字1
 * 323 表示最后一个九宫格是否有数字9
 */
function initCol(colCount) {
    let head = new CrossCycleLinkNode('head', 'column')
    for (let index = 0; index < colCount; index ++) {
        let col_node = new CrossCycleLinkNode(index, head.row)
        col_node.right = head
        col_node.left = head.left
        col_node.right.left = col_node
        col_node.left.right = col_node
    }
    return head
}

// 向链表中添加一行
function appendRow(head, row_id, nums) {
    let last = null
    let col = head.right
    for (let index in nums) {
        let num = nums[index]
        while (col != head) {
            if (col.val == num) {
                node = new CrossCycleLinkNode(1, row_id)
                node.col = col
                node.down = col
                node.up = col.up
                node.down.up = node
                node.up.down = node
                if (last) {
                    node.left = last
                    node.right = last.right
                    node.left.right = node
                    node.right.left = node
                }
                last = node
                break
            }
            col = col.right
        }
    }
}

// 随机初始化数独数据
function initDict(count) {

}

// 生成数独数据的双向十字循环链表
function getSudokuLinkList(dict) {
    let head = initCol(324)
    for (let i = 0; i < 9; i ++) {
        for (let j = 0; j < 9; j ++) {
            if (dict[i][j]) {
                let k = dict[i][j]
                let a = i * 9 + j
                let b = i * 9 + k + 80
                let c = j * 9 + k + 161
                let d = (parseInt(i / 3) * 3 + parseInt(j / 3)) * 9 + k + 242
                let row_id = (i * 9 + j) * 9 + k - 1
                appendRow(head, row_id, [a, b, c, d])
                // console.log(`1 - ${row_id} - ${a} - ${b} - ${c} - ${d}`)
            } else {
                for (let k = 1; k < 10; k ++){
                    let a = i * 9 + j
                    let b = i * 9 + k + 80
                    let c = j * 9 + k + 161
                    let d = (parseInt(i / 3) * 3 + parseInt(j / 3)) * 9 + k + 242
                    let row_id = (i * 9 + j) * 9 + k - 1
                    appendRow(head, row_id, [a, b, c, d])
                    // console.log(`0 - ${row_id} - ${a} - ${b} - ${c} - ${d}`)
                }
            }
        }
    }
    return head
}

// 精确覆盖，舞蹈链Dance Link X算法实现
function dance_link_x(head, answers) {

    if (head.right == head)
        return true

    let node = head.right
    while (node != head) {
        if (node.down == node)
            return false
        node = node.right
    }

    let restores = []
    let first_col = head.right
    first_col.removeColumn()
    restores.push({obj: first_col, func: first_col.restoreColumn})

    node = first_col.down
    while (node != first_col) {
        if (node.right != node) {
            node.right.removeRow()
            restores.push({obj: node.right, func: node.right.restoreRow})
        }
        node = node.down
    }

    let cur_restores_count = restores.length
    let selected_row = first_col.down
    while (selected_row != first_col) {
        answers.push(selected_row.row)
        if (selected_row.right != selected_row) {
            let row_node = selected_row.right
            while (true) {
                let col_node = row_node.col
                col_node.removeColumn()
                restores.push({obj: col_node, func: col_node.restoreColumn})
                col_node = col_node.down
                while (col_node != col_node.col) {
                    if (col_node.right != col_node) {
                        col_node.right.removeRow()
                        restores.push({obj: col_node.right, func: col_node.right.restoreRow})
                    }
                    col_node = col_node.down
                }
                row_node = row_node.right
                if (row_node == selected_row.right)
                    break
            }
        }

        if (dance_link_x(head, answers)) {
            // while (restores.length > 0) {
            //     let pop = restores.pop()
                // pop.func.call(pop.obj)
            // }
            return true
        }
        
        answers.pop()
        // console.log(restores)
        while (restores.length > cur_restores_count) {
            let pop = restores.pop()
            pop.func.call(pop.obj)
        }
        selected_row = selected_row.down
    }

    while (restores.length > 0) {
        let pop = restores.pop()
            pop.func.call(pop.obj)
    }
    return false
}

// 测试初始化数独-默认数据
function initTestDict(){
    let dic = new Array()
    for (let i = 0; i < 9; i ++) {
        dic[i] = new Array()
        for (let j = 0; j < 9; j ++) {
            dic[i][j] = 0
        }
    }

    dic[0][0] = 4;
    dic[0][1] = 1;
    dic[0][3] = 8;
    dic[0][4] = 9;
    dic[0][8] = 2;
    
    dic[1][2] = 5;
    dic[1][5] = 6;
    dic[1][7] = 8;

    dic[2][0] = 9;
    dic[2][5] = 5;
    dic[2][6] = 6;
    dic[2][8] = 3;

    dic[3][1] = 4;
    dic[3][2] = 3;
    dic[3][3] = 7;
    dic[3][4] = 1;
    dic[3][7] = 6;

    dic[4][1] = 2;
    dic[4][3] = 3;
    dic[4][7] = 1;

    dic[5][1] = 6;
    dic[5][3] = 5;
    dic[5][6] = 9;
    dic[5][7] = 3;

    dic[6][0] = 3;
    dic[6][2] = 7;
    dic[6][3] = 2;
    dic[6][8] = 6;

    dic[7][1] = 9;
    dic[7][3] = 6;
    dic[7][6] = 5;

    dic[8][0] = 6;
    dic[8][4] = 4;
    dic[8][5] = 8;
    dic[8][7] = 7;
    dic[8][8] = 1;

    return dic
}

//测试
function test() {
    let dict = initTestDict()
    let head = getSudokuLinkList(dict)
    let answers = []
    dance_link_x(head, answers)
    console.log(answers)
    for (let index in answers) {
        let row_id = answers[index]
        let loc = parseInt(row_id / 9)
        let i = parseInt(loc / 9)
        let j = loc % 9
        let k = row_id % 9 + 1
        dict[i][j] = k
    }
    console.log(dict)
}
test()

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