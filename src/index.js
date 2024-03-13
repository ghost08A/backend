const cors = require("cors");
const express = require("express");
const auth = require("./middleware/auth");

require("dotenv/config");

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

server.use("/bill",auth, require("./routes/bill"));

server.use("/auth", require("./routes/auth"));

server.use("/user",auth,  require("./routes/user"));

server.use("/cart", auth, require("./routes/cart"));

server.use("/favorite", auth, require("./routes/favorite"));

server.use("/payment",auth,require("./routes/payment"));


server.use((req, res) => {
  res.status(404).send({
    error: "Not Found",
  });
});

server.listen(PORT, HOST, () => {
  console.log("Server listening on port " + PORT);
});
