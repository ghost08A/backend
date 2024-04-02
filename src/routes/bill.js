const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const route = Router();

route.get("/", async (req, res) => {
  //ดูบิล
  const order = await prisma.order.findMany({
    //ค้นหาเกมทั้งหมด
    where: { userId: req.user.id },
  });
  const billData = await Promise.all(
    //สร้างloopทั้งหมด
    order.map(async (v) => {
      return prisma.bill.findFirst({
        where: { orderId: v.id }, //เก็บบิลทั้งหมดไว้ในbillData
      });
    })
  );
  console.log(billData);
  return res.send(billData); //ส่งบิลทั้งหมดกลับไป
});

route.get("/order/:id", async (req, res) => {
  try {
    const schema = Joi.number().required(); //กำหนดข้อมูลที่จะรับมา
    const { error, value } = schema.validate(req.params.id);
    if (error) {
      //ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
      return res.status(400).send({ error: "Invalid id" });
    }
    // ค้นหาorderของuserจากidที่ส่งมา
    const order = await prisma.order.findUnique({
      where: { id: parseInt(value), userId: req.user.id },
      include: {
        Game: true, // Include the related game data
      },
    });
    if (!order) {
      //ถ้าไม่พบorderให้แสดงข้อความบอก
      return res.status(404).send({ error: "Order not found" });
    }
    console.log(order);
    return res.send(order); //ส่งข้อมูลorderกลับไป
  } catch (error) {
    //ถ้ามี error ให้แสดง error
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to retrieve a bill by ID
route.get("/:id", async (req, res) => {
  try {
    const schema = Joi.number().required(); //กำหนดข้อมูลที่จะรับมา
    const { error, value } = schema.validate(req.params.id);
    if (error) {
      //ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
      return res.status(400).send({ error: "Invalid id" });
    }
    // Assuming `bill` is the name of the model representing bills
    const bills = await prisma.bill.findUnique({
      //หาbillผ่านid bill ที่ส่งมา
      where: { id: parseInt(value) },
    });
    if (!bills) {
      //ถ้าไม่มีบิลให้แสดงว่าไม่พบบิล
      return res.status(404).send({ error: "Bill not found" });
    }
    console.log(bills);
    return res.send(bills); //ส่งข้อมูลbillกลับไป
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

route.post("/all", async (req, res) => {
  //ดูorder
  const order = await prisma.order.findMany({
    //ค้นหาorderของuserผ่านtoken
    where: { userId: req.user.id },
  });
  if (order.length === 0) {
    //ถ้าไม่มีorderให้ส่งข้อมูลกลับมาว่าไม่พบ
    return res.send("Order not found");
  }
  console.log(order);
  return res.send(order); //ส่งข้อมูลorderกลับไป
});

route.post("/", async (req, res) => {
  //ซื่อเกมทีละเกม
  const schema = Joi.object({
    //กำหนดข้อมูลที่จะรับมา
    gameId: Joi.number().required(),
  }).required();

  const key = crypto.randomBytes(20).toString("hex"); //สร้างker game
  const { error, value } = schema.validate(req.body);

  if (error) {
    //ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    return res.status(400).send({ error: "Invalid body" });
  }
  //ค้นหาเกมที่จะซื้อผ่านId
  const game = await prisma.game.findUnique({
    where: { id: value.gameId },
  });
  if (!game) {
    //ถ้าไม่พบเกมให้แจ้งเตือนว่าไม่พบ
    return res.status(404).send({
      error: "Game not found",
    });
  }
  //ตรวจสอบว่าuserมีเกมที่จะซื้ออยู่แล้วหรือไม่
  const check = await prisma.order.findFirst({
    where: {
      userId: req.user.id,
      gameId: game.id,
    },
  });
  if (check) {
    //ถ้าuserมีเกมที่จะซื้ออยู่ให้ส่งกลับเป็นfalse
    return res.send({ check: false });
  }
  await prisma.cart.deleteMany({
    //ลบเกมที่ซื้อออกจากตะกร้า
    where: {
      userId: req.user.id,
      gameId: game.id,
    },
  });

  const update = await prisma.game.update({
    //updateข้อมุลยอดขายเพิ่ม1
    where: {
      id: game.id,
    },
    data: {
      sales: game.sales + 1,
    },
  });
  console.log(value);
  try {
    const bill = await prisma.bill.create({
      //สร้างบิลและorder
      data: {
        price: game.price,
        Order: {
          create: {
            userId: req.user.id,
            gameId: value.gameId,
            key: key,
          },
        },
      },
    });

    console.log(bill);
    return res.send(bill); //ส่งbill กลับไป
  } catch (error) {
    //ถ้ามีerrorให้ส่งerrorกลับไป
    console.log(error);
    if (error instanceof Prisma.PrismaClientInitializationError) {
      if (error.mata.target) {
        return res.status(400).send({
          error: "Duplicate field",
          target: e.meta.target.split("_")[1],
        });
      }
    }
  }
});

route.post("/cart", async (req, res) => {
  //ซื้อเกมในตะกร้า
  try {
    const cart = await prisma.cart.findMany({
      //ค้นหาเกมในตะกร้าของuser
      where: { userId: req.user.id },
    });

    const billData = await Promise.all(
      //สร้างbillหลายๆbill
      cart.map(async (v) => {
        const key = crypto.randomBytes(20).toString("hex"); //สร้างker game
        const game = await prisma.game.findUnique({
          //ค้นหาเกมที่จะซื้อ
          where: { id: v.gameId },
        });

        await prisma.cart.delete({
          //ลบเกมที่ซื้อออกจากตะกร้า
          where: { id: v.id },
        });
        //ตรวจสอบว่าuserมีเกมที่จะซื้ออยู่แล้วหรือไม่
        const check = await prisma.order.findFirst({
          where: {
            userId: req.user.id,
            gameId: game.id,
          },
        });
        if (check) {
          return { id: null }; // ส่งค่า id เป็น null ถ้ามีการสั่งซื้อแล้ว
        }
        //updateข้อมุลยอดขายเพิ่ม1
        const update = await prisma.game.update({
          where: {
            id: game.id,
          },
          data: {
            sales: game.sales + 1,
          },
        });
        //สร้างบิลและorder
        return await prisma.bill.create({
          data: {
            price: game.price,
            Order: {
              create: {
                userId: req.user.id,
                gameId: game.id,
                key: key,
              },
            },
          },
        });
      })
    );

    console.log(billData);
    return res.send(billData); //ส่งbill ทั้งหมดกลับไป
  } catch (e) {
    //ถ้ามีerrorให้ส่งerrorกลับไป
    console.log(e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.meta.target) {
        return res.status(400).send({
          error: "Duplicate field",
          target: e.meta.target.split("_")[1],
        });
      }
    }

    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
});

module.exports = route;
/*const order = await prisma.order.create({
          data: {
            Bill: {create:{price: value.price}},
            userId: req.user.id,
            gameId: value.gameId,
            key: key,
          },
        });*/