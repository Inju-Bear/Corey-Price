import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe webhook must come before express.json()
  // app.post('/api/webhook', express.raw({type: 'application/json'}), ...)

  app.use(express.json());

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { recruiterId, eventId, totalCount } = req.body;
      const stripe = getStripe();
      
      const appUrl = process.env.APP_URL || req.headers.origin || req.headers.referer || 'http://localhost:3000';
      const successUrl = `${appUrl}?payment_success=true&eventId=${eventId}`;
      const cancelUrl = `${appUrl}?payment_cancel=true`;

      let name = 'QR Code Scanning Activation';
      let description = 'Unlock QR code scanning feature for one event.';
      let amount = 2500; // $25.00
      
      if (eventId === 'all_events' && totalCount > 1) {
        name = 'All Events Pass - QR Scanning';
        description = 'Unlock QR code scanning feature for all events.';
        amount = Math.floor(2500 * totalCount * 0.95);
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: name,
                description: description,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          recruiterId,
          eventId
        }
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      if (error.message.includes('STRIPE_SECRET_KEY')) {
         return res.status(500).json({ error: 'Stripe backend is not configured' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
