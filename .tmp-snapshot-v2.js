// v2: dismiss onboarding + enter 본업 tab + capture add button sprawl.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const URL = 'https://clusteruni-debug.github.io/navigator/navigator-v5.html';
const OUT = path.resolve(__dirname, '.tmp-snapshots-v2');

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    const logs = [];
    page.on('console', m => logs.push(`[c-${m.type()}] ${m.text().substring(0, 200)}`));
    page.on('pageerror', e => logs.push(`[pageerror] ${e.message.substring(0, 200)}`));

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Dismiss onboarding modal — click "빈 상태로 시작하기"
    const dismissed = await page.evaluate(() => {
        const out = [];
        const btns = Array.from(document.querySelectorAll('button'));
        const empty = btns.find(b => /빈\s*상태로\s*시작/.test(b.innerText || ''));
        if (empty) { empty.click(); out.push('empty-clicked'); }
        const later = btns.find(b => /나중에/.test(b.innerText || ''));
        if (later) { later.click(); out.push('later-clicked'); }
        const closeX = document.querySelectorAll('.modal-close');
        closeX.forEach(c => { try { c.click(); out.push('modal-close-clicked'); } catch (e) { } });
        return out;
    });
    await page.waitForTimeout(2000);

    // Capture sidebar + main overview post-dismiss
    await page.screenshot({ path: `${OUT}/01-dismissed.png`, fullPage: true });

    // ============ 본업 tab ============
    const workTabClick = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.tab-btn'));
        const work = tabs.find(t => (t.innerText || '').trim() === '본업');
        if (work) { work.click(); return { found: true, cls: work.className }; }
        return { found: false, tabs: tabs.map(t => t.innerText) };
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/02-work-tab-full.png`, fullPage: true });

    // Scan all add buttons present on 본업 tab
    const workAddButtons = await page.evaluate(() => {
        const selectors = [
            '.work-primary-action', '.work-quick-btn', '.work-project-add-btn',
            '.btn-add', '.quick-add-btn', '.work-task-add-btn',
            '.work-stage-add', '.work-subcategory-add', '.work-subcat-add'
        ];
        const out = [];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach((el, i) => {
                if (el.offsetParent === null) return; // hidden
                const rect = el.getBoundingClientRect();
                out.push({
                    sel, idx: i,
                    cls: el.className.substring(0, 100),
                    text: (el.innerText || '').substring(0, 50).replace(/\n/g, ' / '),
                    aria: el.getAttribute('aria-label') || '',
                    onclick: (el.getAttribute('onclick') || '').substring(0, 120),
                    parentCls: (el.parentElement?.className || '').substring(0, 80),
                    parentParentCls: (el.parentElement?.parentElement?.className || '').substring(0, 80),
                    rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
                });
            });
        });
        return out;
    });

    // Capture top half (header + stage/project structure) and bottom half separately
    const viewport = page.viewportSize();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/03-work-top.png`, clip: { x: 0, y: 0, width: viewport.width, height: 900 } });

    // Hierarchy structure on 본업 tab
    const workHierarchy = await page.evaluate(() => {
        const main = document.querySelector('main, .tab-content, .work-tab, [data-tab-content="work"], #work-container') ||
            document.body;
        const findHeaders = (root) => {
            const out = [];
            root.querySelectorAll('h1, h2, h3, h4, [class*="header"], [class*="title"], [class*="stage"], [class*="subcategory"], [class*="project-name"]').forEach(h => {
                const txt = (h.innerText || '').trim().substring(0, 60);
                if (!txt || h.offsetParent === null) return;
                const r = h.getBoundingClientRect();
                if (r.height < 5) return;
                out.push({
                    tag: h.tagName,
                    cls: (h.className || '').substring(0, 80),
                    text: txt,
                    y: Math.round(r.y),
                    fontSize: getComputedStyle(h).fontSize,
                    fontWeight: getComputedStyle(h).fontWeight,
                    color: getComputedStyle(h).color
                });
            });
            return out.sort((a, b) => a.y - b.y);
        };
        return findHeaders(main).slice(0, 30);
    });

    // Click first work-primary-action / work-project-add-btn, capture modal
    let clickedSel = null;
    let modalCapture = null;
    const targets = ['.work-primary-action', '.work-project-add-btn', '.work-quick-btn'];
    for (const sel of targets) {
        const el = await page.$(sel);
        if (el) {
            const visible = await el.isVisible().catch(() => false);
            if (!visible) continue;
            try {
                await el.scrollIntoViewIfNeeded();
                await page.waitForTimeout(400);
                await el.screenshot({ path: `${OUT}/04-${sel.replace(/[.\/]/g, '_')}-closeup.png` });
                await el.click({ timeout: 3000 });
                await page.waitForTimeout(2000);
                await page.screenshot({ path: `${OUT}/05-after-${sel.replace(/[.\/]/g, '_')}-click.png`, fullPage: true });
                clickedSel = sel;
                modalCapture = await page.evaluate(() => {
                    const modal = document.querySelector('.modal:not([style*="display: none"]), [role="dialog"], .quick-add-modal, .task-form-modal');
                    if (modal && modal.offsetParent !== null) {
                        return {
                            cls: modal.className.substring(0, 100),
                            innerText: (modal.innerText || '').substring(0, 800),
                            htmlPreview: modal.innerHTML.substring(0, 2000)
                        };
                    }
                    return null;
                });
                break;
            } catch (e) {
                logs.push(`[click-fail] ${sel}: ${e.message}`);
            }
        }
    }

    // Now click 할일 tab and capture kanban (post-dismiss)
    const allTabClick = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.tab-btn'));
        const all = tabs.find(t => /할\s*일/.test((t.innerText || '').trim()));
        if (all) { all.click(); return true; }
        return false;
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/06-all-tab-kanban.png`, fullPage: true });

    // Scroll to kanban + close-up
    await page.evaluate(() => {
        const k = document.querySelector('[data-tier-group="work"]');
        if (k) k.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/07-kanban-scrolled.png`, fullPage: true });

    // Tier header style + 본업 칼럼 detail
    const tierStyles = await page.evaluate(() => {
        const tiers = Array.from(document.querySelectorAll('[data-tier-group]'));
        return tiers.map(t => {
            const header = t.querySelector('.all-tier-header, [class*="tier-header"]');
            const label = header?.querySelector('[class*="label"]');
            const hStyle = header ? getComputedStyle(header) : null;
            const lStyle = label ? getComputedStyle(label) : null;
            return {
                group: t.dataset?.tierGroup,
                headerText: (header?.innerText || '').trim(),
                headerFontSize: hStyle?.fontSize,
                headerFontWeight: hStyle?.fontWeight,
                headerColor: hStyle?.color,
                headerBg: hStyle?.backgroundColor,
                headerBorder: hStyle?.borderBottom,
                headerMargin: hStyle?.margin,
                headerPadding: hStyle?.padding,
                labelStyle: lStyle ? { fontSize: lStyle.fontSize, fontWeight: lStyle.fontWeight, color: lStyle.color } : null
            };
        });
    });

    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({
        dismissedActions: dismissed,
        workTabClickResult: workTabClick,
        workTabAddButtons: workAddButtons,
        workHierarchyHeaders: workHierarchy,
        addBtnClicked: clickedSel,
        modalAfterAddClick: modalCapture,
        allTabClickResult: allTabClick,
        tierHeaderStyles: tierStyles,
        consoleLogs: logs.slice(0, 30)
    }, null, 2));

    await browser.close();
    console.log('V2_DONE → ' + OUT);
})().catch(e => { console.error('FATAL:', e, e.stack); process.exit(1); });
