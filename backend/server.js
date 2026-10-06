import express from "express";

const app = express();

app.use(express.json());

app.get("", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    data: [
      {
        id: 1,
        name: "Laptop",
        price: 50000,
      },
      {
        id: 2,
        name: "Keyboard",
        price: 2000,
      },
    ],
  });
});
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "product-service",
  });
});

const PORT = 6500;

app.listen(PORT, () => {
  console.log(`Backend service running on port ${PORT}`);
});
