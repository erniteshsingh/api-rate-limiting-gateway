import express from "express";

const app = express();

app.use(express.json());

app.get("", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Orders fetched successfully",
    data: [
      {
        id: 1,
        product: "Laptop",
        user: "Nitesh",
        amount: 50000,
      },
      {
        id: 2,
        product: "Keyboard",
        user: "Rahul",
        amount: 2000,
      },
    ],
  });
});

const PORT = 8000;

app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});
