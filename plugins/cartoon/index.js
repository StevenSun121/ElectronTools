const {remote, ipcRenderer} = require('electron')
const fs = require('fs');
const cheerio = require('cheerio')
const iconv = require('iconv-lite')
const request = require('request')
const stream = require('stream')

const config = require('../../common/js/config').file('plugins/cartoon');

var cartoonConfig = config.get("cartoonConfig")
var xxhuConfig = config.get("xxhuConfig")
var hentaifoxConfig = config.get("hentaifoxConfig")
var cartoon = config.get("cartoon")
var xxhu = config.get("xxhu")
var hentaifox = config.get("hentaifox")

const $ = require('../../common/js/domUtils')

const host = "https://www.dsmanh84.xyz"
const bookShelfURLPrev = "/?page.currentPage="
var pageIndex = 1
const bookShelfURLNext = "&queryFilm.orderType=1&filmName="

var isDownloading = false

var downloadProgress = {}

function sync() {
    config.set("cartoon", cartoon)
}

function requestCartoonListPage(name) {
    let url = host + bookShelfURLPrev + pageIndex + bookShelfURLNext
    if (name) {
        url += encodeURI(name)
    }
    request(url).on('response',function(res){
        if(res && res.statusCode != 200) {
            log("列表" + url)
            log(res)
        }else {
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    // 转码
                    body = iconv.decode(buf, 'UTF-8')
                    let $$ = cheerio.load(body)
                    let cartoonInfoList = $$(".grid .grid-item a")
                    for(let index = 0; index < cartoonInfoList.length; index ++) {
                        let cartoonInfo = cartoonInfoList.eq(index)

                        let url = host + cartoonInfo.attr("href")
                        let pic = host + cartoonInfo.find(".lazy").attr("src")
                        let title = cartoonInfo.find(".info .title").text()

                        appendCartoonItem(pic, url, title)

                    }
                    let nextPage = $$("#nextpage .disable")
                    if (nextPage.length == 0 || cartoonInfoList.length == 0) {
                        if (!name) {
                            pageIndex ++
                            setTimeout(requestCartoonListPage, 2000)
                        }
                    }
                }
            })
        }
    }).on("error", function(err) {
        error(err)
    })
}

function appendCartoonItem(pic, url, title) {
    $("cartoonList").append(`
    <div class="cartoonListItem">
        <img src="` + pic + `">
        <div>
            <h5 class="title">` + (cartoon[title] ? `<span style="color:red">✔</span> ` : "") + title + `</h5>
        </div>
    </div>
    `, _ => {
        cartoonInfoPage(url, title)
    })
}

function cartoonInfoPage(url, name) {
    request(url).on('response',function(res){
        if(res && res.statusCode != 200) {
            log("详情" + url)
            log(res)
        }else {
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    // 转码
                    body = iconv.decode(buf, 'UTF-8')
                    let $$ = cheerio.load(body)
                    let pic = host + $$("#book .book-header img").attr("src")
                    let desc = $$("#book .book-header p.desc").text().trim()
                    let chapterList = $$("#chapter-list .list-left .list-item")
                    let li = ""
                    for(let index = 0; index < chapterList.length; index ++) {
                        let chapter = chapterList.eq(index)

                        let title = chapter.find("a .cell-info .cell-title").text()

                        li += `<li>` + title + `</li>`
                    }
                    $("cartoonList").hide()
                    $("cartoonInfo").show().html("").append(`<div>` + name + `<br>` + desc + `<br>` + `<ul>` + li + `</ul></div>`)
                        .append(`<button>下载</button>`, _ => {
                            if (cartoon[name]) {
                                log(name + "已存在")
                                return
                            }
                            addToDownload(pic, url, name, desc)
                        }).append(`<button>继续下载</button>`, _ => {
                            addToDownload(pic, url, name, desc)
                        })
                }
            })
        }
    }).on("error", function(err) {
        error(err)
    })
}

