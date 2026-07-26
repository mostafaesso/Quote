// Vercel serverless function that proxies requests to HubSpot.
// This runs on the server, so it avoids browser CORS restrictions and
// keeps the HubSpot API key out of the browser entirely.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server is missing the HUBSPOT_API_KEY environment variable.'
    });
  }

  const { type, id } = req.query;

  if (!type || !id) {
    return res.status(400).json({ error: 'Missing required query params: type, id' });
  }

  const endpoints = {
    deal: `https://api.hubapi.com/crm/v3/objects/deals/${id}?properties=dealname,amount,dealstage,closedate&associations=companies,line_items`,
    company: `https://api.hubapi.com/crm/v3/objects/companies/${id}?properties=name,address,city,state,zip,country,phone`,
    lineitem: `https://api.hubapi.com/crm/v3/objects/line_items/${id}?properties=name,quantity,price,discount`
  };

  const url = endpoints[type];
  if (!url) {
    return res.status(400).json({ error: `Unknown type "${type}". Use deal, company, or lineitem.` });
  }

  try {
    const hubspotRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await hubspotRes.json();

    if (!hubspotRes.ok) {
      return res.status(hubspotRes.status).json({
        error: data.message || `HubSpot request failed with status ${hubspotRes.status}`
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reach HubSpot' });
  }
}
