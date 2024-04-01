const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const route = Router();
const auth = require("../middleware/auth");

route.get("/", async (req, res) => {
  //ดูเกมในตะกร้า
  try {
    const cart = await prisma.cart.findMany({//ค้นหาเกมในตะกร้าของuser
      where: { userId: req.user.id },
    });
    return res.send(cart);//ส่งข้อมูลเกมในตะกร้าทั้งหมดกลับไป
  } catch (e) {//ถ้ามีerrorให้ส่งerrorกลับไป
    console.log(e);
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.post("/", async (req, res) => {
  //เพิ่มเกมในตะกร้า
  const schema = Joi.object({//กำหนดข้อมูลที่จะรับมา
    gameId: Joi.number().required(),
  }).required();

  const { error, value } = schema.validate(req.body);

  if (error) {//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    return res.status(400).send({ error: "Invalid body" });
  }
  //ดูว่าเกมใหม่ที่จะเพิ่มเข้ามาอยู่ในตะกร้าอยู่แล้วหรือไม่
  const checkCart = await prisma.cart.findFirst({
    where: {
      userId: req.user.id,
      gameId: value.gameId,
    },
  });
  //ดูว่าเกมใหม่ที่จะเพิ่มเข้ามาuserเคยซื้อแล้วหรือไม่
  const checkOder = await prisma.order.findFirst({
    where: {
      userId: req.user.id,
      gameId: value.gameId,
    },
  });
  //ดูว่ามีเกมที่จะเพิ่มมาหรือไม่
  const checkgame = await prisma.game.findFirst({
    where: {
      id: value.gameId,
    },
  });
  //ถ้ามีความผิดปรกติให้ส่งข้อมูลกลับไปเป็นfalse
  if (checkOder || checkCart || !checkgame) {
    return res.send({ check: false });
  }

  try {
    const cart = await prisma.cart.create({//เพิ่มเกมลงตะกร้า
      data: {
        ...value,
        userId: req.user.id,
      },
    });
    return res.send(cart);//ส่งข้อมูลเกมที่พึ่งลงตะกร้ากลับไป
  } catch (error) {//ถ้ามีerrorให้ส่งerrorกลับไป
    console.log(error);
    return res.send({ error: error });
  }
});

route.delete("/", async (req, res) => {
  ////ลบเกมในตะกร้า
  const schema = Joi.object({//กำหนดข้อมูลที่จะรับมา
    gameId: Joi.number().required(),
  }).required();
  const { error, value } = schema.validate(req.body);
  if (error) {//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    return res.status(400).send({ error: "Invalid body" });
  }
  try {
    console.log(value);
    const cart = await prisma.cart.deleteMany({//ลบเกมที่userเลือกออกจากตะกร้า
      where: {
        userId: req.user.id,
        gameId: value.gameId,
      },
    });
    console.log(cart);
    return res.send(cart);//ส่งข้อมูลเกมที่ลบกลับมา
  } catch (error) {//ถ้ามีerrorให้ส่งerrorกลับไป
    if (error instanceof Prisma.PrismaClientInitializationError) {
      if (error.mata.target) {
        return res.status(400).send({
          error: "Duplicate field",
          target: e.meta.target.split("_")[1],
        });
      }
    }
    console.log(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
});

module.exports = route;
