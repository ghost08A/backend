const cors = require("cors");
const express = require("express");
const auth = require("./middleware/auth");
require("dotenv/config");

const server = express(); //สร้าง instance ของ Express server

const PORT = process.env.PORT || 5000; //ตั่งport เป็น5000
const HOST = process.env.HOST || "127.0.0.1"; //ตั่ง HOST เป็น 127.0.0.1

server.use(
  //อนุญาตให้มีการเข้าถึงจากทุกๆ โดเมน
  cors({
    origin: "*",
  })
);

server.use(express.json()); //ทำให้express อ่านข้อมูลjsonได้
server.use(
  //ทำให้อ่านข้อมูลแบบURL-encodedได้
  express.urlencoded({
    extended: true,
  })
);

server.use("/games", require("./routes/games")); //เรียกใช้ไฟล์games

server.use("/bill", auth, require("./routes/bill")); //เรียกใช้ไฟล์bill

server.use("/auth", require("./routes/auth")); //เรียกใช้ไฟล์auth

server.use("/user", auth, require("./routes/user")); //เรียกใช้ไฟล์user

server.use("/cart", auth, require("./routes/cart")); //เรียกใช้ไฟล์cart

server.use("/favorite", auth, require("./routes/favorite")); //เรียกใช้ไฟล์favorite

server.use("/payment", auth, require("./routes/payment")); //เรียกใช้ไฟล์payment

server.use((req, res) => {
  //ถ้าไม่พบหน้าที่ต้องการให้แสดงกลับไป
  res.status(404).send({
    error: "Not Found",
  });
});

server.listen(PORT, HOST, () => {
  //เริ่มการทำงานของเซิร์ฟเวอร์
  console.log("Server listening on port " + PORT);
});