function addToDownload(pic, url, title, desc) {

    isDownloading = true
    title = titleReplace(title)
    let cover = "000-0000" + pic.substring(pic.lastIndexOf("."))
    let dirPath = cartoonConfig.localURL + title
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath)
    }
    new Promise(resolve => {
        let coverPath = dirPath + "/" + cover
        if (!fs.existsSync(coverPath)) {
            downloadPic(pic, coverPath, _ => {
                log(cover + '封面完成');
                resolve()
            })
        } else {
            log(cover + '封面已有');
            resolve()
        }
    }).then(_ => {
        cartoon[title] = {
            title: title,
            desc: desc,
            chapter: []
        }
        downloadProgressLog(title)
        sync()
        getCartoonChapterList(cartoon[title], url)
    })
}

function getCartoonChapterList(cartoonInfo, url) {
    request(url).on('response',function(res){
        if(res && res.statusCode != 200) {
            log("章节列表" + url)
            log(res)
        }else {
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    // 转码
                    body = iconv.decode(buf, 'UTF-8')
                    let $$ = cheerio.load(body)
                    let chapterList = $$("#chapter-list .list-left .list-item")
                    for(let index = 0; index < chapterList.length; index ++) {
                        let chapter = chapterList.eq(index)

                        let click = chapter.find("a").attr("onclick")
                        let clickVal = click.split("'")
                        let title = chapter.find("a .cell-info .cell-title").text()
                        let url = host + getInfo(clickVal[1], clickVal[3])

                        cartoonInfo.chapter.push({
                            title: title,
                            url: url,
                            content:0
                        })
                    }
                    sync()
                    getCartoonContent(cartoonInfo)
                }
            })
        }
    }).on("error", function(err) {
        error(err)
    })
}

function getCartoonContent(cartoonInfo) {
    let promise = Promise.resolve()
    for (let index in cartoonInfo.chapter) {
        promise = promise.then(_ => {
            return new Promise((resolve, reject) => {
                // $("chapterLog").text(index - 0 + 1 + " - " + cartoonInfo.chapter[index].title)
                downloadProgressLog(cartoonInfo.title, index - 0 + 1, cartoonInfo.chapter.length)
                downloadCartoon(resolve, reject, cartoonInfo, index)
            }).then(_ => {
                // 进度更新
                // shelfClick()
                log(index - 0 + 1 + "ok")
            })
        })
    }
    promise.then(_ => {
        log(cartoonInfo.title)
        // $("chapterLog").text("完成")
        downloadProgressLog(cartoonInfo.title, 0, 0, 0, 0, true)
        isDownloading = false
    })
}

function downloadCartoon(resolve, reject, cartoonInfo, index) {
    let url = cartoonInfo.chapter[index].url
    request(url).on('response',function(res){
        if(res && res.statusCode != 200) {
            log("内容" + url)
            log(res)
        }else {
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    // 转码
                    body = iconv.decode(buf, 'UTF-8')
                    let $$ = cheerio.load(body)
                    let contentList = $$("#imgList img")
                    let promise = Promise.resolve()
                    log("共" + contentList.length + "张图片")
                    for(let i = 0; i < contentList.length; i ++) {
                        let content = contentList.eq(i)

                        let pic = host + content.attr("src")
                        // log(pic)
                        promise = promise.then(_ => {
                            return new Promise(r => {
                                let picIndex = $.numFill(index - 0 + 1, 3) + "-" + $.numFill(i - 0 + 1, 4)
                                let picSuffix = pic.substring(pic.lastIndexOf("."))

                                let picPath = cartoonConfig.localURL + cartoonInfo.title + "/" + picIndex + picSuffix
                                if (fs.existsSync(picPath)) {
                                    log(picIndex + '存在')
                                    r(i)
                                } else {
                                    isDownloading = true
                                    downloadPic(pic, picPath, _ => {
                                        log(picIndex + '完成')
                                        // $("contentLog").text(i + 1 + "/" + contentList.length)
                                        r(i)
                                    })
                                }
                            }).then(current => {
                                if (current - 0 + 1) {
                                    cartoonInfo.chapter[index].content = current - 0 + 1
                                }
                                downloadProgressLog(cartoonInfo.title, 0, 0, current - 0 + 1, contentList.length)
                            })
                        })
                    }
                    promise.then(_ => {
                        delete cartoonInfo.chapter[index].url
                        sync()
                        resolve()
                    })
                }
            })
        }
    }).on("error", function(err) {
        error(err)
        resolve()
    })
}

