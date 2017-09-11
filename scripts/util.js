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

    getCurrentWeekStart: function () {
        const current = new Date();
        const currentYear = current.getFullYear();
        const currentMonth = current.getMonth();
        const currentDate = current.getDate();
        const currentDay = current.getDay();
        return new Date(currentYear, currentMonth, currentDate - currentDay + 1);
    },

    getCurrentWeekEnd: function () {
        const current = new Date();
        const currentYear = current.getFullYear();
        const currentMonth = current.getMonth();
        const currentDate = current.getDate();
        const currentDay = current.getDay();
        return new Date(currentYear, currentMonth, currentDate - currentDay + 7);
    },

    inCurrentWeek: function (date) {
        return date > this.getCurrentWeekStart() && date < this.getCurrentWeekEnd();
    },

    covertLeavesToTimecard: function (leaves) {
        const timecard = [{
            project: 'livetext',
            times: [8, 8, 8, 8, 8]
        }, {
            project: 'sick leave',
            times: [0, 0, 0, 0, 0]
        }, {
            project: 'non-sick leave',
            times: [0, 0, 0, 0, 0]
        }];

        leaves.forEach(leave => {
            const startDate = new Date(leave[0]);
            const EndDate = new Date(leave[1]);
            const more = (EndDate - startDate ) / 86400 / 1000;
            const startDateIndex = (startDate.getDay() || 7) - 1;
            const range = _.range(startDateIndex, startDateIndex + more + 1);

            range.forEach((timecardIndex, i) => {
                let peonTime = 0;
                let otherTime = 8;
                if (
                    i === 0 && leave[2] /* Start date half */ === 'Yes' ||
                    i === range.length - 1 && leave[3] /* End date half */ === 'Yes'
                ) {
                    peonTime = 4;
                    otherTime = 4;
                }

                timecard[0].times[timecardIndex] = peonTime;

                switch (leave[4]) {
                    case('sick leave'):
                        timecard[1].times[timecardIndex] = otherTime;
                        break;
                    case('annual leave'):
                        timecard[2].times[timecardIndex] = otherTime;
                        break;
                }
            })
        });

        return timecard;
    }
};