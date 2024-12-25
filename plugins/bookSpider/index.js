const {remote, ipcRenderer} = require('electron')
const cheerio = require('cheerio')
const iconv = require('iconv-lite')
const request = require('request')

const config = require('../../common/js/config').file('plugins/bookSpider');

const $ = require('../../common/js/domUtils')

let bookSourcesConfig = config.get("bookSources")

// 查询按钮点击
$("searchButton").click(function() {
    // 清空各个 form
    searchBook()
})

let nodes = {
    searchStatus: $("searchStatus"),
    resultSourceUl: $("resultSourceUl"),
    resultBookUl: $("resultBookUl"),
    bookReplaceUl: $("bookReplaceUl"),
    bookChapterUl: $("bookChapterUl"),
    bookPreviewContainer: $("bookPreviewContainer")
}

// 查询书
function searchBook() {
    let searchName = $("searchName").value()
    changeStatus("小说<<" + searchName + ">> 正在搜索", true)
    let promises = []
    let bookSources = config.get("bookSources")
    for(let index = 0; index < bookSources.length; index ++) {
        let bookSource = bookSources[index]
        promises.push(
            new Promise((resolve, reject) => {
                searchBookRequest(bookSource, searchName, resolve)
            })
        )
    }
    Promise.all(promises).then((results) => {
        changeStatus("共" + results.length + "个结果")
        nodes.resultSourceUl.html("")
        for(let index = 0; index < results.length; index ++) {
            let bookSource = results[index]
            if(bookSource && bookSource.bookListInfo.maxIndex) {
                buildBookSource(bookSource)
            }
        }
    }).catch((error) => {
        console.log(error)
        changeStatus("搜索失败")
    })
}

// 根据书源查询
function searchBookRequest(bookSource, searchName, resolve) {
    // 搜索网址
    let ruleSearchUrl = bookSource.ruleSearchUrl

    searchName = convertAndEncode(searchName, bookSource.bookSourceEncoding)

    request({
        url: ruleSearchUrl + searchName,
        timeout: 3000
    }).on('response',function(res){
        if(res && res.statusCode != 200) {
            console.log("response")
            console.log(res.statusCode)
            resolve(null)
        }else {
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    //编码判断   // 转码
                    body = iconv.decode(buf, bookSource.bookSourceEncoding)
                    let $$ = cheerio.load(body)
                    let ruleSearchList = $$(bookSource.ruleSearchList)
                    let ruleSearchListLength = ruleSearchList.length
                    bookSource.bookListInfo = {
                        maxIndex: ruleSearchListLength,
                        currIndex: -1,
                        bookList: []
                    }
                    for(let index = 0; index < ruleSearchListLength; index ++) {
                        let book = ruleSearchList.eq(index)
                        bookSource.bookListInfo.bookList.push({
                            // TODO 公共解析方法
                            ruleSearchName: book.find(".s2 a").text(),
                            ruleSearchAuthor: book.find(".s4").text(),
                            ruleSearchKind: book.find(".s1").text(),
                            ruleSearchLastChapter: book.find(".s3 a").text(),
                            ruleSearchNoteUrl: book.find(".s2 a").attr("href")
                        })
                    }
                    resolve(bookSource)
                }else {
                    resolve(null)
                }
            })
        }
    }).on("error", function(error) {
        console.log("error")
        console.log(error)
        resolve(null)
    })
}

// 查询章节
function searchChapter(bookSource) {
    changeStatus("正在查询章节", true)
    let ruleSearchNoteUrl = bookSource.bookListInfo.bookList[bookSource.bookListInfo.currIndex].ruleSearchNoteUrl
    new Promise((resolve, reject) => {
        searchChapterRequest(bookSource, ruleSearchNoteUrl, resolve)
    }).then(result => {
        console.log(result)
        buildBookChapter(bookSource)
    })
}

// 章节查询请求
function searchChapterRequest(bookSource, ruleSearchNoteUrl, resolve) {
    request({
        url: ruleSearchNoteUrl,
        timeout: 3000
    }).on('response',function(res){
        if(res && res.statusCode != 200) {
            console.log("response")
            console.log(res.statusCode)
            resolve(null)
        }else {
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    //编码判断   // 转码
                    body = iconv.decode(buf, bookSource.bookSourceEncoding)
                    let $$ = cheerio.load(body)
                    let ruleChapterList = $$(bookSource.ruleChapterList)
                    let ruleChapterListLength = ruleChapterList.length
                    let book = bookSource.bookListInfo.bookList[bookSource.bookListInfo.currIndex]
                    book.chapterListInfo = {
                        maxIndex: ruleChapterListLength,
                        currIndex: -1,
                        chapterList: []
                    }
                    for(let index = 0; index < ruleChapterListLength; index ++) {
                        let chapter = ruleChapterList.eq(index)
                        let ruleContentUrl = chapter.find("a").attr("href")
                        if(ruleContentUrl) {
                            book.chapterListInfo.chapterList.push({
                                // TODO 公共解析方法
                                ruleChapterName: chapter.find("a").text(),
                                ruleContentUrl: ruleContentUrl
                            })
                        }
                    }
                    resolve(bookSource)
                }else {
                    resolve(null)
                }
            })
        }
    }).on("error", function(error) {
        console.log("error")
        console.log(error)
        resolve(null)
    })
}

