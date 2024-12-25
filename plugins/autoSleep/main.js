const path = require('path');
const childProcess = require('child_process');

const autoSleep = {
    show: function() {
        childProcess.exec(path.join(__dirname, './autoSleep.exe'));
    }
}

module.exports = autoSleep