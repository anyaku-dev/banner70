// Download endpoint for buyers.
// GET  /api/download?token=...  -> confirmation page (does not consume a download)
// POST /api/download             -> consumes one download and redirects to a short-lived signed URL
import { handleDownloadPageRequest, handleDownloadRedeemRequest } from './_delivery.js';
import { getContactUrl, getDownloadService } from './_services.js';

export function GET(request) {
  return handleDownloadPageRequest(request, { service: getDownloadService(), contactUrl: getContactUrl() });
}

export function POST(request) {
  return handleDownloadRedeemRequest(request, { service: getDownloadService(), contactUrl: getContactUrl() });
}