/**
 * 1. 获取漫画列表
 * 1.1 当前页漫画，如果有下一页，回调
 * 2. 双击加入下载列表，下载列表维护到json
 * 3. 获取目录
 * 4. 获取第一页
 * 5. 获取下一页
 * 6. 解析图片地址 + 下载
 */

$("list").click(_ => {
    showPage("cartoonList")
})

$("list").dblclick(_ => {
    showPage("cartoonList")
    pageIndex = 1
    $("cartoonList").html("")
    requestCartoonListPage()
})

$("xxhuList").click(_ => {
    showPage("xxcartoonList")
})

$("xxhuList").dblclick(_ => {
    showPage("xxcartoonList")
    xxpageIndex = 1
    $("xxcartoonList").html("")
    requestxxCartoonListPage()
})

$("shelf").click(_ => {
    showPage("cartoonShelf")
    shelfClick()
})

$("xxhu").click(_ => {
    showPage("cartoonShelf")
    xxhuShelf()
})

$("hentaifox").click(_ => {
    showPage("cartoonShelf")
    hentaifoxShelf()
})

function xxhuShelf() {
    $("cartoonShelf").html("")

    for(let index = xxhu.length - 1; index >=0; index --) {
        let item = xxhu[index]
        $("cartoonShelf").append(`
        <div class="cartoonListItem">
            <img src="` + xxhuConfig.localURL + item.title + `/0000.jpg">
            <div>
                <h5 class="title">` + item.title + `</h5>
            </div>
        </div>
        `, _ => {
            $("cartoonShelf").hide()
            $("cartoonRead").show()
            appendxxhu(index)
        })
    }
}

function appendxxhu(index) {
    let item = xxhu[index]
    let cartoonRead = $("cartoonRead")
    cartoonRead.html("")

    let content = item.content
    for(let i = 1; i <= content - 0; i ++) {
        let pic = xxhuConfig.localURL + item.title + "/" + $.numFill(i, 4) + ".jpg"
        cartoonRead.append("<img src=\'" + pic + "\'>")
    }
}

var xxpageIndex = 1
function requestxxCartoonListPage() {
    let url = "https://xxhu87.com/albums/categories/comics/?mode=async&function=get_block&block_id=list_albums_common_albums_list&sort_by=post_date&from="
    url = url + xxpageIndex + "&_=" + new Date().getTime()

    request(url, {
        headers:{
            "host": "xxhu87.com"
        }
    }).on('response',function(res){
        if(res && res.statusCode != 200) {
            log("列表" + url)
            log(res)
        }else {
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    // 转码
                    body = iconv.decode(buf, 'UTF-8')
                    let $$ = cheerio.load(body)
                    let cartoonInfoList = $$("#list_albums_common_albums_list_items .item")
                    for(let index = 0; index < cartoonInfoList.length; index ++) {
                        let cartoonInfo = cartoonInfoList.eq(index)

                        let url = cartoonInfo.find("a").attr("href")
                        let title = cartoonInfo.find("a").attr("title")
                        let pic = cartoonInfo.find("a .img img").attr("data-original")

                        title = titleReplace(title)

                        appendxxCartoonItem(pic, url, title)

                    }
                    let nextPage = $$("#list_albums_common_albums_list_pagination .next a")
                    if (nextPage.length == 1 && xxpageIndex <= 7) {
                        xxpageIndex ++
                        setTimeout(requestxxCartoonListPage, 2000)
                    }
                }
            })
        }
    }).on("error", function(err) {
        error(err)
    })
}

function appendxxCartoonItem(pic, url, title) {
    $("xxcartoonList").append(`
    <div class="cartoonListItem">
        <img src="` + pic + `">
        <div>
            <h5 class="title">` + title + `</h5>
        </div>
    </div>
    `, _ => {
        
        let xxitem
        for (let index = xxhu.length - 1; index >=0; index --) {
            if (xxhu[index].title == title) {
                xxitem = xxhu[index]
            }
        }
        if (!xxitem) {
            xxhu.push({
                title: title,
                content: 0,
                finished: false
            })
            xxitem = xxhu[xxhu.length - 1]
        }
        config.set("xxhu", xxhu)
        let dirPath = xxhuConfig.localURL + title
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath)
        }
        let cover = dirPath + "/0000.jpg"
        
        if (!fs.existsSync(cover)) {
            downloadPic(pic, cover, _ => {
                downloadxxCartoon(url, title, xxitem, 1)
            })
        } else {
            downloadxxCartoon(url, title, xxitem, 1)
        }
    })
}

