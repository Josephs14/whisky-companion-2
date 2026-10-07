// Whisky Companion 2.0 — canonical frontend data layer
(() => {
  'use strict';

  const SCHEMA_VERSION = '2.0';
  const emptyState = () => ({
    whiskies: [], bottles: [], sessions: [], drams: [], competition: [],
    bottleLifecycle: [], fillHistory: [], consumptionEvents: [],
    photos: [], referenceLists: []
  });

  let state = emptyState();
  let lastRefresh = null;
  let loading = false;

  const rows = value => Array.isArray(value) ? value : [];
  const endpoint = () => String(window.WC2_API_ENDPOINT || '').trim();
  const token = () => String(
    window.WC2_API_TOKEN || sessionStorage.getItem('wc2ApiToken') || ''
  ).trim();

  function setToken(value) {
    if (value) sessionStorage.setItem('wc2ApiToken', String(value).trim());
    else sessionStorage.removeItem('wc2ApiToken');
  }

  function normalize(data = {}) {
    return {
      whiskies: rows(data.whiskies),
      bottles: rows(data.bottles),
      sessions: rows(data.sessions),
      drams: rows(data.drams),
      competition: rows(data.competition),
      bottleLifecycle: rows(data.bottleLifecycle),
      fillHistory: rows(data.fillHistory),
      consumptionEvents: rows(data.consumptionEvents),
      photos: rows(data.photos),
      referenceLists: rows(data.referenceLists)
    };
  }

  function indexBy(list, key) {
    const map = new Map();
    list.forEach(row => {
      const id = row && row[key];
      if (id !== '' && id !== null && id !== undefined) map.set(String(id), row);
    });
    return map;
  }

  function getCounts() {
    return Object.fromEntries(Object.entries(state).map(([key, value]) => [key, value.length]));
  }

  function getIndexes() {
    return {
      whiskyById: indexBy(state.whiskies, 'Whisky ID'),
      bottleById: indexBy(state.bottles, 'Bottle ID'),
      sessionById: indexBy(state.sessions, 'Session ID'),
      dramById: indexBy(state.drams, 'Tasting ID')
    };
  }

  async function api(action, payload = {}) {
    if (!endpoint()) throw new Error('API endpoint is not configured.');
    if (!token()) throw new Error('API token is not configured on this device.');

    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({ action, token: token(), payload }),
      cache: 'no-store'
    });

    const json = await response.json();
    if (!response.ok || json.success === false || json.ok === false) {
      throw new Error(json.error || json.message || ('HTTP ' + response.status));
    }
    return json;
  }

  async function refresh() {
    if (loading) return { success: false, busy: true };
    loading = true;
    window.dispatchEvent(new CustomEvent('wc2:loading', {detail: {loading: true}}));

    try {
      if (!endpoint()) throw new Error('API endpoint is not configured.');
      if (!token()) throw new Error('API token is not configured on this device.');

      const url = new URL(endpoint());
      url.searchParams.set('action', 'GET_STATE');
      url.searchParams.set('token', token());

      const response = await fetch(url.toString(), {cache: 'no-store'});
      const json = await response.json();

      if (!response.ok || json.success === false) {
        throw new Error(json.error || ('HTTP ' + response.status));
      }
      if (json.schemaVersion && String(json.schemaVersion) !== SCHEMA_VERSION) {
        throw new Error('Schema mismatch: ' + json.schemaVersion);
      }

      state = normalize(json.data);
      lastRefresh = json.serverTimestamp || new Date().toISOString();

      const detail = {counts: getCounts(), serverTimestamp: lastRefresh};
      window.dispatchEvent(new CustomEvent('wc2:state-refreshed', {detail}));
      return {success: true, ...detail};
    } finally {
      loading = false;
      window.dispatchEvent(new CustomEvent('wc2:loading', {detail: {loading: false}}));
    }
  }

  window.WC2 = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    refresh,
    api,
    setToken,
    getState: () => state,
    getCounts,
    getIndexes,
    getLastRefresh: () => lastRefresh,
    isLoading: () => loading
  });
})();