const { PrismaClient } = require("@prisma/client");
const { Router } = require("express");
const QRCode = require("qrcode");
const generatePayload = require("promptpay-qr");
const prisma = new PrismaClient();
const route = Router();
const Joi = require("joi");
const mobileNumber = "0655389857";
const option = {
  color: {
    dark: "#000",
    light: "#fff",
  },
};
// ทั้งตระกร้า
route.get("/", async (req, res) => {
  try {
    const cartItems = await prisma.cart.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        Game: true,
      },
    });

    let amounts = 0;
    cartItems.forEach((cartItem) => {
      amounts += cartItem.Game.price;
    });
    amounts = parseFloat(amounts);

    const payload = await generatePayload(mobileNumber, { amount: amounts });

    return res.send(payload);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal  { amount: amounts }Server Error");
  }
});
route.get("/game/:gameId", async (req, res) => {
  try {
    const schema = Joi.object({
      gameId: Joi.number().required(),
    }).required();

    const { error, value } = schema.validate(req.params);

    if (error) {
      return res.status(400).send({ error: "Invalid parameters" });
    }

    const game = await prisma.game.findUnique({
      where: { id: value.gameId },
    });
    if (!game) {
      return res.status(404).send({
        error: "Game not found",
      });
    }

    let amounts = parseFloat(game.price);

    // Generate the payload
    const payload = await generatePayload(mobileNumber, { amount: amounts });

    return res.send(payload);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
module.exports = route;
