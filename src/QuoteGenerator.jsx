import React, { useState } from 'react';
import { FileDown, Loader, AlertCircle, CheckCircle } from 'lucide-react';

export default function QuoteGenerator() {
  const [dealId, setDealId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quoteData, setQuoteData] = useState(null);
  const [hubspotApiKey, setHubspotApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);

  // Ops Solutions company info (your static data)
  const opsInfo = {
    company: 'Ops Solutions',
    address: '307 Vine St, Euless, TX',
    city: 'Euless, TX 76040-3800',
    country: 'United States',
    preparedBy: 'Revenue Operations Manager',
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

  const fetchHubSpotData = async () => {
    if (!dealId.trim()) {
      setError('Please enter a Deal ID');
      return;
    }

    if (!hubspotApiKey.trim()) {
      setError('Please enter your HubSpot API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch deal data from HubSpot
      const dealResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=dealname,amount,dealstage,closedate&associations=companies,line_items`,
        {
          headers: {
            'Authorization': `Bearer ${hubspotApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!dealResponse.ok) {
        throw new Error('Deal not found. Check your Deal ID and API key.');
      }

      const dealData = await dealResponse.json();
      const dealProperties = dealData.properties;

      // Get associated company
      let companyData = null;
      if (dealData.associations?.companies?.results?.length > 0) {
        const companyId = dealData.associations.companies.results[0].id;
        const companyResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?properties=name,address,city,state,zip,country,phone`,
          {
            headers: {
              'Authorization': `Bearer ${hubspotApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (companyResponse.ok) {
          const company = await companyResponse.json();
          companyData = company.properties;
        }
      }

      // Get line items
      let lineItems = [];
      if (dealData.associations?.line_items?.results?.length > 0) {
        const lineItemPromises = dealData.associations.line_items.results.map(item =>
          fetch(
            `https://api.hubapi.com/crm/v3/objects/line_items/${item.id}?properties=name,quantity,price,discount`,
            {
              headers: {
                'Authorization': `Bearer ${hubspotApiKey}`,
                'Content-Type': 'application/json'
              }
            }
          ).then(res => res.json())
        );

        const lineItemsResults = await Promise.all(lineItemPromises);
        lineItems = lineItemsResults.map(item => ({
          id: item.id,
          name: item.properties.name || 'Unknown Product',
          quantity: item.properties.quantity || 1,
          price: parseFloat(item.properties.price || 0),
          discount: parseFloat(item.properties.discount || 0)
        }));
      }

      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDiscount = lineItems.reduce((sum, item) => sum + item.discount, 0);
      const total = subtotal - totalDiscount;

      setQuoteData({
        dealId,
        dealName: dealProperties.dealname || 'Deal',
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
        total,
        createdDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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

    // Create a simple HTML representation and trigger download
    const htmlContent = generatePDFHTML();
    const element = document.createElement('a');
    const file = new Blob([htmlContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `Quote_${quoteData.dealId}_${Date.now()}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generatePDFHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 900px; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; }
          h1 { text-align: center; color: #333; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-block { flex: 1; }
          .info-block h3 { margin-bottom: 10px; color: #666; font-size: 12px; text-transform: uppercase; }
          .info-block p { margin: 3px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th { background-color: #f0f0f0; padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #333; }
          td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
          .total-section { text-align: right; margin: 30px 0; }
          .total-row { font-size: 18px; font-weight: bold; color: #333; }
          .terms { font-size: 12px; color: #666; margin-top: 40px; line-height: 1.6; }
          .bank-details { background-color: #f9f9f9; padding: 15px; margin-top: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">OPS Solutions</div>
          <div></div>
        </div>
        
        <h1>${quoteData.dealName}</h1>
        
        <div class="info-section">
          <div class="info-block">
            <h3>Client</h3>
            <p><strong>${quoteData.company.name}</strong></p>
            <p>${quoteData.company.address}</p>
            <p>${quoteData.company.city}</p>
            <p>${quoteData.company.country}</p>
          </div>
          <div class="info-block">
            <h3>Ops Solutions</h3>
            <p>${opsInfo.address}</p>
            <p>${opsInfo.city}</p>
            <p>${opsInfo.country}</p>
          </div>
          <div class="info-block">
            <h3>Prepared By</h3>
            <p><strong>${opsInfo.preparedBy}</strong></p>
            <p>${opsInfo.email}</p>
            <p>${opsInfo.phone}</p>
          </div>
        </div>
        
        <div>
          <p><strong>Quote Created:</strong> ${quoteData.createdDate}</p>
          <p><strong>Quote Expires:</strong> ${quoteData.expiryDate}</p>
          <p><strong>Deal ID:</strong> ${quoteData.dealId}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Products & Services</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${quoteData.lineItems.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-section">
          <div>Subtotal: $${quoteData.subtotal.toFixed(2)}</div>
          ${quoteData.totalDiscount > 0 ? `<div>Discount: -$${quoteData.totalDiscount.toFixed(2)}</div>` : ''}
          <div class="total-row">Total: $${quoteData.total.toFixed(2)}</div>
        </div>
        
        <div class="bank-details">
          <h3 style="margin-top: 0;">Banking Details</h3>
          <p><strong>Institution:</strong> ${opsInfo.bankDetails.institution}</p>
          <p><strong>Account Holder:</strong> ${opsInfo.bankDetails.accountHolder}</p>
          <p><strong>Account Number:</strong> ${opsInfo.bankDetails.accountNumber}</p>
          <p><strong>IBAN:</strong> ${opsInfo.bankDetails.iban}</p>
          <p><strong>SWIFT:</strong> ${opsInfo.bankDetails.swift}</p>
        </div>
        
        <div class="terms">
          <h3>Terms and Conditions</h3>
          <p>Payment Terms: 50% upon acceptance, 50% upon completion</p>
          <p>All prices are exclusive of bank transfer charges</p>
          <p>Quote valid for 90 days from creation date</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Quote Generator</h1>
          <p className="text-slate-600">Pull deal data from HubSpot and generate professional quotes</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* API Key Section */}
          <div className="mb-6">
            <button
              onClick={() => setShowApiInput(!showApiInput)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 mb-3"
            >
              {showApiInput ? 'Hide' : 'Show'} API Configuration
            </button>
            
            {showApiInput && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  HubSpot API Key
                </label>
                <input
                  type="password"
                  value={hubspotApiKey}
                  onChange={(e) => setHubspotApiKey(e.target.value)}
                  placeholder="Enter your HubSpot private app token"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Your API key is not stored and is only used for this session
                </p>
              </div>
            )}
          </div>

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
                      <p className="font-medium text-slate-900">{quoteData.company.name}</p>
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
                      <p className="text-sm text-slate-600">{opsInfo.email}</p>
                      <p className="text-sm text-slate-600">{opsInfo.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 pb-6 border-b border-slate-300">
                  <p className="text-sm text-slate-600">Quote Created: {quoteData.createdDate}</p>
                  <p className="text-sm text-slate-600">Expires: {quoteData.expiryDate}</p>
                </div>

                <table className="w-full mb-6">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="text-left py-3 font-bold text-slate-900">Products & Services</th>
                      <th className="text-right py-3 font-bold text-slate-900 w-24">Quantity</th>
                      <th className="text-right py-3 font-bold text-slate-900 w-32">Price</th>
                      <th className="text-right py-3 font-bold text-slate-900 w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteData.lineItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-3 text-slate-900">{item.name}</td>
                        <td className="text-right py-3 text-slate-600">{item.quantity}</td>
                        <td className="text-right py-3 text-slate-600">${item.price.toFixed(2)}</td>
                        <td className="text-right py-3 font-medium text-slate-900">${(item.price * item.quantity).toFixed(2)}</td>
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
                    {quoteData.totalDiscount > 0 && (
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
            <li>Click "Show API Configuration" and enter your HubSpot private app token</li>
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
