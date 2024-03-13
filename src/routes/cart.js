const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const route = Router();
const auth = require("../middleware/auth");

route.get("/", async (req, res) => {//ดูเกมในตะกร้า
  try {
    const cart = await prisma.cart.findMany({
      where: { userId: req.user.id },
    });
    return res.send(cart);
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.post("/", async (req, res) => {//เพิ่มเกมในตะกร้า
  const schema = Joi.object({
    gameId: Joi.number().required(),
  }).required();

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).send({ error: "Invalid body" });
  }

  const checkCart = await prisma.cart.findFirst({
    where: {
      userId: req.user.id,
      gameId: value.gameId,
    },
  });
  const checkOder = await prisma.order.findFirst({
    where: {
      userId: req.user.id,
      gameId: value.gameId,
    },
  });
  if (checkOder || checkCart) {
    return res.send({ check: false });
  }

  try {
    const cart = await prisma.cart.create({
      data: {
        ...value,
        userId: req.user.id,
      },
    });
    return res.send(cart);
  } catch (error) {
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
route.delete("/", async (req, res) => {////ลบเกมในตะกร้า
  const schema = Joi.object({
    gameId: Joi.number().required(),
  }).required();
  const { error, value } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).send({ error: "Invalid body" });
  }
  try {
    console.log(value);
    
    const cart = await prisma.cart.deleteMany({
      where: {
        userId: req.user.id,
        gameId: value.gameId,
      },
    });
    console.log(cart);
    return res.send(cart);
  } catch (error) {
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
