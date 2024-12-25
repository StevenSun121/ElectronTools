var rp = require('request-promise')

// 搜索参数
var config
// 请求参数
var params
// ID集合
var IDs
// 是否允许多个ID一起查询
var allow_multiple

/**
 * 初始化请求参数
 */
function initParams(data) {
    config = data
    params = 
    {
        name: {
            netease: _ => {return {
                url: "http://music.163.com/api/cloudsearch/pc",
                method: "POST",
                json: true,
                body: {
                    s: encodeURI(config.query),
                    type: 1,
                    offset: config.page * 10 - 10,
                    limit: 10
                }
            }},
            qq: _ => {return {
                url: "https://c.y.qq.com/soso/fcgi-bin/client_search_cp",
                method: "GET",
                json: true,
                body: {
                    w: encodeURI(config.query),
                    p: config.page,
                    n: 10,
                    format: "json",
                    new_json: 1
                }
            }}
        },
        info: {
            netease: _ => {return {
                url: "http://music.163.com/api/song/detail",
                method: "POST",
                json: true,
                body: {
                    ids: JSON.stringify(IDs),
                }
            }},
            qq: _ => {return {
                url: "http://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg",
                method: "GET",
                json: true,
                body: {
                    songmid: "[" + IDs.join(",") + "]",
                    format: "json"
                }
            }}
        },
        url: {
            netease: _ => {return {
                url: "http://music.163.com/api/song/enhance/player/url",
                method: "POST",
                json: true,
                body: {
                    ids: JSON.stringify(IDs),
                    br: 320000
                }
            }},
            qq: _ => {return {
                url: "https://u.y.qq.com/cgi-bin/musicu.fcg",
                method: "GET",
                json: true,
                body: {
                    format: "json",
                    data: encodeURI(`{"req_0":{"module":"vkey.GetVkeyServer","method":"CgiGetVkey","param":{"guid":"834463236","songmid":` + JSON.stringify(IDs) + `,"songtype":[0],"uin":"0","loginflag":1,"platform":"20"}},"comm":{"uin":0,"format":"json","ct":24,"cv":0}}`)
                }
            }}
        },
        lrc: {
            netease: id => {return {
                url: "http://music.163.com/api/song/lyric",
                method: "POST",
                json: true,
                body: {
                    id: id,
                    lv: 1
                }
            }},
            qq: id => {return {
                url: "http://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric.fcg",
                method: "GET",
                json: true,
                body: {
                    songmid: id,
                    format: "json",
                    nobase64: 1,
                    songtype: 0,
                    callback: "c"
                },
                headers: {
                    Referer: "http://m.y.qq.com"
                }
            }}
        }
    }
    allow_multiple = [
        'netease',
        '1ting',
        'baidu',
        'qq',
        'xiami',
        'lizhi'
    ].indexOf(config.site) < 0 ? false : true
}

/**
 * 搜索入口
 */
function search(data) {
    initParams(data)
    /**
     * 根据名称获取ID
     * 根据ID获取歌曲详情
     * 根据ID获取歌曲链接
     * 根据ID获取歌词
     */
    return new Promise((resolve, reject) => {
        log("开始搜索")
        switch (config.type) {
            case 'name':
                searchByName().then(_ => {
                    log("搜索完成，返回数据")
                    resolve()
                }, err => {reject(err)})
                break;
        }
    })
}

/**
 * 根据名称搜索
 */
function searchByName() {
    return new Promise((resolve, reject) => {
        log("通过名称搜索开始")
        send(params.name[config.site]()).then(data => {
            log("通过名称搜索完成")
            IDs = []
            switch (config.site) {
                case 'netease':
                    if (data.code != 200) {
                        reject(errMsg("网易云音乐通过歌名请求歌曲列表失败,返回错误代码:" + data.code), data)
                    }
                    for (let item in data.result.songs) {
                        IDs.push(data.result.songs[item].id)
                    }
                    break;
                case 'qq':
                    if (data.code != 0 || data.message != "") {
                        reject(errMsg("QQ音乐通过歌名请求歌曲列表失败,返回错误代码:" + data.code), data)
                    }
                    for (let item in data.data.song.list) {
                        IDs.push(data.data.song.list[item].mid)
                    }
                    break;
                default:
                    break;
            }
        }, err => {reject(err)})
        .then(_ => {
            return searchMain().then(_ => {
                log("返回全部信息")
                resolve()
            }, err => {reject(err)})
        })
    })
}

/**
 * 根据ID搜索
 */
function searchByID() {

}

/**
 * 根据链接搜索
 */
function searchByUrl() {

}

/**
 * 搜索主方法
 */
