import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    apiKeyHash: {
      type: String,
      required: true,
      unique: true,
    },

    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },

    rateLimit: {
      capacity: {
        type: Number,
        required: true,
        default: 5,
      },

      refillRate: {
        type: Number,
        required: true,
        default: 1,
      },
    },

    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const Client = mongoose.model("Client", clientSchema);

export default Client;