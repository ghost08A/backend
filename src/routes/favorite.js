const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");

const route = Router();

route.get("/", async (req, res) => {
  res.send("Asdadas");
});




module.exports = route;
