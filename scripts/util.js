const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

module.exports = {
    screenshot: async function (page, logger) {
        logger.info(page.url())
        await page.screenshot({
            path: `screenshots/${moment().format('YYYYMMDD-HH:mm:ss.SSS')}.png`,
            fullPage: true
        })
    },

    saveCookies: async function (page, logger, filename) {
        const cookies = await page.cookies(page.url());
        logger.info(`Save Cookies > ${filename}.json`);
        return new Promise(resolve => {
            fs.writeFileSync(path.resolve(__dirname, `../data/${filename}.json`), JSON.stringify(cookies));
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
    },

    setRequestInterception: async function (page, logger, exts) {
        await page.setRequestInterceptionEnabled(true);
        page.on('request', request => {
            if (request.url.match(new RegExp(`\\.(${exts})$`, 'i'))) {
                logger.info('Abort Request', request.method, request.url);
                request.abort();
            } else {
                logger.info('Request', request.method, request.url);
                request.continue();
            }
        });
    },

    inCurrentWeek: function (date) {
        const current = new Date();
        const currentYear = current.getFullYear();
        const currentMonth = current.getMonth();
        const currentDate = current.getDate();
        const currentDay = current.getDay();
        const weekStart = new Date(currentYear, currentMonth, currentDate - currentDay);
        const weekEnd = new Date(currentYear, currentMonth, currentDate - currentDay + 6);

        return date > weekStart && date < weekEnd;
    }
};