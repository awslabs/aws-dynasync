const { writeFile, mkdir } = require('fs');
const { join } = require('path');
const homedir = require('os').homedir();

const fn = () => {
    const path = join(homedir, '.aws')
    const template = `
        [default]
        aws_access_key_id=${process.env.AWS_ACCESS_KEY_ID}
        aws_secret_access_key=${process.env.AWS_SECRET_ACCESS_KEY}
        region=${process.env.CDK_DEFAULT_REGION}
    `
    return new Promise((res,rej) => {
        mkdir(path, err => {
            if (err) {
                console.error(err);
                rej();
                throw err;
            }

            writeFile(join(path, 'credentials'), template, err => {
                if (err) {
                    console.error(err);
                    rej();
                    throw err;
                }
                console.log("Credentials File Created");
                res();
            })
        });
    });
}

module.exports = fn;

if (process.argv[2] === 'run') fn();