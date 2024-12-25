const {remote, ipcRenderer} = require('electron')

const config = require('../../common/js/config').file('plugins/_template');

const $ = require('../../common/js/domUtils')

const fs = require('fs');
const jsnes = require('jsnes')

var SCREEN_WIDTH = 256;
var SCREEN_HEIGHT = 240;
var FRAMEBUFFER_SIZE = SCREEN_WIDTH*SCREEN_HEIGHT;

var canvas_ctx, image;
var framebuffer_u8, framebuffer_u32;

var AUDIO_BUFFERING = 512;
var SAMPLE_COUNT = 4*1024;
var SAMPLE_MASK = SAMPLE_COUNT - 1;
var audio_samples_L = new Float32Array(SAMPLE_COUNT);
var audio_samples_R = new Float32Array(SAMPLE_COUNT);
var audio_write_cursor = 0, audio_read_cursor = 0;

var nes = new jsnes.NES({
    onFrame: function(framebuffer_24){
        for(var i = 0; i < FRAMEBUFFER_SIZE; i++) framebuffer_u32[i] = 0xFF000000 | framebuffer_24[i];
    },
    onAudioSample: function(l, r){
        audio_samples_L[audio_write_cursor] = l;
        audio_samples_R[audio_write_cursor] = r;
        audio_write_cursor = (audio_write_cursor + 1) & SAMPLE_MASK;
    },
});

function onAnimationFrame(){
    window.requestAnimationFrame(onAnimationFrame);

    image.data.set(framebuffer_u8);
    canvas_ctx.putImageData(image, 0, 0);
    nes.frame();
}

function audio_remain(){
    return (audio_write_cursor - audio_read_cursor) & SAMPLE_MASK;
}

function audio_callback(event){
    var dst = event.outputBuffer;
    var len = dst.length;

    // Attempt to avoid buffer underruns.
    if(audio_remain() < AUDIO_BUFFERING) nes.frame();

    var dst_l = dst.getChannelData(0);
    var dst_r = dst.getChannelData(1);
    for(var i = 0; i < len; i++){
        var src_idx = (audio_read_cursor + i) & SAMPLE_MASK;
        dst_l[i] = audio_samples_L[src_idx];
        dst_r[i] = audio_samples_R[src_idx];
    }

    audio_read_cursor = (audio_read_cursor + len) & SAMPLE_MASK;
}


function keyboard(callback, event){
    switch(event.key){
        case 'w': // UP
            callback(1, jsnes.Controller.BUTTON_UP); break;
        case 's': // Down
            callback(1, jsnes.Controller.BUTTON_DOWN); break;
        case 'a': // Left
            callback(1, jsnes.Controller.BUTTON_LEFT); break;
        case 'd': // Right
            callback(1, jsnes.Controller.BUTTON_RIGHT); break;
        case 'k': // 'a' - qwerty, dvorak
            callback(1, jsnes.Controller.BUTTON_A); break;
        case 'j': // 'o' - dvorak
            callback(1, jsnes.Controller.BUTTON_B); break;
        case 'f': // Tab
            callback(1, jsnes.Controller.BUTTON_SELECT); break;
        case 'h': // Return
            callback(1, jsnes.Controller.BUTTON_START); break;



        case 'ArrowUp': // UP
            callback(2, jsnes.Controller.BUTTON_UP); break;
        case 'ArrowDown': // Down
            callback(2, jsnes.Controller.BUTTON_DOWN); break;
        case 'ArrowLeft': // Left
            callback(2, jsnes.Controller.BUTTON_LEFT); break;
        case 'ArrowRight': // Right
            callback(2, jsnes.Controller.BUTTON_RIGHT); break;
        case '*': // 'a' - qwerty, dvorak
            callback(2, jsnes.Controller.BUTTON_A); break;
        case '-': // 'o' - dvorak
            callback(2, jsnes.Controller.BUTTON_B); break;
        case '1': // Tab
            callback(2, jsnes.Controller.BUTTON_SELECT); break;
        case '2': // Return
            callback(2, jsnes.Controller.BUTTON_START); break;

        default: break;
    }
}

function nes_init(canvas_id){
    var canvas = document.getElementById(canvas_id);
    canvas_ctx = canvas.getContext("2d");
    image = canvas_ctx.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    canvas_ctx.fillStyle = "black";
    canvas_ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Allocate framebuffer array.
    var buffer = new ArrayBuffer(image.data.length);
    framebuffer_u8 = new Uint8ClampedArray(buffer);
    framebuffer_u32 = new Uint32Array(buffer);

    // Setup audio.
    var audio_ctx = new window.AudioContext();
    var script_processor = audio_ctx.createScriptProcessor(AUDIO_BUFFERING, 0, 2);
    script_processor.onaudioprocess = audio_callback;
    script_processor.connect(audio_ctx.destination);
    if (audio_ctx.state !== 'running') {
        //显示 mask
        showMask(function() {
            audio_ctx.resume()
        });
    }
}

function showMask(cb) {
    var mask = document.getElementById('game-mask');
    var btn = document.getElementById('start_game');
    if (!mask || !btn) {
        return;
    }
    mask.style.display = 'block';
    btn.addEventListener('click', function() {
        mask.style.display = 'none';
        cb && cb();
    });
}

function nes_boot(rom_data){
    nes.loadROM(rom_data);
    window.requestAnimationFrame(onAnimationFrame);
}

function init() {
    nes_init("nes-canvas");
    var romData = fs.readFileSync('F:/nes/rom/lj65.nes', {encoding: 'binary'});
    nes_boot(romData)
}

document.addEventListener('keydown', (event) => {keyboard(nes.buttonDown, event)});
document.addEventListener('keyup', (event) => {keyboard(nes.buttonUp, event)});

init()

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