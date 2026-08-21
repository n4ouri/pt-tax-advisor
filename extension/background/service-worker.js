/**
 * Background Service Worker for Manifest V3 Extension
 */

import { generateAdvisorReport } from './advisor-engine.js';
import { diffSnapshots } from './diff-engine.js';

// Setup periodic alarm for deadline checks & advisor recalculations
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('advisorDailyCheck', { periodInMinutes: 720 }); // every 12 hours
  console.log('[PT-Advisor] Service Worker installed & alarms configured.');
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'advisorDailyCheck') {
    await refreshAdvisorReport();
  }
});

// Message listener from Content Scripts and UI Popups
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SAVE_SNAPSHOT') {
    handleIncomingSnapshot(message.payload)
      .then((res) => sendResponse({ success: true, ...res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (message.action === 'GET_ADVISOR_DATA') {
    getAggregatedAdvisorData()
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'CLEAR_ALL_DATA') {
    chrome.storage.local.clear(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Handle new snapshot from content scripts
 */
async function handleIncomingSnapshot(payload) {
  const { source, section, data } = payload;
  const timestamp = new Date().toISOString();

  const currentStorage = await chrome.storage.local.get([
    'snapshots',
    'historyLog',
    'aggregatedState'
  ]);

  const snapshots = currentStorage.snapshots || [];
  const historyLog = currentStorage.historyLog || [];
  const aggregatedState = currentStorage.aggregatedState || {
    at: {},
    segSocial: {},
    efatura: {}
  };

  // Find previous snapshot from the same source
  const lastSnapshotForSource = [...snapshots].reverse().find(s => s.source === source);

  const newSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp,
    source,
    section,
    data
  };

  // Run diff engine
  const diffs = diffSnapshots(lastSnapshotForSource, newSnapshot);

  // Update aggregated state
  if (source === 'AT') {
    aggregatedState.at = { ...aggregatedState.at, ...data, lastUpdated: timestamp };
  } else if (source === 'SS') {
    aggregatedState.segSocial = { ...aggregatedState.segSocial, ...data, lastUpdated: timestamp };
  } else if (source === 'EFATURA') {
    aggregatedState.efatura = { ...aggregatedState.efatura, ...data, lastUpdated: timestamp };
  }

  // Generate updated advisor report
  const advisorReport = generateAdvisorReport(aggregatedState);

  // Append snapshot (limit to last 100 snapshots)
  snapshots.push(newSnapshot);
  if (snapshots.length > 100) snapshots.shift();

  // Append diffs to history log
  if (diffs.length > 0) {
    diffs.forEach(d => {
      historyLog.unshift({
        ...d,
        timestamp
      });

      // Trigger browser notification for critical or high-priority changes
      if (d.severity === 'CRITICAL' || d.severity === 'HIGH' || d.type === 'STATUS_CHANGE') {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../icons/icon128.png',
          title: d.title || 'Alerta Fiscal / Segurança Social',
          message: d.message || 'Houve uma alteração relevante no seu portal.',
          priority: 2
        });
      }
    });
  }

  // Update badge with critical alerts count or health score
  const criticalCount = advisorReport.alerts.filter(a => a.level === 'CRITICAL').length;
  if (criticalCount > 0) {
    chrome.action.setBadgeText({ text: `${criticalCount}` });
    chrome.action.setBadgeBackgroundColor({ color: '#E53E3E' });
  } else if (advisorReport.taxSummary.pendingInvoicesCount > 0) {
    chrome.action.setBadgeText({ text: `${advisorReport.taxSummary.pendingInvoicesCount}` });
    chrome.action.setBadgeBackgroundColor({ color: '#DD6B20' });
  } else {
    chrome.action.setBadgeText({ text: 'OK' });
    chrome.action.setBadgeBackgroundColor({ color: '#38A169' });
  }

  // Persist to chrome.storage.local
  await chrome.storage.local.set({
    snapshots,
    historyLog: historyLog.slice(0, 200),
    aggregatedState,
    advisorReport,
    lastRefreshed: timestamp
  });

  return {
    diffCount: diffs.length,
    advisorReport
  };
}

/**
 * Retrieve aggregated advisor data and report
 */
async function getAggregatedAdvisorData() {
  const data = await chrome.storage.local.get([
    'aggregatedState',
    'advisorReport',
    'historyLog',
    'snapshots',
    'lastRefreshed'
  ]);

  if (!data.advisorReport && data.aggregatedState) {
    data.advisorReport = generateAdvisorReport(data.aggregatedState);
  }

  return data;
}

/**
 * Recalculate advisor report in background
 */
async function refreshAdvisorReport() {
  const current = await chrome.storage.local.get(['aggregatedState']);
  if (current.aggregatedState) {
    const advisorReport = generateAdvisorReport(current.aggregatedState);
    await chrome.storage.local.set({ advisorReport });
  }
}
