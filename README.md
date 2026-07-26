# Quote Generator - Ops Solutions

A professional quote generation app that integrates with HubSpot to automatically pull deal data and create branded quotes.

## Features

- **HubSpot Integration**: Fetch deal data, company info, and line items from HubSpot using your private app token
- **Dynamic Quote Generation**: Automatically populate quotes with real data from your HubSpot deals
- **Professional Branding**: Includes Ops Solutions company info, banking details, and terms
- **Download Functionality**: Export quotes as HTML files (convertible to PDF)
- **Real-time Preview**: See your quote before downloading
- **Secure API Handling**: API key is never stored, only used in your session
- **Responsive Design**: Works on desktop and mobile devices
- **Automatic Calculations**: Calculates totals, discounts, and line item pricing

## Quick Start

### Prerequisites
- HubSpot account with a private app token
- Access to at least one deal with associated company and line items
- Node.js 16+ (if running locally)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/mostafaesso/Quote.git
cd Quote
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open browser to http://localhost:3000

### Using the App

1. Click "Show API Configuration"
2. Enter your HubSpot private app token
3. Enter a Deal ID from your HubSpot account
4. Click "Fetch Quote Data"
5. Review the quote preview
6. Click "Download Quote" to save as HTML

## Configuration

### Update Company Information

Edit the `opsInfo` object in `src/QuoteGenerator.jsx`:

```javascript
const opsInfo = {
  company: 'Ops Solutions',
  address: '307 Vine St, Euless, TX',
  email: 'mostafa@opsolutionss.com',
  phone: '+18628884214',
  // ... other details
};
```

### HubSpot API Setup

1. Go to your HubSpot account
2. Navigate to Settings > Integrations > Private apps
3. Create a new private app if you don't have one
4. Required scopes:
   - `crm.objects.deals.read`
   - `crm.objects.companies.read`
   - `crm.objects.line_items.read`
5. Copy your private app token and use it in the Quote Generator

## How It Works

### Step 1: Authentication
User provides their HubSpot private app token in the UI. This token is used only for API requests and never stored.

### Step 2: Fetch Deal Data
App calls HubSpot API to get:
- Deal name and amount
- Associated company ID
- Associated line items

### Step 3: Fetch Related Data
App then fetches:
- Company details (name, address, city, etc.)
- Line item details (product names, quantities, prices)

### Step 4: Calculate and Display
App calculates:
- Subtotal (sum of all line items)
- Total discount
- Final total

### Step 5: Generate Quote
App displays a professional quote preview with:
- Your Ops Solutions branding
- Client information
- Line items with pricing
- Banking details
- Terms and conditions

## HubSpot API Endpoints

The app uses these HubSpot API v3 endpoints:

```
GET /crm/v3/objects/deals/{dealId}
  Properties: dealname, amount, dealstage, closedate
  Associations: companies, line_items

GET /crm/v3/objects/companies/{companyId}
  Properties: name, address, city, state, zip, country, phone

GET /crm/v3/objects/line_items/{lineItemId}
  Properties: name, quantity, price, discount
```

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Go to vercel.com and sign in
3. Click "New Project"
4. Select your Quote repository
5. Click "Deploy"
6. Set environment variable (optional):
   - `VITE_HUBSPOT_API_KEY` = your private app token

### Deploy to Lovable

1. Go to lovable.dev
2. Click "Import from GitHub"
3. Select the Quote repository
4. Click "Deploy"

## File Structure

```
Quote/
├── public/
│   └── index.html              # Main HTML file
├── src/
│   ├── App.jsx                 # Main app component
│   └── QuoteGenerator.jsx       # Quote generator component
├── package.json                # Dependencies
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── README.md                  # This file
```

## Security Considerations

1. **API Key Safety**: Your HubSpot private app token is never stored or logged
2. **HTTPS Only**: Always use HTTPS in production
3. **Token Rotation**: Rotate your private app token periodically
4. **Scoped Permissions**: Use the minimum required permissions for your private app
5. **Session Only**: API key is only stored in memory during your session

## Troubleshooting

### Quote Won't Load
- Verify you've entered the correct Deal ID
- Check that your API key is valid
- Ensure the deal has an associated company
- Confirm the deal has line items

### Missing Line Items
- Go to the deal in HubSpot
- Add line items if they're missing
- Ensure line items have name and price properties

### Company Info Not Showing
- Verify the deal is associated with a company in HubSpot
- Check that the company has address and contact information

## Future Enhancements

- PDF export with professional formatting
- Email quote directly from the app
- Multiple quote templates
- Customer signature field
- Quote history and tracking
- Bulk quote generation
- Custom branding options
- Payment terms templates

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review HubSpot API documentation
3. Contact Ops Solutions support

## License

This project is proprietary software for Ops Solutions Group LLC.

## Contact

Mostafa Ali
Revenue Operations Manager
Ops Solutions Group LLC
mostafa@opsolutionss.com
+18628884214
