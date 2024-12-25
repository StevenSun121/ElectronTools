const {remote, ipcRenderer} = require('electron')
const calendar = require('../common/js/calendar')
const os = require('os');

const config = require('../common/js/config').file('config');

const $ = require('../common/js/domUtils');

var plugins
var anniversary

//初始化页面元素
function creatItems() {
    var tool = $("tool")

    tool.html("")

    plugins.sort((a, b) => b.amount - a.amount)

    for(var i=0; i<plugins.length; i++) {
        let plugin = plugins[i]

        if(plugin.develop) {
            continue;
        }

        let pluginImg = "../plugins/" + plugin.code + "/img/logo-64.png"

        let div = `<div title="` + plugin.name + `" class="item"><img src="` + pluginImg + `"><span>` + plugin.name + `</span></div>`

        tool.append(div, _=> {
            clearInterval(interval)
            remote.getCurrentWindow().hide()
            ipcRenderer.send('show-plugin-window', plugin.code)
        })
    }
}

ipcRenderer.on("reloadPlugins", (event, arg) => {
    plugins = config.get("plugins")
})

document.addEventListener('keydown', e => {
    if (e.code == 'Escape') {
        clearInterval(interval)
        remote.getCurrentWindow().hide()
    }
})

// 进来，开始
ipcRenderer.on("enter_start_interval", (event, arg) => {
    start()
})

// 退出
ipcRenderer.on("hide_clear_interval", (event, arg) => {
    clearInterval(interval)
})

// var start_t = 0
// var end_t = 0
// var looptimes = 5
var pre_cpus = {
    idle: 0,
    total: 0
}

function refresh() {
    // start_t = Date.now()

    // 当前时间显示
    dealCurrentTime()

    // CPU利用率 
    dealCPUUsage()
    
    // 内存利用率
    dealRAMUsage()

    // 系统开机时间
    dealUpTime()
    
    
    
    // end_t = Date.now()
    // console.log("执行一次完成：" + (end_t - start_t))
}

// 时间显示
var dealCurrentTime = _ => {
    let date = new Date()
    let year = date.getFullYear()
    let month = date.getMonth() + 1
    let day = date.getDate()
    let hour = date.getHours()
    let minute = date.getMinutes()
    let second = date.getSeconds()

    let lunar = calendar.solar2lunar();

    (hour < 10) && (hour = '0' + hour);
    (minute < 10) && (minute = '0' + minute);
    (second < 10) && (second = '0' + second);

    current_time_hour.innerText = hour
    current_time_minute.innerText = minute
    current_time_second.innerText = second

    current_date_solar.innerText = `${year}年${month}月${day}日 ${lunar.ncWeek} ${lunar.isLeap ? '闰' : ''}${lunar.IMonthCn}${lunar.IDayCn}`
    current_date_lunar.innerText = `${lunar.gzYear} ${lunar.Animal}年 ${lunar.gzMonth}月 ${lunar.gzDay}日 ${lunar.isTerm ? lunar.Term : ''}`
}

// CPU利用率显示
var dealCPUUsage = _ => {
    let cpus = os.cpus()
    let model = cpus[0].model
    let speed = cpus[0].speed
    let idle = 0
    let total = 0
    cpus.forEach((cpu,idx,arr) => {
        let times = cpu.times;
        idle += times.idle
        total += times.idle+times.user+times.nice+times.sys+times.irq
    })
    let percent = ((1 - ((idle - pre_cpus.idle)/(total - pre_cpus.total))) * 100).toFixed(2) + '%'
    average_CPU_usage.innerText = percent
    pre_cpus.idle = idle
    pre_cpus.total = total
}

// 内存利用率显示
var dealRAMUsage = _ => {
    let totalMem = os.totalmem()
    let freeMem = os.freemem()
    let usageMem = totalMem - freeMem
    let freeRam = dealMem(freeMem)
    let usageRam = dealMem(usageMem)
    let totalRam = dealMem(totalMem)
    RAM_free.innerText = freeRam
    RAM_usage.innerText = usageRam
    RAM_total.innerText = totalRam
    RAM_percent.innerText = (usageMem / totalMem * 100).toFixed(2) + '%'
}