function downloadxxCartoon(url, title, xxitem, index, j) {
    let urlPath = url + "?mode=async&function=get_block&block_id=album_view_album_view&sort_by=&from_picture="
    urlPath = urlPath + index + "&_=" + new Date().getTime()
    // $("chapterLog").text(title)
    downloadProgressLog(title)
    request(urlPath, {
        headers:{
            "host": "xxhu87.com"
        }
    }).on('response',function(res){
        if(res && res.statusCode != 200) {
            log("内容" + urlPath)
            log(res)
        }else {
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    // 转码
                    body = iconv.decode(buf, 'UTF-8')
                    let $$ = cheerio.load(body)

                    let picList = $$("#album_view_album_view .album-holder .images img")

                    let promise = Promise.resolve()
                    j = j ? j : 0
                    let k = j
                    for(let i = 0; i < picList.length; i ++) {
                        let pic = picList.eq(i)
                        pic = pic.attr("src")
                        k = j + i + 1
                        let l = k
                        let picIndex =$.numFill(l, 4)
                        promise = promise.then(_ => {
                            return new Promise(r => {
                                let dirPath = xxhuConfig.localURL + title
                                let picPath = dirPath + "/" + picIndex + ".jpg"
                                isDownloading = true
                                if (fs.existsSync(picPath)) {
                                    r()
                                } else {
                                    downloadPic(pic, picPath, r)
                                }
                            }).then(_ => {
                                log(picIndex + '完成');
                                // $("contentLog").text(l + "/" + (picList.length + j))
                                downloadProgressLog(title, 0, 0 , l, picList.length + j)
                                xxitem.content = l
                            })
                        })
                    }
                    promise.then(_ => {
                        let next = $$("#album_view_album_view_pagination .next a")
                        if (next.length == 0) {
                            delete xxitem.finished
                            config.set("xxhu", xxhu)
                            log(title + '完成');
                            downloadProgressLog(title, 0, 0, 0, 0, true)
                            isDownloading = false
                        } else {
                            setTimeout(_ => {
                                downloadxxCartoon(url, title, xxitem, index + 1, k)
                            }, 2000)
                        }
                    })
                }
            })
        }
    }).on("error", err => {
        error(title + err)
    })
}

function showPage(id) {
    $("cartoonList").hide()
    $("xxcartoonList").hide()
    $("cartoonInfo").hide()
    $("cartoonShelf").hide()
    $("cartoonRead").hide()
    $("logInfo").hide()
    $(id).show()
}

function shelfClick() {
    $("cartoonShelf").html("")

    let arr = Object.keys(cartoon)
    for(let index = arr.length - 1; index >=0; index --) {
        let item = cartoon[arr[index]]
        $("cartoonShelf").append(`
        <div class="cartoonListItem">
            <img src="` + cartoonConfig.localURL + item.title + `/000-0000.jpg">
            <div>
                <h5 class="title">` + item.title + `</h5>
                <p class="chapter">` + item.desc + `</p>
            </div>
        </div>
        `, _ => {
            $("cartoonShelf").hide()
            $("cartoonRead").show()
            chapterPageIndex = 0
            chapterPageTitle = item.title
            appendChapterOption()
            changeChapter()
        })
    }
}

var chapterPageIndex = 0
var chapterPageTitle = ""

function appendChapterOption() {
    let chapterSelect = $("chapter")
    chapterSelect.html("")
    let chapters = cartoon[chapterPageTitle].chapter
    for (let index in chapters) {
        let chapter = chapters[index]
        chapterSelect.append("<option value='" + index + "'>" + chapter.title + "</option>")
    }
}

