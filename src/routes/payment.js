const { PrismaClient } = require("@prisma/client");
const { Router } = require("express");
const QRCode = require("qrcode");
const generatePayload = require("promptpay-qr");
const prisma = new PrismaClient();
const route = Router();


const mobileNumber = "0655389857";
const option = {
  color: {
    dark: "#000",
    light: "#fff",
  },
};
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
    const qrCodeBuffer = await QRCode.toBuffer(payload, option);
    // Set Content-Type header to indicate that the response is an image
    res.setHeader("Content-Type", "image/png");
    return res.send(qrCodeBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal  { amount: amounts }Server Error");
  }
});

module.exports = route;