// 系统开机时间显示
var dealUpTime = _ => {
    let seconds = os.uptime()|0;
    let day = (seconds/(3600*24))|0;
    let hour = ((seconds-day*3600*24)/3600)|0;
    let minute = ((seconds-day*3600*24-hour*3600)/60)|0;
    let second = seconds%60;
    
    up_time_day.innerText = day
    up_time_hour.innerText = hour
    up_time_minute.innerText = minute
    up_time_second.innerText = second
}

// 内存计算
var dealMem = (mem)=>{
    var G = 0,
        M = 0,
        KB = 0;
    (mem>(1<<30))&&(G=(mem/(1<<30)).toFixed(2));
    (mem>(1<<20))&&(mem<(1<<30))&&(M=(mem/(1<<20)).toFixed(2));
    (mem>(1<<10))&&(mem>(1<<20))&&(KB=(mem/(1<<10)).toFixed(2));
    return G>0?G+'G':M>0?M+'M':KB>0?KB+'KB':mem+'B';
};

// 计算两个阳历日期之间的天数差
var dealDate = (year, month, day, nYear, nMonth, nDay) => {
    let date = new Date()
    let startDate = date.getTime()
    date.setFullYear(year)
    date.setMonth(month - 1)
    date.setDate(day)
    let endDate = date.getTime()
    if (!!nYear) {
        date.setFullYear(nYear)
        date.setMonth(nMonth - 1)
        date.setDate(nDay)
        endDate = date.getTime()
    }
    let diff = endDate - startDate
    diff = diff/24/60/60/1000
    diff = Math.round(diff)
    return diff < 0 ? diff - 1 : diff
}

// 计算某年某月的第几个星期几的日期
var dealWeekDay = (year, month, week, loop) => {
    let loopDate = new Date()
    let day = []
    loopDate.setFullYear(year)
    loopDate.setMonth(month - 1)
    for (let index = 1; index <= calendar.solarMonth[month - 1]; index ++) {
        loopDate.setDate(index)
        if (loopDate.getDay() == week) {
            day.push(index)
        }
    }
    day = loop > 0 ? day[loop - 1] : day.pop()
    return day
}

