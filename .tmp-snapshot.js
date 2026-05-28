// Temp UI snapshot script (deleted after run). Live URL probe — no Firebase login.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const URL = 'https://clusteruni-debug.github.io/navigator/navigator-v5.html';
const OUT = path.resolve(__dirname, '.tmp-snapshots');

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    const logs = [];
    page.on('console', m => logs.push(`[c-${m.type()}] ${m.text().substring(0, 300)}`));
    page.on('pageerror', e => logs.push(`[pageerror] ${e.message.substring(0, 300)}`));

    try {
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);
    } catch (e) {
        console.log('GOTO_ERR:', e.message);
    }

    await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: true });

    // Tab structure (CSS-class + data attr + onclick scan)
    const tabs = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('button, [role="tab"], .tab, [data-tab]').forEach(el => {
            const txt = (el.innerText || el.textContent || '').trim().substring(0, 30);
            if (!txt) return;
            out.push({
                cls: (el.className || '').substring(0, 80),
                txt,
                dataTab: el.dataset?.tab || null,
                visible: el.offsetParent !== null
            });
        });
        return out.slice(0, 40);
    });

    // Add buttons
    const adds = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('button').forEach(b => {
            const txt = (b.innerText || '').trim();
            const cls = b.className || '';
            if (/추가|add|\+/.test(txt) || /add|btn-add|quick|primary-action/i.test(cls)) {
                out.push({
                    cls: cls.substring(0, 100),
                    txt: txt.substring(0, 50),
                    parentCls: (b.parentElement?.className || '').substring(0, 80),
                    onclick: (b.getAttribute('onclick') || '').substring(0, 100),
                    visible: b.offsetParent !== null
                });
            }
        });
        return out.slice(0, 30);
    });

    // Try clicking 할일 tab (data-tab="all" likely)
    let tabClicked = null;
    for (const sel of ['[data-tab="all"]', 'button[data-tab="all"]', '.tab[data-tab="all"]']) {
        const el = await page.$(sel);
        if (el) {
            try {
                await el.click({ timeout: 3000 });
                tabClicked = sel;
                await page.waitForTimeout(2000);
                break;
            } catch (e) { }
        }
    }
    if (!tabClicked) {
        // Fallback: any button with text 할일/할 일
        const fallback = await page.evaluate(() => {
            const b = Array.from(document.querySelectorAll('button')).find(x => /할\s*일/.test(x.innerText || ''));
            if (b) { b.click(); return b.className; }
            return null;
        });
        tabClicked = fallback;
        await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: `${OUT}/02-tasks-tab.png`, fullPage: true });

    // DOM snapshot of kanban area
    const kanban = await page.evaluate(() => {
        const candidates = ['.kanban-grid', '.all-cat-tier-row', '[data-tier-group]', '[class*="kanban"]', '[class*="all-cat"]'];
        for (const sel of candidates) {
            const el = document.querySelector(sel);
            if (el) {
                return {
                    selector: sel,
                    cls: el.className,
                    childCount: el.children.length,
                    children: Array.from(el.children).slice(0, 8).map(c => ({
                        cls: (c.className || '').substring(0, 100),
                        tag: c.tagName,
                        dataAttrs: Object.entries(c.dataset || {})
                    })),
                    outerHTMLPreview: el.outerHTML.substring(0, 1500)
                };
            }
        }
        return null;
    });

    // Click first work-primary-action / work-quick-btn / .btn-add inside 본업 area
    let addClickInfo = null;
    addClickInfo = await page.evaluate(() => {
        const result = [];
        const workSelectors = ['.work-primary-action', '.work-quick-btn', '.work-project-add-btn', '.btn-add', '.quick-add-btn', '.all-add-btn'];
        for (const sel of workSelectors) {
            document.querySelectorAll(sel).forEach(el => {
                result.push({
                    sel, cls: el.className.substring(0, 100),
                    parentCls: (el.parentElement?.className || '').substring(0, 80),
                    parentParent: (el.parentElement?.parentElement?.className || '').substring(0, 80),
                    text: (el.innerText || '').substring(0, 40)
                });
            });
        }
        return result.slice(0, 15);
    });

    // Click the first visible add button + screenshot the modal
    const firstAdd = await page.$('.work-primary-action, .work-quick-btn, .quick-add-btn, .btn-add');
    if (firstAdd) {
        await firstAdd.scrollIntoViewIfNeeded().catch(() => { });
        await firstAdd.screenshot({ path: `${OUT}/03-add-btn-closeup.png` }).catch(() => { });
        await firstAdd.click({ timeout: 3000 }).catch(e => logs.push(`[click-err] ${e.message}`));
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${OUT}/04-after-add-click.png`, fullPage: true });

        // Inspect modal / dropdown that appeared
        const modal = await page.evaluate(() => {
            const sels = ['.quick-edit-modal', '.modal', '[role="dialog"]', '.add-modal', '.task-modal', '[class*="modal"]'];
            for (const sel of sels) {
                const el = document.querySelector(sel + ':not([style*="display: none"])');
                if (el && el.offsetParent !== null) {
                    return {
                        selector: sel,
                        cls: el.className.substring(0, 100),
                        innerHTMLPreview: el.innerHTML.substring(0, 2000)
                    };
                }
            }
            return null;
        });
        var modalInfo = modal;
    }

    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({
        tabClicked,
        tabsFound: tabs,
        addButtonsScan: adds,
        addBtnsInWorkArea: addClickInfo,
        kanbanStructure: kanban,
        modalAfterAddClick: typeof modalInfo !== 'undefined' ? modalInfo : null,
        consoleLogs: logs.slice(0, 40)
    }, null, 2));

    await browser.close();
    console.log('DONE → ' + OUT);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
