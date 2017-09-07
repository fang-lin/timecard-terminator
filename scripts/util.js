const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

module.exports = {
    screenshot: async function (page, logger) {
        logger.info(page.url())
        return await page.screenshot({
            path: `screenshots/${moment().format('YYYYMMDD-HH:mm:ss.SSS')}.png`,
            fullPage: true
        })
    },

    saveCookies: async function (page, logger, filename) {
        const oktaCookies = await page.cookies(page.url());
        logger.info('Save Okta Cookies');
        return new Promise(resolve => {
            fs.writeFileSync(path.resolve(__dirname, `../${filename}.json`), JSON.stringify(oktaCookies));
            resolve();
        });
    },

    setCookies: async (page, cookies) => await Promise.all(cookies.filter(_ => _.session).map(async (cookie) => await page.setCookie(_.pick(cookie, ['name', 'value', 'domain'])))),

    fetchSmsCode: async function waitSmsCode(page, logger, count) {
        await page.waitFor(1000);
        const smsCode = fs.readFileSync(path.resolve(__dirname, '../sms-code.txt')).toString().trim();
        if (smsCode) {
            logger.info('SMS Code', `"${smsCode}"`);
            return smsCode;
        } else {
            return await waitSmsCode(page, logger, ++count);
        }
    },

    initSmsCode: async function () {
        return new Promise(resolve => {
            fs.openSync(path.normalize(path.resolve(__dirname, '../sms-code.txt')), 'w');
            resolve();
        });
    }
};