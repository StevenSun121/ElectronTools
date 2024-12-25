const https = require('https');

const config = require('../../common/js/config').file('plugins/oneWord');
let oneWord = config.get("oneWord")

const $ = require('../../common/js/domUtils')

var size = 50
//页面赋值
function setValue(word, from){
    size = 50

    $("one_word").text(word).setClass(className(word))
    $("word_from").text('—— ' + from).setClass(className(from))

    reset_one_word()
}

//获取字符串的第一个文本, 判断中英文, 返回不同class
function className (str){
    if (escape(str[0]).indexOf( "%u" )<0){
        return 'days'
    }else{
        return 'youyuan'
    }
}

//解决字体过大导致的页面超高
function reset_one_word(){
    let one_word = $("one_word").node
    let height = one_word.offsetHeight
    console.log(height)
    if(height > 327){
        -- size
        reset_one_word(one_word)
    }else{
        margin = (327 - height) / 2 + 70
        one_word.style.fontSize = size + 'px'
        one_word.style.lineHeight = size * 2 * 0.85 + 'px'
        one_word.style.marginTop = margin + 'px'
    }
}

function hitokoto() {
    let resData = ""
    let req = https.get("https://v1.hitokoto.cn/?c=" + oneWord.hitokoto, res => {
        res.on('data',function(data){
            try {
                resData += data;
            } catch (error) {
                // console.log(error);
            }
        })
        res.on('end',function(){  
            let resJson = JSON.parse(resData);
            // console.log(resJson);
            setValue(resJson.hitokoto, resJson.from)
        })
    })
    req.on("error", _ => {
        setValue(oneWord.defaultWord.word, oneWord.defaultWord.from)
    })
}

document.addEventListener('keyup', function(e){
    if(e.keyCode == $.keyCode.Escape){
        hitokoto()
    }
})

hitokoto()