function searchMain() {
    return new Promise((resolve, reject) => {
        switch (config.site) {
            case "netease":
                // 获取全部数据
                Promise.all([
                    send(params.info[config.site]()),
                    send(params.url[config.site]()),
                    Promise.all((_ => {
                        let ps = []
                        for (let id in IDs) {
                            ps.push(send(params.lrc[config.site](IDs[id])))
                        }
                        return ps
                    })())
                ]).then(data => {
                    log("全部数据结果")
                    log(data)
                    let infos = data[0]
                    let urls = data[1]
                    let lrcs = data[2]
                    if (infos.code != 200) {
                        reject(errMsg("网易云音乐通过IDs请求歌曲信息列表失败,返回错误代码:" + infos.code), infos)
                    }
                    if (urls.code != 200) {
                        reject(errMsg("网易云音乐通过IDs请求歌曲地址列表失败,返回错误代码:" + urls.code), urls)
                    }
                    let urlMap = {}
                    for (let index in urls.data) {
                        let url = urls.data[index].url
                        urlMap[urls.data[index].id] = url ? { url: url, mtype: urls.data[index].encodeType } : { url: "", mtype: "" }
                    }
                    for (let index in infos.songs) {
                        let info = infos.songs[index]
                        config.data.push({
                            site: config.site,
                            id: info.id,
                            link: "http://music.163.com/#/song?id=" + info.id,
                            name: info.name,
                            author: info.artists.map(artist => {return artist.name}).toString(),
                            lrc: lrcs[index].code == 200 && lrcs[index].lrc ? lrcs[index].lrc.lyric : "",
                            url: urlMap[info.id].url,
                            mtype: urlMap[info.id].mtype,
                            pic: info.album.picUrl + "?param=300x300",
                            ptype: info.album.picUrl.substr(info.album.picUrl.lastIndexOf(".") + 1),
                            time: parseInt(info.duration / 1000)
                        })
                    }
                    resolve()
                }, err => {reject(err)})
                break;
            case "qq":
                // 获取全部数据
                Promise.all([
                    send(params.info[config.site]()),
                    send(params.url[config.site]()),
                    Promise.all((_ => {
                        let ps = []
                        for (let id in IDs) {
                            ps.push(send(params.lrc[config.site](IDs[id])))
                        }
                        return ps
                    })())
                ]).then(data => {
                    log("全部数据结果")
                    log(data)
                    let infos = data[0]
                    let urls = data[1]
                    let lrcs = data[2]
                    if (infos.code != 0) {
                        reject(errMsg("QQ音乐通过IDs请求歌曲信息列表失败,返回错误代码:" + infos.code), infos)
                    }
                    if (urls.code != 0) {
                        reject(errMsg("QQ音乐通过IDs请求歌曲地址列表失败,返回错误代码:" + urls.code), urls)
                    }
                    let urlMap = {}
                    for (let index in urls.req_0.data.midurlinfo) {
                        let id = urls.req_0.data.midurlinfo[index].songmid
                        let url = urls.req_0.data.midurlinfo[index].purl
                        let encodeType = urls.req_0.data.midurlinfo[index].filename.split(".")[1]
                        urlMap[id] = url ? { url: "http://isure.stream.qqmusic.qq.com/" + url, mtype: encodeType } : { url: "", mtype: "" }
                    }
                    for (let index in infos.data) {
                        let info = infos.data[index]
                        let lrc = JSON.parse(lrcs[index].substring(2, lrcs[index].length - 1))
                        config.data.push({
                            site: config.site,
                            id: info.mid,
                            link: "https://y.qq.com/n/yqq/song/" + info.mid + ".html",
                            name: info.title,
                            author: info.singer.map(artist => {return artist.title}).toString(),
                            lrc: lrc.code == 0 ? qqLrcFormat(lrc.lyric) : "",
                            url: urlMap[info.mid].url,
                            mtype: urlMap[info.mid].mtype,
                            pic: "http://y.gtimg.cn/music/photo_new/T002R300x300M000" + info.album.mid + ".jpg",
                            ptype: "jpg",
                            time: info.interval
                        })
                    }
                    resolve()
                }, err => {reject(err)})
                break;
            default:
                break;
        }
    })
}

/**
 * 请求公共方法
 */
function send(params) {
    return new Promise((resolve, reject) => {
        let firstParam = true
        for (let key in params.body) {
            params.url += firstParam ? "?" : "&"
            params.url += key + "=" + params.body[key]
            firstParam = false
        }
        log("发送请求")
        log(params)
        rp(params).then(data => {
            log(data)
            log("发送完成")
            resolve(data)
        }, err => {
            reject(errMsg("发送失败", err))
        })
    })
}

/**
 * QQ音乐歌词中符号转为了特殊字符，这里转换回来
 */
function qqLrcFormat(lrc) {
    return lrc
}

/**
 * 构建错误信息
 */
function errMsg(msg, err) {
    return {
        msg: msg,
        err: err
    }
}

/**
 * 打印日志公共方法
 * 完成之后在此一键关闭日志输出
 */
function log(str) {
    console.log(str)
}

module.exports = search