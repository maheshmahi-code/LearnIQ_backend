// #region agent log
const _log = (loc, msg, data, hid) => {
  fetch('http://127.0.0.1:7494/ingest/50249b81-dc62-4196-b427-a49e48085d3f', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89a468' },
    body: JSON.stringify({ sessionId: '89a468', location: loc, message: msg, data: data || {}, timestamp: Date.now(), hypothesisId: hid })
  }).catch(() => {});
};
// #endregion
module.exports = { _log };
