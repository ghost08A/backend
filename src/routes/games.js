const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const route = Router();

function gettoken(authorization) {
  const token = authorization.split(" ")[1];
  const decode = jwt.verify(token, process.env.SECRET);
  return decode.id;
}

route.get("/", async (req, res) => {
  //ดูเกมทั้งหมด
  const { authorization } = req.headers;
  try {
    const games = await prisma.game.findMany({
      where: { publish: true },
    });
    if (authorization) {
      const id = gettoken(authorization);
      console.log(id);
    } 
      return res.send(games);
    
  } catch (e) {
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.get("/s", async (req, res) => {
  //ดูเกมทั้งหมด
  const { authorization } = req.headers;
  try {
    const games = await prisma.game.findMany({
      where: { publish: false },
    });
    if (authorization) {
      const id = gettoken(authorization);
      console.log(id);
    } 
      return res.send(games);
  } catch (e) {
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.get("/:id", async (req, res) => { //ดูเกม
  const schema = Joi.number().required();
  const { authorization } = req.headers;
  const { error, value } = schema.validate(req.params.id);

  if (error) {
    return res.status(400).send({
      error: "Invalid id",
    });
  }
  try {
    const game = await prisma.game.findUnique({
      where: {
        id: value,
        publish: true,
      },
    });
    if (!game) {
      return res.status(404).send({
        error: "Game not found",
      });
    }
    if (authorization) {
      const id = gettoken(authorization);
      console.log(id);
    } 
    return res.send(game);
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.get("/search/:name", async (req, res) => {
  //search
  const schema = Joi.string().required();
  const { authorization } = req.headers;
  const { error, value } = schema.validate(req.params.name);

  if (error) {
    return res.status(400).send({
      error: "Invalid name",
    });
  }
  try {
    const game = await prisma.game.findMany({
      where: {
        name: {
          contains: value,
        },
        publish: true,
      },
    });

    if (!game || game.length === 0) {
      return res.status(404).send({
        error: "No games found matching the search criteria",
      });
    }
    if (authorization) {
      const id = gettoken(authorization);
      console.log(id);
    }
      return res.send(game);
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
});

route.get("/category/:category", async (req, res) => {
  //category
  const schema = Joi.string() //กำหนดข้อมูล
    .valid(
      "Action",
      "Adventure",
      "RPG",
      "Racing",
      "Cooking",
      "Survival",
      "Story",
      "Horror"
    )
    .required();

  const { error, value } = schema.validate(req.params.category);
  const { authorization } = req.headers; //รับ authorization จาก req.headers
  if (error) {//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    return res.status(400).send({
      error: "Invalid category",
    });
  }

  try {
    const game = await prisma.game.findMany({//ค้นหาเกมตามประเภทที่กรอก
      where: {
        AND: [
          {
            category: value,
          },
          {
            publish: true,
          },
        ],
      },
    });

    if (!game || game.length === 0) {//ถ้าไ่ม่เจอเกมให้แสดงว่าไม่พบเกม
      return res.status(404).send({
        error: "Games not found in this category",
      });
    }

    if (authorization) { //ถ้ามีauthorizationให้log id
      const id = gettoken(authorization);
      console.log(id);
    } 
      return res.send(game);
  } catch (e) { //ถ้ามี error ให้แสง error
    console.log(e);
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.post("/", auth, async (req, res) => {
  //สร้างเกม
  const schema = Joi.object({ //กำหนดข้อมูลที่จะรับมา
    name: Joi.string().required(),
    release: Joi.date().required(),
    price: Joi.number().required(),
    video: Joi.string().required(),
    image: Joi.string().required(),
    description: Joi.string().required(),
    category: Joi.string()
      .valid(
        "Action",
        "Adventure",
        "RPG",
        "Racing",
        "Cooking",
        "Survival",
        "Story",
        "Horror"
      )
      .required(),
  }).required();

  const { error, value } = schema.validate(req.body);

  console.log(value);

  if (error) {//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    return res.status(400).send({
      error: "Invalid body",
    });
  }

  try {
    const game = await prisma.game.create({//สร้างเกมจากข้อมูลที่รับมา
      data: {
        ...value, // ใช้ spread operator เพื่อนำค่าข้อมูลจาก value มาสร้าง
        User: {
          connect: { id: req.user.id }, // เชื่อมโยงกับผู้ใช้โดยใช้ id
        },
      },
    });

    return res.send(game);//ส่งข้อมูลเกมทั้งหมดกลับไป
  } catch (e) {//ถ้ามี error ให้แสง error
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

route.patch("/", auth, async (req, res) => {
  //แก้ไขเกม
  if (req.user.role !== "ADMIN") { //เช็คสิทธิ์การเข้าถึงข้อมูล
    return res.send({ error: "You are not allowed to" });
  }
  const schema = Joi.object({ //กำหนดข้อมูลที่จะรับมา
    id: Joi.number().required(),
    name: Joi.string().required(),
    release: Joi.date().required(),
    price: Joi.number().required(),
    video: Joi.string().required(),
    description: Joi.string().required(),
    category: Joi.string()
      .valid(
        "Action",
        "Adventure",
        "RPG",
        "Racing",
        "Cooking",
        "Survival",
        "Story",
        "Horror"
      )
      .required(),
  }).required();

  const { error, value } = schema.validate(req.body);

  if (error) { //ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    console.log(error);
    return res.status(400).send({ error: "Invalid body" });
  }

  const game = await prisma.game.findUnique({//ค้นหาเกมที่จะแก้ไข
    where: {
      id: value.id,
    },
  });
  console.log(value);
  if (!game) {//ถ้าไม่พบเกมให้ส่งว่าไม่พบเกม
    return res.status(404).send({
      error: "Game not found",
    });
  }

  try {
    const updated = await prisma.game.update({//updatedข้อมูลจากที่รับมา
      where: {
        id: game.id,
      },
      data: value,
    });

    return res.send(updated);//ส่งข้อมูลใหม่กลับไป
  } catch (e) {//ถ้ามี error ให้แสดง error
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

route.delete("/", auth, async (req, res) => {
  //ลบเกม
  const schema = Joi.object({//กำหนดข้อมูลที่จะรับมา
    gameId: Joi.number().required(),
  }).required();

  const { error, value } = schema.validate(req.body);
  if (req.user.role !== "ADMIN") {//เช็คสิทธิ์การเข้าถึงข้อมูล
    return res.send({ error: "You are not allowed to" });
  }

  if (error) {//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    return res.status(400).send({ error: "Invalid body" });
  }

  try {
    const game = await prisma.game.findUnique({//ค้นหาเกมที่จะลบ
      where: {
        id: value.gameId,
      },
    });

    if (!game) {//ถ้าไม่พบเกมให้ส่งว่าไม่พบเกม
      return res.status(404).send({
        error: "Game not found",
      });
    }

    const removed = await prisma.game.delete({//ลบเกมจากIdเกมที่ส่งมา
      where: {
        id: value.gameId,
      },
    });

    return res.send(removed);//ส่งข้อมูลเกมที่ลบกลับไป
  } catch (e) {//ถ้ามี error ให้แสง error
    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
});

route.patch("/confirm", auth, async (req, res) => {
  //ยืนยันเกม
  const schema = Joi.object({//กำหนดข้อมูลที่จะรับมา
    gameId: Joi.number().required(),
  }).required();

  const { error, value } = schema.validate(req.body);
  if (req.user.role !== "ADMIN") {//เช็คสิทธิ์การเข้าถึงข้อมูล
    return res.send({ error: "You are not allowed to" });
  }

  if (error) {//ตรวจสอบข้อผิดพลาดจากการรับข้อมูลมาถ้ามีerrorให้แสดงerror
    return res.status(400).send({ error: "Invalid body" });
  }

  try {
    const update = await prisma.game.update({//ยืนยันเกมจากIdเกมที่ส่งมา
      where: {
        id: value.gameId,
      },
      data: {
        publish: true,
      },
    });

    return res.send(update);//ส่งข้อมูลเกมที่ยืนยันกลับไป
  } catch (error) {//ถ้ามี error ให้แสง error
    console.log(error);
    return res.send(error);
  }
});

module.exports = route;
