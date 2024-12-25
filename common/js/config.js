const userHome = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];

function file(fileName) {
    return new Config(fileName);
}

class Config{
    constructor(fileName) {
        this.fileName = fileName;
        this.nconf = require('nconf').file({file: `${userHome}/.ElectronTools/${fileName}.json`});
        this.nconf.load();
        return this;
    }
    reload() {
        this.nconf.load()
        return this
    }
    get(key) {
        return this.nconf.get(key);
    }
    set(key, value) {
        this.nconf.set(key, value);
        this.nconf.save();
    }
    remove(key) {
        this.nconf.remove(key);
    }
}

module.exports = {
    file
};