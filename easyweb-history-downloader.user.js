// ==UserScript==
// @name         EasyWeb History Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Download all statements for all years from EasyWeb
// @author       You
// @match        https://easyweb.td.com/waw/webui/acct/#/
// @grant        none
// ==/UserScript==

(function() {
	'use strict';
	// Main logic will be implemented below
    
	// Utility: wait for element
	function waitForElement(selector, timeout = 10000) {
		return new Promise((resolve, reject) => {
			const start = Date.now();
			function check() {
				const el = document.querySelector(selector);
				if (el) return resolve(el);
				if (Date.now() - start > timeout) return reject('Timeout');
				setTimeout(check, 200);
			}
			check();
		});
	}

	// Step 1: Find year dropdown and get all options
	async function getYearOptions() {
		// Wait for dropdown
		const dropdown = await waitForElement('mat-select[aria-label="Filter by year"]');
		dropdown.click();
		// Wait for overlay options
		await waitForElement('.mat-select-panel');
		// Get all year options
		const options = Array.from(document.querySelectorAll('.mat-option'));
		const years = options.map(opt => ({
			element: opt,
			text: opt.innerText.trim()
		}));
		// Close dropdown
		document.body.click();
		return years;
	}

	// Step 2: Select each year
	async function selectYear(yearElement) {
		// Open dropdown
		const dropdown = document.querySelector('mat-select[aria-label="Filter by year"]');
		dropdown.click();
		await waitForElement('.mat-select-panel');
		yearElement.click();
		// Wait for statements to reload
		await new Promise(r => setTimeout(r, 1500)); // crude wait, can improve
	}

	// Main runner
	async function run(debugMode) {
		try {
			const years = await getYearOptions();
			let totalDownloaded = 0;
			for (const year of years) {
				try {
					await selectYear(year.element);
				} catch (e) {
					console.warn('Failed to select year:', year.text, e);
					continue;
				}
				// Wait for statement table to load
				await new Promise(r => setTimeout(r, 1500));
				const rows = Array.from(document.querySelectorAll('td.mat-cell.mat-column-loadDate'));
				if (rows.length === 0) {
					console.warn('No statement rows found for year:', year.text);
					continue;
				}
				// Instead of finding downloadBtn now, just collect rows
				const statements = rows.map(row => ({
					date: row.innerText.trim(),
					row
				}));
				// In debug mode, only download one statement per year, and stop after 2 total
				let statementsToDownload = statements;
				if (debugMode) {
					statementsToDownload = statements.slice(0, 1);
				}
				for (const s of statementsToDownload) {
					if (debugMode && totalDownloaded >= 2) break;
					try {
						// Click the statement row to open overlay
                        console.log('Clicking statement row for date:', s.date);
						s.row.click();
                        
						// Wait for overlay and download button
                        console.log('Waiting for download button for statement:', s.date);
						await waitForElement('button[aria-label="Download"]', 5000);
                        // Minimal wait to ensure file is ready
                        await new Promise(r => setTimeout(r, 2000));

						const downloadBtn = document.querySelector('button[aria-label="Download"]');
						if (downloadBtn) {
							downloadBtn.click();
							totalDownloaded++;
                            // Wait a bit for download
                            await new Promise(r => setTimeout(r, 1500));
						} else {
							console.warn('Download button not found for statement:', s.date);
						}
						// Close overlay
						const closeBtn = document.querySelector('button[aria-label="Close overlay"]');
						if (closeBtn) closeBtn.click();
						// Wait for overlay to close
						await new Promise(r => setTimeout(r, 800));
					} catch (e) {
						console.warn('Failed to download statement:', s.date, e);
					}
				}
				// Wait before switching to next year
				await new Promise(r => setTimeout(r, 2000));
				if (debugMode && totalDownloaded >= 2) break;
			}
		} catch (e) {
			console.error('Script error:', e);
		}
	}

	// Add floating button to trigger run
	window.addEventListener('load', () => {
		// Create DEBUG checkbox
		const debugLabel = document.createElement('label');
		debugLabel.style.position = 'fixed';
		debugLabel.style.bottom = '60px';
		debugLabel.style.right = '24px';
		debugLabel.style.zIndex = 9999;
		debugLabel.style.background = '#fff';
		debugLabel.style.padding = '6px 12px';
		debugLabel.style.borderRadius = '6px';
		debugLabel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
		debugLabel.style.fontSize = '15px';
		debugLabel.style.display = 'flex';
		debugLabel.style.alignItems = 'center';
		debugLabel.style.gap = '8px';
		debugLabel.style.userSelect = 'none';

		const debugCheckbox = document.createElement('input');
		debugCheckbox.type = 'checkbox';
		debugCheckbox.id = 'ewhd-debug';
		debugLabel.appendChild(debugCheckbox);
		debugLabel.appendChild(document.createTextNode('DEBUG'));

		document.body.appendChild(debugLabel);

		const btn = document.createElement('button');
		btn.textContent = 'Download All Statements';
		btn.style.position = 'fixed';
		btn.style.bottom = '24px';
		btn.style.right = '24px';
		btn.style.zIndex = 9999;
		btn.style.padding = '12px 20px';
		btn.style.background = '#1976d2';
		btn.style.color = '#fff';
		btn.style.border = 'none';
		btn.style.borderRadius = '6px';
		btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
		btn.style.fontSize = '16px';
		btn.style.cursor = 'pointer';
		btn.addEventListener('click', async () => {
			btn.disabled = true;
			btn.textContent = 'Running...';
			const debugCheckbox = document.getElementById('ewhd-debug');
			const debugMode = debugCheckbox && debugCheckbox.checked;
			await run(debugMode);
			btn.textContent = 'Done!';
			setTimeout(() => {
				btn.textContent = 'Download All Statements';
				btn.disabled = false;
			}, 2000);
		});
		document.body.appendChild(btn);
	});
})();