function changeChapter() {
    let cartoonRead = $("cartoonRead")
    cartoonRead.html("")
    let chapters = cartoon[chapterPageTitle].chapter
    let chapter = chapters[chapterPageIndex]
    cartoonRead.append("<h2 id='" + chapter.title + "'>" + chapter.title + "</h2>")

    let content = chapter.content
    for(let i = 1; i <= content - 0; i ++) {
        let pic = cartoonConfig.localURL + chapterPageTitle + "/" + $.numFill(chapterPageIndex - 0 + 1, 3) + "-" + $.numFill(i, 4) + ".jpg"
        cartoonRead.append("<img src='" + pic + "'>")
    }
}

$("chapter").blur(_ => {
    chapterPageIndex = $("chapter").value()
    changeChapter()
})

$("search").keydown(e => {
    if (e.keyCode == $.keyCode.Enter) {
        let name = $(search).value()
        requestCartoonListPage(name)
    }
})

$("prevChapter").click(_ => {
    if (chapterPageIndex != 0) {
        chapterPageIndex --
        changeChapter()
    }
})

$("nextChapter").click(_ => {
    if ((cartoon[chapterPageTitle].chapter.length - 1) != chapterPageIndex) {
        chapterPageIndex ++
        changeChapter()
    }
})

function hentaifoxShelf() {
    $("cartoonShelf").html("")

    for(let index = hentaifox.length - 1; index >=0; index --) {
        let item = hentaifox[index]
        $("cartoonShelf").append(`
        <div class="cartoonListItem">
            <img src="` + hentaifoxConfig.localURL + item.title + `/0000.jpg">
            <div>
                <h5 class="title">` + item.title + `</h5>
            </div>
        </div>
        `, _ => {
            $("cartoonShelf").hide()
            $("cartoonRead").show()
            appendhentaifox(index)
        })
    }
}

function appendhentaifox(index) {
    let item = hentaifox[index]
    let cartoonRead = $("cartoonRead")
    cartoonRead.html("")

    let content = item.content
    for(let i = 1; i <= content - 0; i ++) {
        let pic = hentaifoxConfig.localURL + item.title + "/" + $.numFill(i, 4) + ".jpg"
        cartoonRead.append("<img src=\'" + pic + "\'>")
    }
    cartoonRead.append("<button>删除</button>", _ => {
        let temp = hentaifox.splice(index, 1)[0]
        let dir = hentaifoxConfig.localURL + temp.title
        for (let j = 0; j<= temp.content; j++) {
            fs.unlinkSync(dir + "/" + $.numFill(j, 4) + ".jpg")
        }
        fs.rmdirSync(dir)
        config.set("hentaifox", hentaifox)
        $("cartoonRead").hide()
        $("cartoonShelf").show()
        hentaifoxShelf()
    })
}

