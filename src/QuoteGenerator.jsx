import React, { useState } from 'react';
import { FileDown, Loader, AlertCircle, CheckCircle } from 'lucide-react';

export default function QuoteGenerator() {
  const [dealId, setDealId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quoteData, setQuoteData] = useState(null);

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

      // Get associated company
      let companyData = null;
      if (dealData.associations?.companies?.results?.length > 0) {
        const companyId = dealData.associations.companies.results[0].id;
        const companyResponse = await fetch(`/api/hubspot?type=company&id=${companyId}`);

        if (companyResponse.ok) {
          const company = await companyResponse.json();
          companyData = company.properties;
        }
      }

      // Get line items
      let lineItems = [];
      if (dealData.associations?.line_items?.results?.length > 0) {
        const lineItemPromises = dealData.associations.line_items.results.map(item =>
          fetch(`/api/hubspot?type=lineitem&id=${item.id}`).then(res => res.json())
        );

        const lineItemsResults = await
