const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const util = require('./util');
const oktaCookies = require('../data/okta-cookies.json');
const timeCardCookies = require('../data/timecard-cookies.json');
const currentWeekLeaves = require('../data/current-week-leaves.json');
const logger = require('log4js').getLogger('time-card');
logger.level = 'debug';

const timeCardArray = util.covertLeavesToTimecard(currentWeekLeaves);

async function setLineOfTimeCard(page, lineIndex, project = {
    keyword: 'livetext',
    selectIndex: 1
}, subProject = {
    selectIndex: 1
}, location = {
    selectIndex: 14
}, times) {
    const tableSelector = `.f-grid-item-container > table:nth-child(${lineIndex})`;
    // Project / Assignment
    await page.focus(`${tableSelector} input[placeholder="Project / Assignment"]`);
    await page.type(project.keyword);
    await page.waitForNavigation({waitUntil: 'networkidle'});

    const listId = await page.$eval('.f-boundlist', () => {
        let id = '';
        for (const list of document.querySelectorAll('.f-boundlist')) {
            if (list.style.dispaly !== 'none') {
                id = list.id
            }
        }
        return id;
    });

    await (await page.$(`#${listId}-listWrap li:nth-child(${project.selectIndex})`)).click();
    await page.waitForNavigation({waitUntil: 'networkidle'});

    // Sub project
    await (await page.$(`${tableSelector} td:nth-child(4) div`)).click();
    await (await page.$('#ff-fields-milestone-1131-trigger-picker')).click();
    await (await page.$(`#boundlist-1133-listWrap li:nth-child(${subProject.selectIndex})`)).click();
    // Location
    await (await page.$(`${tableSelector} td:nth-child(5) div`)).click();
    await (await page.$('#fforcePickList-1134-trigger-picker')).click();
    await (await page.$(`#boundlist-1136-listWrap li:nth-child(${location.selectIndex})`)).click();
    // Set times
    await (await page.$(`${tableSelector} td:nth-child(7) div`)).click();
    await page.focus('#numberfield-1137-inputEl');
    await page.type(times[0].toString());
    await (await page.$(`${tableSelector} td:nth-child(8) div`)).click();
    await page.focus('#numberfield-1139-inputEl');
    await page.type(times[1].toString());
    await (await page.$(`${tableSelector} td:nth-child(9) div`)).click();
    await page.focus('#numberfield-1141-inputEl');
    await page.type(times[2].toString());
    await (await page.$(`${tableSelector} td:nth-child(10) div`)).click();
    await page.focus('#numberfield-1143-inputEl');
    await page.type(times[3].toString());
    await (await page.$(`${tableSelector} td:nth-child(11) div`)).click();
    await page.focus('#numberfield-1145-inputEl');
    await page.type(times[4].toString());
}

(async () => {
    const browser = await puppeteer.launch({headless: false, ignoreHTTPSErrors: true});
    const oktaPage = await browser.newPage();
    await util.setRequestInterception(oktaPage, logger, 'png|jpg|gif|ico|css');

    await util.setCookies(oktaPage, oktaCookies);

    await oktaPage.goto('https://thoughtworks.okta.com/app/UserHome');

    await oktaPage.waitForNavigation({waitUntil: 'networkidle'});
    await util.screenshot(oktaPage, logger);

    const timeCardPage = await browser.newPage();
    // await util.setRequestInterception(timeCardPage, logger, 'png|jpg|ico');

    await util.setCookies(timeCardPage, timeCardCookies);
    await timeCardPage.goto('https://thoughtworks.my.salesforce.com/home/home.jsp');
    await timeCardPage.waitForNavigation({waitUntil: 'networkidle'});

    await timeCardPage.waitForSelector('.wt-Timecard_Header a');
    await (await timeCardPage.$('.wt-Timecard_Header a')).click();

    await oktaPage.waitFor(10 * 1000);
    await timeCardPage.waitForSelector('#actionForm');
    await util.screenshot(timeCardPage, logger);

    const lastRecordStartDate = await timeCardPage.$eval('.pbBody table > tbody > tr.dataRow.first > td:nth-child(5)', el => el.innerText);
    const lastRecordEndDate = await timeCardPage.$eval('.pbBody table > tbody > tr.dataRow.first > td:nth-child(6)', el => el.innerText);

    if (
        new Date(lastRecordStartDate).toDateString() === util.getCurrentWeekStart().toDateString() &&
        new Date(lastRecordEndDate).toDateString() === util.getCurrentWeekEnd().toDateString()
    ) {
        logger.warn('Current week Timecard has been created!')
    } else {
        // Click "new" button of time card
        await (await timeCardPage.$('input[name=pse__time_entry]')).click();

        await timeCardPage.waitForSelector('#tableview-1039');
        await timeCardPage.waitForNavigation({waitUntil: 'networkidle'});
        await oktaPage.waitFor(10 * 1000);

        let lineCount = 1;

        // Peon
        const peon = timeCardArray[0];
        if (_.sum(peon.times) > 0) {
            await setLineOfTimeCard(timeCardPage, lineCount++, {
                keyword: 'livetext',
                selectIndex: 1
            }, {
                selectIndex: 2
            }, {
                selectIndex: 14
            }, peon.times)
        }

        // Sick Leave
        const sickLeave = timeCardArray[1];
        if (_.sum(sickLeave.times) > 0) {
            await setLineOfTimeCard(timeCardPage, lineCount++, {
                keyword: 'sick leave',
                selectIndex: 2
            }, {
                selectIndex: 7
            }, {
                selectIndex: 14
            }, sickLeave.times)
        }

        // non-Sick Leave
        const nonSickLeave = timeCardArray[2];
        if (_.sum(nonSickLeave.times) > 0) {
            await setLineOfTimeCard(timeCardPage, lineCount++, {
                keyword: 'non-sick leave',
                selectIndex: 1
            }, {
                selectIndex: 1
            }, {
                selectIndex: 14
            }, nonSickLeave.times)
        }

        await util.screenshot(timeCardPage, logger);
        await (await timeCardPage.$('#savebutton-1100')).click();
        await timeCardPage.waitFor(10 * 1000);
        await (await timeCardPage.$('#button-1101')).click();
        await timeCardPage.waitFor(2 * 1000);
        await (await timeCardPage.$('a[data-ffid=submitBoxButtonId]')).click();
    }

    await oktaPage.waitFor(3 * 1000);
    await util.screenshot(timeCardPage, logger);

    await util.saveCookies(oktaPage, logger, 'okta-cookies');
    await util.saveCookies(timeCardPage, logger, 'timecard-cookies');

    browser.close();
})();