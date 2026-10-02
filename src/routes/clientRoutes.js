import express from "express";
import Client from "../model/client.model.js";
import { generateApiKey, hashApiKey } from "../utils/apiKey.js";
import authorizeAdmin from "../middleware/authorization.js";

const router = express.Router();

router.post("/clients", async (req, res) => {
  try {
    const { name, plan = "free" } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Client name is required",
      });
    }

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    const client = await Client.create({
      name,
      apiKeyHash,
      plan,
    });

    return res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: {
        clientId: client._id,
        name: client.name,
        plan: client.plan,
        apiKey,
      },
    });
  } catch (error) {
    console.error("Client creation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create client",
    });
  }
});

router.patch(
  "/admin/clients/:clientId/status",
  authorizeAdmin,
  async (req, res) => {
    try {
      const { clientId } = req.params;
      const { status } = req.body;

      if (!["active", "revoked"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be active or revoked",
        });
      }

      const client = await Client.findByIdAndUpdate(
        clientId,
        { status },
        { new: true },
      );

      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Client ${status} successfully`,
        data: {
          clientId: client._id,
          name: client.name,
          status: client.status,
        },
      });
    } catch (error) {
      console.error("Client status update error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to update client status",
      });
    }
  },
);

router.get(
    "/admin/clients",
    authorizeAdmin,
    async (req, res) => {
      try {
        const clients = await Client.find()
          .select("-apiKeyHash")
          .sort({ createdAt: -1 });
  
        return res.status(200).json({
          success: true,
          message: "Clients fetched successfully",
          data: clients.map((client) => ({
            clientId: client._id,
            name: client.name,
            plan: client.plan,
            rateLimit: client.rateLimit,
            status: client.status,
            createdAt: client.createdAt,
          })),
        });
      } catch (error) {
        console.error(
          "Fetch clients error:",
          error.message
        );
  
        return res.status(500).json({
          success: false,
          message: "Failed to fetch clients",
        });
      }
    }
  );

export default router;
