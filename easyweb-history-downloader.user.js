// ==UserScript==
// @name         EasyWeb History Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Download all statements for all years from EasyWeb
// @author       You
// @match        *://*/*
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
	async function run() {
		try {
			const years = await getYearOptions();
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
				const statements = rows.map(row => {
					let downloadBtn = null;
					const tr = row.closest('tr');
					if (tr) {
						downloadBtn = tr.querySelector('button[aria-label="Download"]');
					}
					if (!downloadBtn) {
						downloadBtn = row.parentElement.querySelector('button[aria-label="Download"]');
					}
					return {
						date: row.innerText.trim(),
						downloadBtn
					};
				}).filter(s => s.downloadBtn);
				for (const s of statements) {
					try {
						s.downloadBtn.click();
						await new Promise(r => setTimeout(r, 1500));
					} catch (e) {
						console.warn('Failed to download statement:', s.date, e);
					}
				}
				// Wait before switching to next year
				await new Promise(r => setTimeout(r, 2000));
			}
		} catch (e) {
			console.error('Script error:', e);
		}
	}

	// Add floating button to trigger run
	window.addEventListener('load', () => {
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
			// await run();
			btn.textContent = 'Done!';
			setTimeout(() => {
				btn.textContent = 'Download All Statements';
				btn.disabled = false;
			}, 2000);
		});
		document.body.appendChild(btn);
	});
})();
