const cors = require("cors");
const express = require("express");

const server = express();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "127.0.0.1";

server.use(
  cors({
    origin: "*",
  })
);

server.use(express.json());
server.use(
  express.urlencoded({
    extended: true,
  })
);

server.use("/games", require("./routes/games"));

server.use((req, res) => {
  res.status(404).send({
    error: "Not Found",
  });
});

server.listen(PORT, HOST, () => {
  console.log("Server listening on port " + PORT);
});
