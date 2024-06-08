import { Hono } from "hono";
import { Webhook } from "svix";

const app = new Hono();

app.get("/", (c) => c.text("Hello Bun from Koyeb!"));

type NestedRecord = { [k: string]: string | number | NestedRecord };

type Event = {
  data: NestedRecord;
  object: "event";
  type: EventType;
};

type EventType =
  | "organization.created"
  | "organization.deleted"
  | "organization.updated"
  | "organizationMembership.deleted"
  | "organizationMembership.updated"
  | "organizationMembership.created";

app.post("/webhook", async (c) => {
  const WEBHOOK_SECRET = Bun.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("You need a WEBHOOK_SECRET in your .env");
  }

  // Get the body and headers
  const payload = await c.req.text();

  // Get the Svix headers for verification
  const svix_id = c.req.header("svix-id") as string;
  const svix_timestamp = c.req.header("svix-timestamp") as string;
  const svix_signature = c.req.header("svix-signature") as string;

  // If there are no Svix headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return c.json(
      {
        message: "Error occurred -- no svix headers",
      },
      400,
    );
  }

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: Event;

  // Attempt to verify the incoming webhook
  // If successful, the payload will be available from 'evt'
  // If the verification fails, error out and return error code
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as Event;
  } catch (_) {
    console.log("Error verifying webhook");
    return c.json(
      {
        message: "Error occurred -- could not verify webhook",
      },
      400,
    );
  }

  // Do something with the payload
  // For this guide, you simply log the payload to the console
  const data = evt.data;
  const eventType = evt.type;
  console.log("Webhook received", eventType);
  // console.log("Webhook body:", id, evt.data);

  // Simulate lag by sleeping for 2 seconds
  // await new Promise((resolve) => setTimeout(resolve, 2000));

  switch (eventType) {
    /**
     * Create an organization in the database as soon as it's created in Clerk
     */
    case "organization.created": {
      console.log("Organization successfully created");
      return c.json({
        message: "Organization successfully created",
      });
    }

    /**
     * Update an organization in the database as soon as it's updated in Clerk
     * Like updating the slug or image URL
     */
    case "organization.updated": {
      console.log("Organization successfully updated");
      return c.json({
        message: "Organization successfully updated",
      });
    }

    /**
     * Delete an organization in the database as soon as it's deleted in Clerk
     */
    case "organization.deleted": {
      console.log("Interviewer already exists");
      return c.json({
        message: "Interviewer already exists",
      });
    }
    case "organizationMembership.updated": {
      console.warn("Interviewer not found");
      return c.json(
        {
          message: "Interviewer not found",
        },
        400,
      );
    }
    case "organizationMembership.deleted": {
      console.warn("Interviewer not found");
      return c.json(
        {
          message: "Interviewer not found",
        },
        400,
      );
    }

    default:
      break;
  }

  return c.json(
    {
      message: "Unknown event type",
    },
    400,
  );
});

const port = process.env.PORT || 3000;
Bun.serve({
  fetch: app.fetch,
  port: port,
});
