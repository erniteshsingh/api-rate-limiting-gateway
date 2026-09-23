import express from "express";

const app = express();

app.use(express.json());

app.get("", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: [
      {
        id: 1,
        name: "Nitesh",
      },
      {
        id: 2,
        name: "Rahul",
      },
    ],
  });
});

const PORT = 7000;

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