// 书内容
function searchContent(bookSource) {
    changeStatus("正在获取内容", true)
    let bookInfo = bookSource.bookListInfo.bookList[bookSource.bookListInfo.currIndex]
    let chapterListInfo = bookInfo.chapterListInfo
    let chapter = chapterListInfo.chapterList[chapterListInfo.currIndex]
    let ruleContentUrl = chapter.ruleContentUrl
    
    if(!ruleContentUrl.startsWith("/")) {
        let ruleSearchNoteUrl = bookInfo.ruleSearchNoteUrl
        ruleContentUrl = ruleSearchNoteUrl + ruleContentUrl
    }

    new Promise((resolve, reject) => {
        searchContentRequest(bookSource, ruleContentUrl, resolve)
    }).then(result => {
        changeStatus(chapter.ruleChapterName)
        console.log(result)
        chapter.ruleContent = result
        buildBookContent(bookSource)
    })
}

// 内容查询请求
function searchContentRequest(bookSource, ruleContentUrl, resolve) {
    request({
        url: ruleContentUrl,
        timeout: 3000
    }).on('response',function(res){
        if(res && res.statusCode != 200) {
            console.log("response")
            console.log(res.statusCode)
            resolve(null)
        }else {
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    //编码判断   // 转码
                    body = iconv.decode(buf, bookSource.bookSourceEncoding)
                    let $$ = cheerio.load(body)
                    let ruleBookContent = $$(bookSource.ruleBookContent)
                    let content = ruleBookContent.text()
                    resolve(content)
                }else {
                    resolve(null)
                }
            })
        }
    }).on("error", function(error) {
        console.log("error")
        console.log(error)
        resolve(null)
    })
}

// 书源列表
function buildBookSource(bookSource) {
    let li = $.creat("li")
    li.html("<span>" + bookSource.bookSourceName + "</span>")
    nodes.resultSourceUl.append(li, function() {
        buildBookInfo(bookSource)
    })
}

// 搜索书结果列表
function buildBookInfo(bookSource) {
    let bookList = bookSource.bookListInfo.bookList
    changeStatus("共" + bookList.length + "个结果")
    nodes.resultBookUl.html("")
    for(let index = 0; index < bookList.length; index ++) {
        let book = bookList[index]
        let li = $.creat("li")
        li.html("<span>" + book.ruleSearchName + "</span>")
        nodes.resultBookUl.append(li, function() {
            bookSource.bookListInfo.currIndex = index
            searchChapter(bookSource)
        })
    }
}

// 文字替换列表
function buildBookReplace() {
    
}

// 目录章节列表
function buildBookChapter(bookSource) {
    let chapterListInfo = bookSource.bookListInfo.bookList[bookSource.bookListInfo.currIndex].chapterListInfo
    let chapterList = chapterListInfo.chapterList
    changeStatus("共" + chapterList.length + "章")
    nodes.bookChapterUl.html("")
    for(let index = 0; index < chapterList.length; index ++) {
        let chapter = chapterList[index]
        let li = $.creat("li")
        li.html("<span>" + chapter.ruleChapterName + "</span>")
        nodes.bookChapterUl.append(li, function() {
            chapterListInfo.currIndex = index
            searchContent(bookSource)
        })
    }
}

// 小说内容
function buildBookContent(bookSource) {

    let chapterInfo = getChapterInfo(bookSource)
    let ruleContent = chapterInfo.ruleContent
    let replaceList = bookSource.replaceList

    for(let index = 0; index < replaceList.length; index ++) {
        let replaceInfo = replaceList[index]
        ruleContent = ruleContent.replace(new RegExp(replaceInfo.regexp, "g"), replaceInfo.replace)
    }

    nodes.bookPreviewContainer.text("    " + ruleContent.trim())
}

// utf8 转 gbk and encode
function convertAndEncode(utf8, encoding) {
    let convert = iconv.encode(utf8, encoding)
    let returnStr = ""
    for(let index = 0; index < convert.length; index ++) {
        returnStr = returnStr + "%" + convert[index].toString(16)
    }
    return returnStr
}

// 根据传入的书源获取当前书的信息
function getBookInfo(bookSource) {
    return bookSource.bookListInfo.bookList[bookSource.bookListInfo.currIndex]
}

// 根据传入的书源获取当前章节的信息
function getChapterInfo(bookSource) {
    let bookInfo = getBookInfo(bookSource)
    return bookInfo.chapterListInfo.chapterList[bookInfo.chapterListInfo.currIndex]
}

// 改变状态栏文字
let statusLoopInterval
function changeStatus(message, loop) {
    clearInterval(statusLoopInterval)
    if(loop) {
        let loopIndex = 0
        statusLoopInterval = setInterval(_ => {
            nodes.searchStatus.text(message + $.numFill("", ++ loopIndex % 5, "."))
        }, 300)
    }else {
        nodes.searchStatus.text(message)
    }
}

/**
 * TODO
 * 1. 文本替换 右键新建
 * 2. 章节列表 倒序
 * 3. 小说名称点击右键下载 选择开始结束范围
 * 4. 已选择项目变色
 * 5. 下载进度
 */

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