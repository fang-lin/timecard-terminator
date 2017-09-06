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
    saveOktaCookies: async function (page, logger) {
        const oktaCookies = await page.cookies(page.url());
        const oktaToken = {
            sid: oktaCookies.find(cookie => cookie.name === 'sid'),
            JSESSIONID: oktaCookies.find(cookie => cookie.name === 'JSESSIONID'),
        };
        logger.info('Save Okta Cookies', `sid:"${oktaToken.sid.value}";JSESSIONID:"${oktaToken.JSESSIONID.value}"`);
        return new Promise(resolve => {
            fs.writeFileSync(path.resolve(__dirname, '../okta-cookies.json'), JSON.stringify(oktaToken));
            resolve();
        });
    },
    saveLeaveCookies: async function (page, logger) {
        const leaveCookies = await page.cookies(page.url());
        logger.info('Save Leave Cookies', `${leaveCookies[0].name}`);
        return new Promise(resolve => {
            fs.writeFileSync(path.resolve(__dirname, '../leave-cookies.json'), JSON.stringify(leaveCookies[0]));
            resolve();
        });
    }
};