const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("./sendmail");
const SECRET = process.env.SECRET;
const route = Router();//require ฟังก์ชั่นที่ต้องใช้ทั้งหมด


route.post("/", async (req, res) => {
  const schema = Joi.object({//กำหนดข้อมูลที่จะรับมา
    name: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
    tel: Joi.string().required(),
    email: Joi.string().required(),
  }).required();

  const { error, value } = schema.validate(req.body);

  const passwordhash = await bcrypt.hash(value.password, 10);//hash password
  //console.log(error);
  if (error) {//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    return res.status(400).send({
      error: "Invalid body",
    });
  }

  try {//create user
    const user = await prisma.user.create({
      //create
      data: {
        ...value,
        password: passwordhash,
      },
    });
    const token = await prisma.tokenemail.create({
      data: {//สร้าง token ในตาราง tokenemail 
        userId: user.id,
        tokenId: crypto.randomBytes(32).toString("hex"),
      },
    });
//สร้างฟรอมยืนยันemail html เก็บไว้ใน htmlForm
    const htmlForm = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Success</title>
    <style>
      body {
        font-family: Arial, sans-serif;
      }
      h1 {
        color: #333;
      }
      button {
        padding: 10px 20px;
        background-color: #007bff;
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
      }
      button:hover {
        background-color: #0056b3;
      }
    </style>
  </head>
  <body>
    <h1>Verification Successful!</h1>
    <p>Your email has been successfully verified.</p>
    <form action="http://localhost:5000/auth/verify/${user.id}/${token.tokenId}" method="get">
      <button type="submit">Submit</button>
    </form>
  </body>
  </html>
`;// ส่ง email ยืนยันเข้าไปให้ emailของuser
    await sendEmail(user.email, "Verify Email", htmlForm);
    return res.send(user);
  } catch (e) {//ถ้ามี error ให้แสดง error
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      let targetField;

      if (e.code === "P2002") {
        targetField = e.meta.target;
      }
      return res.status(400).send({
        error: "Duplicate field",
        target: targetField || "Unknown", // Set default value if field name couldn't be determined
      });
    }

    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
});

route.post("/login", async (req, res) => {
  //login
  const schema = Joi.object({ //กำหนดข้อมูลที่จะรับมา
    login: Joi.string().required(),
    password: Joi.string().required(),
  }).required();
  const { error, value } = schema.validate(req.body);
  let verify;
  //console.log(value);
  if (error) {//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    console.log(error);
    return res.status(400).send({
      error: "Invalid body",
    });
  }
  //ค้นหาขอมูลของuserผ่าน username หรือ email
  let { login, password } = value;
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username: login }, { email: login }] },
  });

  if (existingUser) {//หาข้อมูล verify email ของ user
    verify = await prisma.tokenemail.findFirst({
      where: { userId: existingUser.id },
    });
  }

  if (existingUser && !verify) {//เช็คว่ามี user กับ verify emailแล้วหรือไม่
    //ตรวจสอบรหัสผ่านในdatabaseกับที่กรอกมาตรงกันมั้ย 
    if (bcrypt.compareSync(password, existingUser.password)) {
      const token = jwt.sign(//สร้าง token
        { id: existingUser.id, role: existingUser.role },
        SECRET
      );

      return res.send({ token, id: existingUser.id, role: existingUser.role });
    } else {//ถ้ามีข้อผิดพลาดให้แสดงว่าข้อมีลผิดพลาด
      return res.send({ error: "Invalid credentials" });
    }
  } else {
    return res.send({ error: "Invalid credentials" });
  }
  return res.send({ error: "Invalid credentials" });
});

route.get("/verify/:id/:token", async (req, res) => {
  const schema = Joi.object({//กำหนดข้อมูลที่จะรับมา
    id: Joi.string().required(),
    token: Joi.string().required(),
  }).required();
  const { error, value } = schema.validate(req.params);
  if (error) {//ถ้ามี error ให้แสดง error
    return res.status(400).send({
      error: "Invalid parameters",
    });
  }

  try {
    //หาtokenของuser
    const token = await prisma.tokenemail.findFirst({
      where: {
        AND: [
          { userId: parseInt(req.params.id) },
          { tokenId: req.params.token },
        ],
      },
    });
    //ถ้าไม่มี token ให้ส่งข้อความกลับไปแจ้งเตือน
    if (!token) return res.status(400).send("Invalid link");
    //ลบ token ในตาราง tokenemail
    await prisma.tokenemail.deleteMany({
      where: {
        userId: parseInt(req.params.id),
      },
    });//สร้างฟรอมแจ้งเตือน html เก็บไว้ใน htmlForm
    const htmlForm = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reant_Game</title>
      </head>
      <body>
        <h1>Verification Successful!</h1>
        <p>Your email has been successfully verified.</p>
      </body>
      </html>
    `;//ส่ง htmlForm กลับไป
    return res.status(200).send(htmlForm);
  } catch (error) {//ถ้ามี error ให้แสดง error
    return res.send({ error: error });
  }
});
module.exports = route;