// 纪念日处理
var dealAnniversary = _ => {
    let now = new Date()
    let now_year = now.getFullYear()
    let now_month = now.getMonth() + 1
    let now_day = now.getDate()

    // 处理后的纪念日
    let bord_anniversary = {
        count: [],
        left: []
    }

    // 处理配置文件中的纪念日，有阴历的需要转换为下一个阳历
    anniversary.forEach(item => {
        if (item.type === 'left') {
            if (dealDate(item.year, item.month, item.day) < 0) {
                item.year ++
                if (item.lunar) {
                    let date = calendar.lunar2solar(item.year, item.lunar_month, item.lunar_day)
                    item.month = date.cMonth
                    item.day = date.cDay
                }
            }
        }
        bord_anniversary[item.type].push({
            name: item.name,
            days: dealDate(item.year, item.month, item.day)
        })
    });
    // 保存配置
    config.set("anniversary", anniversary)

    // 处理阳历节日
    let festival = calendar.getFestival()
    for (let key in festival) {
        let name = festival[key].title
        let date = key.split('-')
        let year = now_year
        let month = date[0] - 0
        let week = date[1] - 0
        let loop = date[2] - 0
        let day = 0
        let days = 0
        // 处理第几个星期几
        if (date.length > 2) {
            if (month < now_month) {
                year ++
            }
            day = dealWeekDay(year, month, week, loop)
        } else {
            day = date[1] - 0
            year = (month < now_month || (month == now_month && day < now_day)) ? (now_year + 1) : now_year
        }
        bord_anniversary.left.push({
            name: name,
            days: dealDate(year, month, day)
        })
    }

    // 处理阴历节日
    let lunarDate = calendar.solar2lunar(now_year, now_month, now_day)
    let lunarFestival = calendar.getLunarFestival()
    for (let key in lunarFestival) {
        let date = key.split('-')
        let name = lunarFestival[key].title
        let month = date[0] - 0
        let day = date[1] - 0
        let year = (month < lunarDate.lMonth || (month == lunarDate.lMonth && day < lunarDate.lDay)) ? (now_year + 1) : now_year
        date = calendar.lunar2solar(year, month, day)
        bord_anniversary.left.push({
            name: name,
            days: dealDate(date.cYear, date.cMonth, date.cDay)
        })
    }

    // 处理节气
    for (let index = 0; index < 12; index ++) {
        let termYear = (now_month + index) / 12 >= 1 ? now_year + 1 : now_year
        let termMonth = (now_month + index) % 12;
        (termMonth == 0) && (termMonth = 12);
        for (let i in '__') {
            let termIndex = termMonth * 2 - (i - 0)
            let date = calendar.getTerm(termYear, termIndex)
            bord_anniversary.left.push({
                name: calendar.solarTerm[termIndex - 1],
                days: dealDate(termYear, termMonth, date)
            })
        }
    }

    // 处理九天
    let jiu_year = [now_year - 1, now_year]
    for (let key in jiu_year) {
        let year = jiu_year[key]
        let month = 12
        let day = calendar.getTerm(year, 24)
        let date = new Date()
        date.setFullYear(year)
        date.setMonth(month - 1)
        date.setDate(day)
        for (let index = 0; index < 9; index ++) {
            bord_anniversary.left.push({
                name: (index > 0 ? calendar.nStr1[index + 1] : '入') + '九',
                days: dealDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
            })
            date.setDate(date.getDate() + 9)
        }
    }

    // 处理伏天
    let fu_date = new Date()
    let fu_month = 6
    let fu_day = calendar.getTerm(now_year, 12)
    let fu_date_obj
    let fu_arr = ['入', '中', '闰中']
    let last_fu_str = '末伏'
    let last_fu_date
    do {
        fu_date_obj = calendar.solar2lunar(now_year, fu_month, fu_day ++)
    } while (fu_date_obj.gzDay.indexOf('庚') < 0)
    fu_month = fu_date_obj.cMonth
    fu_day = fu_date_obj.cDay
    fu_date.setMonth(fu_month - 1)
    fu_date.setDate(fu_date_obj.cDay + 20)
    for (let key in fu_arr) {
        bord_anniversary.left.push({
            name: fu_arr[key] + '伏',
            days: dealDate(fu_date.getFullYear(), fu_date.getMonth() + 1, fu_date.getDate())
        })
        last_fu_date = fu_date.getDate()
        fu_date.setDate(fu_date.getDate() + 10)
    }
    fu_month = 8
    fu_day = calendar.getTerm(now_year, 15)
    do {
        fu_date_obj = calendar.solar2lunar(now_year, fu_month, fu_day ++)
    } while (fu_date_obj.gzDay.indexOf('庚') < 0)
    if (fu_date_obj.cDay == last_fu_date) {
        let pop = bord_anniversary.left.pop()
        pop.name = last_fu_str
        bord_anniversary.left.push(pop)
    } else {
        if (!fu_date_obj.isLeap) {
            bord_anniversary.left.pop()
        }
        bord_anniversary.left.push({
            name: last_fu_str,
            days: dealDate(fu_date_obj.cYear, fu_date_obj.cMonth, fu_date_obj.cDay)
        })
    }

    // 只保留一个月内的节日
    bord_anniversary.left = bord_anniversary.left.filter(item => (item.days <= 30) && (item.days >= 0))

    // 排序
    bord_anniversary.count.sort((a, b) => {
        return a.days - b.days
    })
    bord_anniversary.left.sort((a, b) => {
        return a.days - b.days
    })
    // 显示到页面上
    let board_count_div = $('board_count').html("")
    let board_left_div = $('board_left').html("")
    bord_anniversary.count.forEach(item => {
        board_count_div.append(`<li><label>${item.name}</label><label>已过</label><label>${- item.days}</label><label>天</label></li>`)
    });
    bord_anniversary.left.forEach(item => {
        board_left_div.append(`<li><label>${item.name}</label><label>还有</label><label class="${(item.days > 1 && item.days <= 5) ? 'yellow' : (item.days <= 1 ? 'red': '')}">${item.days}</label><label>天</label></li>`)
    });
}

function start() {
    plugins = config.get("plugins")
    anniversary = config.get("anniversary")
    creatItems()
    refresh()
    interval = setInterval(refresh, 1000)
    dealAnniversary()
}

var interval = 0