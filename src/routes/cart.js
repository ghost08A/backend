const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");

const route = Router();

route.get("/", async (req, res) => {
  try {
    const cart = await prisma.cart.findMany();
    return res.send(cart);
  } catch (e) {
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

module.exports = route;
