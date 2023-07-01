const { existsSync, rm } = require('fs')
const { join } = require('path');

module.exports = () => {
    const lib = join(process.cwd(), 'lib');
    if (existsSync(lib)) {
        rm(lib,  { 
            recursive: true, 
            force: true 
        }, err => {
            if (err) throw err;
            else {
                console.log("Lib directory removed, proceeding to build");
            }
        });
    } else {
        console.log("No lib directory found, proceeding to build");
    }
}