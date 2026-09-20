import express from "express";

const app = express();

app.use(express.json());

app.get("/api/products", (req, res) => {
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

const PORT = 6000;

app.listen(PORT, () => {
  console.log(`Backend service running on port ${PORT}`);
});