$("hentaifoxNext").click(_ => {
    if (hentaifoxConfig.times > 3) {
        return
    }
    let url = "https://hentaifox.com/gallery/" + hentaifoxConfig.index + "/"
    request(url).on('response',function(res){
        if(res && res.statusCode != 200) {
            hentaifoxConfig.times = hentaifoxConfig.times + 1
        }else {
            hentaifoxConfig.times = 0
            var chunks = [];
            res.on('data',function(chunk){
                chunks = chunks.concat(chunk);
            })

            res.on('end',function(){
                var buf = Buffer.concat(chunks);
                if(buf) {
                    // 转码
                    body = iconv.decode(buf, 'UTF-8')
                    let $$ = cheerio.load(body)
                    let load_dir = $$("#load_dir").attr("value")
                    let load_id = $$("#load_id").attr("value")
                    let load_pages = $$("#load_pages").attr("value")
                    let title = $$(".info h1").text().trim()
                    title = titleReplace(title)

                    if (hentaifox[hentaifox.length - 1].title != title) {
                        hentaifox.push({
                            title: title,
                            content: load_pages,
                            finished: false
                        })
                    }

                    config.set("hentaifox", hentaifox)

                    let dirPath = hentaifoxConfig.localURL + title
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath)
                    }
                    let hentaifoxPath = "https://i.hentaifox.com/" + load_dir + "/" + load_id + "/"
                    let coverPath = hentaifoxPath + "cover.jpg"
                    let cover = dirPath + "/0000.jpg"
                    
                    let promise = Promise.resolve()
                    if (!fs.existsSync(cover)) {
                        promise = promise.then(_ => {
                            return new Promise(r => {
                                downloadPic(coverPath, cover, r)
                            }).then(_ => {
                                hentaifoxShelf()
                                $("hentaifoxNext").text(load_pages)
                            })
                        })
                    }
                    for(let i = 1; i <= load_pages - 0; i ++) {
                        promise = promise.then(_ => {
                            return new Promise(r => {
                                let picURL = hentaifoxPath + i + ".jpg"
                                let picIndex =$.numFill(i - 0, 4)

                                let picPath = dirPath + "/" + picIndex + ".jpg"
                                isDownloading = true
                                if (fs.existsSync(picPath)) {
                                    r()
                                } else {
                                    downloadPic(picURL, picPath, r)
                                }
                            }).then(_ => {
                                $("hentaifoxNext").text(load_pages - i)
                            })
                        })
                    }
                    promise.then(_ => {
                        delete hentaifox[hentaifox.length - 1].finished
                        hentaifoxConfig.index = hentaifoxConfig.index + 1
                        config.set("hentaifox", hentaifox)
                        config.set("hentaifoxConfig", hentaifoxConfig)
                        $("hentaifoxNext").text("下一本")
                        isDownloading = false
                    })
                }
            })
        }
    }).on("error", _ => {
        $("hentaifoxNext").text("error")
    })
})

// "123\\123\/123\:123?123*123\"123\'123<123>123 123|123".replace(/[\\/:?*"'<>|]/gm, "_")
function titleReplace(title) {
    return title.replace(/[\\/:?*"'<>|]/gm, "_")
}

$("allLog").click(_ => {
    showPage("logInfo")
})

function log(msg) {
    let log = $("log")
    log.value(msg + '\n' + log.value())
    console.log(msg)
}

function error(msg) {
    let error = $("error")
    error.value(msg + '\n' + error.value())
    console.log(msg)
}

function downloadProgressLog(title, currc, chapc, currp, picc, finish) {
    if (!downloadProgress[title]) {
        downloadProgress[title] = {}
    } else {
        currc ? downloadProgress[title].currentChapter = currc : 0
        chapc ? downloadProgress[title].chapterCount = chapc : 0
        currp ? downloadProgress[title].currentPic = currp : 0
        picc ? downloadProgress[title].picCount = picc : 0
        finish ? downloadProgress[title].finish = true : false
    }
    let progressLog = $("progressLog")
    progressLog.value("")
    let arr = Object.keys(downloadProgress)
    let progressContent = ""
    for(let index = 0; index < arr.length; index ++) {
        let item = downloadProgress[arr[index]]
        progressContent += arr[index]
        if(item.currentChapter) {
            progressContent += "    " + item.currentChapter + " / " + item.chapterCount
        }
        if(item.currentPic) {
            progressContent += "    " + item.currentPic + " / " + item.picCount
        }
        if(item.finish) {
            progressContent += "    完成"
        }
        progressContent += "\n"
    }
    progressLog.value(progressContent)
}

$("clear").click(_ => {
    $("log").value("")
    $("error").value("")
    let arr = Object.keys(downloadProgress)
    for(let index = 0; index < arr.length; index ++) {
        let item = downloadProgress[arr[index]]
        if(item.finish) {
            delete downloadProgress[arr[index]]
        }
    }
})

function downloadPic(url, path, resolve) {
    let cs = []
    request(url, {timeout: 15000})
    .on("data", c => {
        cs = cs.concat(c);
    })
    .on("end", _ => {
        // 创建一个bufferstream
        var bufferStream = new stream.PassThrough();
        //将Buffer写入
        bufferStream.end(Buffer.concat(cs));
        bufferStream.pipe(fs.createWriteStream(path)).on('finish', () => {
            resolve()
        })
    })
    .on("error", err => {
        error(err)
        setTimeout(_ => {
            downloadPic(url, path, resolve)
        }, 5000)
    })
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
    isDownloading ? remote.getCurrentWindow().hide() : remote.getCurrentWindow().destroy()
})