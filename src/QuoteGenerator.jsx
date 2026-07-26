import React, { useState } from 'react';
import { FileDown, Loader, AlertCircle, CheckCircle } from 'lucide-react';

export default function QuoteGenerator() {
  const [dealId, setDealId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quoteData, setQuoteData] = useState(null);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD for the date input
  });

  // Ops Solutions company info (your static data)
  const opsInfo = {
    company: 'Ops Solutions',
    address: '307 Vine St, Euless, TX',
    city: 'Euless, TX 76040-3800',
    country: 'United States',
    preparedBy: 'Mostafa Ali',
    preparedByTitle: 'Sr. GTM Systems & RevOps',
    preparedByLink: 'https://www.linkedin.com/in/mostafa-ahmed-ali/',
    email: 'mostafa@opsolutionss.com',
    phone: '+18628884214',
    bankDetails: {
      institution: 'HSBC Bank (Egypt)',
      accountHolder: 'Moustafa Mohamed Ahmed Ahmed Aly',
      accountNumber: '071-254114-017',
      iban: 'EG750025007100000071254114017',
      swift: 'EBBBKEGCX'
    }
  };

  const escapeHtml = (str) => {
    const div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str).replace(/[&<>"']/g, (c) => div[c]);
  };

  const formatExpiryDate = () => {
    if (!expiryDate) return '';
    const [year, month, day] = expiryDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const fetchHubSpotData = async () => {
    if (!dealId.trim()) {
      setError('Please enter a Deal ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch deal data through our serverless proxy (avoids CORS, keeps the key server-side)
      const dealResponse = await fetch(`/api/hubspot?type=deal&id=${dealId}`);
      const dealData = await dealResponse.json();

      if (!dealResponse.ok) {
        throw new Error(dealData.error || 'Deal not found. Check your Deal ID.');
      }

      const dealProperties = dealData.properties;

      // Debug: open your browser console (F12) to see exactly what HubSpot returned
      console.log('HubSpot deal response:', dealData);

      // Get associated company id — fall back to a direct associations call
      // if the inline "associations" field didn't come back (can happen
      // depending on the private app's scopes)
      let companyId = dealData.associations?.companies?.results?.[0]?.id;
      if (!companyId) {
        const assocRes = await fetch(`/api/hubspot?type=associations&id=${dealId}&toType=companies`);
        if (assocRes.ok) {
          const assocData = await assocRes.json();
          companyId = assocData.results?.[0]?.toObjectId || assocData.results?.[0]?.id;
        }
      }

      let companyData = null;
      if (companyId) {
        const companyResponse = await fetch(`/api/hubspot?type=company&id=${companyId}`);
        if (companyResponse.ok) {
          const company = await companyResponse.json();
          companyData = company.properties;
          console.log('HubSpot company response:', company);
        }
      }

      // Get line item ids — same fallback approach
      let lineItemIds = (dealData.associations?.line_items?.results || []).map(r => r.id);
      if (lineItemIds.length === 0) {
        const assocRes = await fetch(`/api/hubspot?type=associations&id=${dealId}&toType=line_items`);
        if (assocRes.ok) {
          const assocData = await assocRes.json();
          lineItemIds = (assocData.results || []).map(r => r.toObjectId || r.id);
        }
      }

      let lineItems = [];
      if (lineItemIds.length > 0) {
        const lineItemPromises = lineItemIds.map(itemId =>
          fetch(`/api/hubspot?type=lineitem&id=${itemId}`).then(res => res.json())
        );

        const lineItemsResults = await Promise.all(lineItemPromises);
        console.log('HubSpot line item responses:', lineItemsResults);
        lineItems = lineItemsResults.map(item => ({
          id: item.id,
          name: item.properties?.name || 'Unknown Product',
          quantity: parseFloat(item.properties?.quantity || 1),
          price: parseFloat(item.properties?.price || 0),
          discount: parseFloat(item.properties?.discount || 0)
        }));
      }

      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDiscount = lineItems.reduce((sum, item) => sum + item.discount, 0);
      const total = subtotal - totalDiscount;

      setQuoteData({
        dealId,
        dealName: dealProperties.dealname || 'Deal',
        scope: dealProperties.scope || '',
        purchaseTerms: dealProperties.purchase_terms || '',
        company: {
          name: companyData?.name || 'Client Company',
          address: companyData?.address || '',
          city: companyData?.city || '',
          state: companyData?.state || '',
          zip: companyData?.zip || '',
          country: companyData?.country || ''
        },
        lineItems,
        subtotal,
        totalDiscount,
        hasDiscount: totalDiscount > 0,
        total,
        createdDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch data from HubSpot');
      setQuoteData(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!quoteData) return;

    // Open a dedicated print window with a proper invoice layout, then
    // trigger the browser's print dialog so the user can "Save as PDF".
    // This produces a real, well-formatted PDF instead of a raw .html file.
    const htmlContent = generatePDFHTML();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const generatePDFHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Quote ${quoteData.dealId}</title>
        <style>
          @page { size: letter; margin: 0.6in; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1e293b; }
          .logo-mark { display: flex; align-items: center; gap: 12px; }
          .logo-img { height: 48px; width: auto; }
          .logo-text { font-size: 22px; font-weight: bold; color: #1e293b; }
          .logo-sub { font-size: 11px; color: #64748b; }
          .quote-title { text-align: right; }
          .quote-title h1 { margin: 0; font-size: 26px; color: #1e293b; }
          .quote-title p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 28px; gap: 20px; }
          .info-block { flex: 1; }
          .info-block h3 { margin: 0 0 8px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-block p { margin: 3px 0; font-size: 13px; line-height: 1.5; }
          .dates { display: flex; gap: 40px; margin-bottom: 24px; font-size: 13px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #1e293b; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; }
          th.num, td.num { text-align: right; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .total-section { display: flex; justify-content: flex-end; margin: 20px 0; }
          .total-table { width: 280px; font-size: 13px; }
          .total-table div { display: flex; justify-content: space-between; padding: 6px 0; }
          .total-table .grand { font-size: 17px; font-weight: bold; border-top: 2px solid #1e293b; padding-top: 10px; margin-top: 4px; }
          .bank-details { background-color: #f1f5f9; padding: 14px 16px; margin-top: 16px; font-size: 12px; border-radius: 6px; }
          .bank-details h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #475569; }
          .signature-section { display: flex; gap: 60px; margin-top: 60px; page-break-inside: avoid; }
          .signature-block { flex: 1; }
          .signature-line { border-top: 1px solid #1e293b; margin-top: 40px; padding-top: 6px; font-size: 11px; color: #64748b; }
          .terms { font-size: 10.5px; color: #64748b; margin-top: 30px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          .page-footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 40px; }
          .terms-page { page-break-before: always; padding-top: 20px; display: flex; flex-direction: column; min-height: 9in; }
          .terms-page h2 { font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
          .terms-section { margin-bottom: 28px; }
          .terms-section h3 { font-size: 13px; text-transform: uppercase; color: #475569; margin-bottom: 10px; }
          .terms-body { font-size: 11.5px; line-height: 1.6; white-space: pre-wrap; color: #334155; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-mark">
            <img class="logo-img" src="https://47432935.fs1.hubspotusercontent-na1.net/hubfs/47432935/Logos/Group.png" alt="Ops Solutions logo" />
            <div>
              <div class="logo-text">Ops Solutions</div>
              <div class="logo-sub">Revenue Operations & GTM Consulting</div>
            </div>
          </div>
          <div class="quote-title">
            <h1>QUOTE</h1>
            <p>Deal ID: ${quoteData.dealId}</p>
          </div>
        </div>

        <div class="info-section">
          <div class="info-block">
            <h3>Client</h3>
            <p><strong>${quoteData.dealName}</strong></p>
            ${quoteData.company.address ? `<p>${quoteData.company.address}</p>` : ''}
            <p>${[quoteData.company.city, quoteData.company.state, quoteData.company.zip].filter(Boolean).join(', ')}</p>
            ${quoteData.company.country ? `<p>${quoteData.company.country}</p>` : ''}
          </div>
          <div class="info-block">
            <h3>From</h3>
            <p><strong>${opsInfo.company}</strong></p>
            <p>${opsInfo.address}</p>
            <p>${opsInfo.city}</p>
            <p>${opsInfo.country}</p>
          </div>
          <div class="info-block">
            <h3>Prepared By</h3>
            <p><strong>${opsInfo.preparedBy}</strong></p>
            <p><a href="${opsInfo.preparedByLink}" style="color:#2563eb; text-decoration:none;">${opsInfo.preparedByTitle}</a></p>
            <p>${opsInfo.email}</p>
            <p>${opsInfo.phone}</p>
          </div>
        </div>

        <div class="dates">
          <span><strong>Quote Created:</strong> ${quoteData.createdDate}</span>
          <span><strong>Expires:</strong> ${formatExpiryDate()}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Products &amp; Services</th>
              <th class="num">Qty</th>
              <th class="num">Price</th>
              ${quoteData.hasDiscount ? '<th class="num">Discount</th>' : ''}
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quoteData.lineItems.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="num">${item.quantity}</td>
                <td class="num">$${item.price.toFixed(2)}</td>
                ${quoteData.hasDiscount ? `<td class="num">${item.discount > 0 ? `-$${item.discount.toFixed(2)}` : '—'}</td>` : ''}
                <td class="num">$${((item.price * item.quantity) - item.discount).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-table">
            <div><span>Subtotal</span><span>$${quoteData.subtotal.toFixed(2)}</span></div>
            ${quoteData.hasDiscount ? `<div><span>Discount</span><span>-$${quoteData.totalDiscount.toFixed(2)}</span></div>` : ''}
            <div class="grand"><span>Total</span><span>$${quoteData.total.toFixed(2)}</span></div>
          </div>
        </div>

        <div class="bank-details">
          <h4>Banking Information</h4>
          <p><strong>Institution:</strong> ${opsInfo.bankDetails.institution}</p>
          <p><strong>Account Holder:</strong> ${opsInfo.bankDetails.accountHolder}</p>
          <p><strong>Account Number:</strong> ${opsInfo.bankDetails.accountNumber}</p>
          <p><strong>IBAN:</strong> ${opsInfo.bankDetails.iban}</p>
          <p><strong>SWIFT:</strong> ${opsInfo.bankDetails.swift}</p>
        </div>

        <div class="terms">
          Payment Terms: 50% upon acceptance, 50% upon completion. All prices are exclusive of bank transfer charges. This quote is valid until the expiration date listed above.
        </div>

        <div class="page-footer">Page 1${(quoteData.scope || quoteData.purchaseTerms) ? ' of 2' : ''}</div>

        ${(quoteData.scope || quoteData.purchaseTerms) ? `
        <div class="terms-page">
          <div>
            <h2>Scope &amp; Purchase Terms</h2>
            ${quoteData.scope ? `
              <div class="terms-section">
                <h3>Scope</h3>
                <div class="terms-body">${escapeHtml(quoteData.scope)}</div>
              </div>
            ` : ''}
            ${quoteData.purchaseTerms ? `
              <div class="terms-section">
                <h3>Purchase Terms</h3>
                <div class="terms-body">${escapeHtml(quoteData.purchaseTerms)}</div>
              </div>
            ` : ''}
          </div>

          <div style="margin-top: auto;">
            <div class="signature-section">
              <div class="signature-block">
                <div class="signature-line">Client Signature &amp; Date</div>
              </div>
              <div class="signature-block">
                <div class="signature-line">Authorized Signature (Ops Solutions) &amp; Date</div>
              </div>
            </div>
            <div class="page-footer">Page 2 of 2</div>
          </div>
        </div>
        ` : `
        <div class="signature-section">
          <div class="signature-block">
            <div class="signature-line">Client Signature &amp; Date</div>
          </div>
          <div class="signature-block">
            <div class="signature-line">Authorized Signature (Ops Solutions) &amp; Date</div>
          </div>
        </div>
        `}
      </body>
      </html>
    `;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <img
            src="https://47432935.fs1.hubspotusercontent-na1.net/hubfs/47432935/Logos/Group.png"
            alt="Ops Solutions logo"
            className="h-12 w-auto"
          />
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-1">Quote Generator</h1>
            <p className="text-slate-600">Pull deal data from HubSpot and generate professional quotes</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Deal ID Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              HubSpot Deal ID
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                placeholder="Enter your HubSpot Deal ID"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={fetchHubSpotData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  'Fetch Quote Data'
                )}
              </button>
            </div>
          </div>

          {/* Quote Expiry Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quote Expires On
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Quote Preview */}
          {quoteData && (
            <div className="mt-8 border-t pt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Quote Preview</h2>
                <button
                  onClick={downloadPDF}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Download Quote
                </button>
              </div>

              {/* Quote Content */}
              <div className="bg-slate-50 p-8 rounded-lg border border-slate-200">
                <div className="mb-8">
                  <h3 className="text-3xl font-bold text-slate-900 mb-6">Operations Solutions</h3>
                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Client</h4>
                      <p className="font-medium text-slate-900">{quoteData.dealName}</p>
                      <p className="text-sm text-slate-600">{quoteData.company.address}</p>
                      <p className="text-sm text-slate-600">{quoteData.company.city}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Ops Solutions</h4>
                      <p className="text-sm text-slate-600">{opsInfo.address}</p>
                      <p className="text-sm text-slate-600">{opsInfo.city}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Prepared By</h4>
                      <p className="font-medium text-slate-900">{opsInfo.preparedBy}</p>
                      <a
                        href={opsInfo.preparedByLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline block"
                      >
                        {opsInfo.preparedByTitle}
                      </a>
                      <p className="text-sm text-slate-600">{opsInfo.email}</p>
                      <p className="text-sm text-slate-600">{opsInfo.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 pb-6 border-b border-slate-300">
                  <p className="text-sm text-slate-600">Quote Created: {quoteData.createdDate}</p>
                  <p className="text-sm text-slate-600">Expires: {formatExpiryDate()}</p>
                </div>

                <table className="w-full mb-6">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="text-left py-3 font-bold text-slate-900">Products & Services</th>
                      <th className="text-right py-3 font-bold text-slate-900 w-24">Quantity</th>
                      <th className="text-right py-3 font-bold text-slate-900 w-32">Price</th>
                      {quoteData.hasDiscount && (
                        <th className="text-right py-3 font-bold text-slate-900 w-32">Discount</th>
                      )}
                      <th className="text-right py-3 font-bold text-slate-900 w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteData.lineItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-3 text-slate-900">{item.name}</td>
                        <td className="text-right py-3 text-slate-600">{item.quantity}</td>
                        <td className="text-right py-3 text-slate-600">${item.price.toFixed(2)}</td>
                        {quoteData.hasDiscount && (
                          <td className="text-right py-3 text-slate-600">{item.discount > 0 ? `-$${item.discount.toFixed(2)}` : '—'}</td>
                        )}
                        <td className="text-right py-3 font-medium text-slate-900">${((item.price * item.quantity) - item.discount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mb-6">
                  <div className="w-64">
                    <div className="flex justify-between py-2 text-slate-600">
                      <span>Subtotal</span>
                      <span>${quoteData.subtotal.toFixed(2)}</span>
                    </div>
                    {quoteData.hasDiscount && (
                      <div className="flex justify-between py-2 text-slate-600">
                        <span>Discount</span>
                        <span>-${quoteData.totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-3 border-t-2 border-slate-900 font-bold text-slate-900 text-lg">
                      <span>Total</span>
                      <span>${quoteData.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-slate-900 mb-2">Banking Information</h4>
                  <p className="text-sm text-slate-600"><strong>Institution:</strong> {opsInfo.bankDetails.institution}</p>
                  <p className="text-sm text-slate-600"><strong>Account Holder:</strong> {opsInfo.bankDetails.accountHolder}</p>
                  <p className="text-sm text-slate-600"><strong>IBAN:</strong> {opsInfo.bankDetails.iban}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Quote data loaded successfully from HubSpot</span>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-slate-900 mb-3">How to use</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
            <li>Enter a HubSpot Deal ID</li>
            <li>Click "Fetch Quote Data" to pull deal info, company data, and line items</li>
            <li>Review the quote preview</li>
            <li>Download as an HTML file or convert to PDF</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
