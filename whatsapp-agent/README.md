# DS Safety Systems — WhatsApp Agent

Node.js webhook for the official WhatsApp Cloud API. It answers common product, address, hours, service and AMC questions, and collects service-booking requests step by step.

## Business details configured
- Business: DS Safety Systems
- Customer contact / business number: +91 98187 01683
- Address: Ground floor, Kalka Ji, 1420/13, Block 4, Govindpuri Extension, Chittaranjan Park, New Delhi, Delhi 110019
- Listed closing time: 9:00 PM

## Important
This source code is prepared, but it is **not live until deployed and connected to Meta WhatsApp Cloud API**. The phone number shown in a Google listing is not sufficient to authorize sending messages. Meta must verify/authorize the WhatsApp Business number and provide the access token and Phone Number ID. Never put access tokens in source code or commit them to GitHub.

## Deploy
1. Open https://dashboard.render.com/ and choose **New → Blueprint**.
2. Select this repository: https://github.com/agnisafe-cyber/dssafetysystemsz
3. Set the blueprint file to `whatsapp-agent/render.yaml` if prompted.
4. In the service environment, set `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_PHONE_NUMBER_ID` using values from Meta for Developers → WhatsApp → API Setup.
5. In the Meta WhatsApp configuration, set the callback URL to `https://YOUR-RENDER-SERVICE.onrender.com/webhook`, use the same verify token, verify the webhook, and subscribe to the `messages` field.
6. Test by sending a WhatsApp message to the connected business number.

## Customer booking flow
Send `BOOK` to collect service type, preferred date, preferred time, customer name and visit address. The agent confirms receipt of a **booking request** only; a staff member must confirm the actual appointment.

## Local run
```bash
cd whatsapp-agent
npm install
cp .env.example .env
npm start
```

Set real credentials in the environment before testing. The agent does not store credentials in the repository. Booking requests are stored on the configured data disk.
