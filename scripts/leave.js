const puppeteer = require('puppeteer');
const moment = require('moment');
const $ = require('jquery');
const fs = require('fs');
const path = require('path');
const util = require('./util');
const oktaCookies = require('../data/okta-cookies.json');
const leaveCookies = require('../data/leave-cookies.json');

const logger = require('log4js').getLogger('leave');
logger.level = 'debug';

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const oktaPage = await browser.newPage();

    await util.setRequestInterception(oktaPage, logger, 'png|jpg|ico|css');
    await util.setCookies(oktaPage, oktaCookies);

    await oktaPage.goto('https://thoughtworks.okta.com/app/UserHome');
    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});
    await util.screenshot(oktaPage, logger);

    const leavePage = await browser.newPage();
    await util.setRequestInterception(leavePage, logger, 'png|jpg|ico');

    await util.setCookies(leavePage, leaveCookies);
    await leavePage.goto('https://china-leave.herokuapp.com/leave_details/new');
    await leavePage.waitForNavigation({waitUntil: 'networkidle'});
    await leavePage.waitForSelector('.row-center-width > div:nth-child(3) a');
    await (await leavePage.$('.row-center-width > div:nth-child(3) a')).click();

    await leavePage.waitForSelector('table.bordered');
    await leavePage.waitForNavigation({waitUntil: 'networkidle'});
    await util.screenshot(leavePage, logger);

    const listHTML = await leavePage.$eval('table.bordered tbody', el => el.innerHTML);
    const leaves = listHTML.match(/<tr>[\s\S]*?<\/tr>/ig).map(tr =>
        tr.match(/<td>[\s\S]*?<\/td>/ig).filter((td, i) => [2, 3, 4, 5, 6].includes(i)).map(td =>
            td.replace(/<\/?td>/ig, '')
        )
    );

    logger.info('Save leaves > leaves.json');
    fs.writeFileSync(path.resolve(__dirname, `../data/leaves.json`), JSON.stringify(leaves));

    await util.saveCookies(oktaPage, logger, 'okta-cookies');
    await util.saveCookies(leavePage, logger, 'leave-cookies');

    browser.close();
})();