// A single static route: assetPrefix avoids vinext beta's basePath export bug.
const assetPrefix = (process.env.PAGES_BASE_PATH || '').replace(/\/$/, '');
export default { output: 'export', assetPrefix };
