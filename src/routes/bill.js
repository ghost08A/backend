const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const route = Router();

route.get('/',async (req,res) => { //ดูบิล
  const order = await prisma.order.findMany({
    where: {userId: req.user.id}
  })
  const billData = await Promise.all(order.map(async (v) => {
    return prisma.bill.findFirst({
      where: {orderId: v.id}
    })
  }))
  console.log(billData);
  return res.send(billData);
})

route.get('/order',async (req,res) => {//ดูorder
  const order = await prisma.order.findMany({
    where: {userId: req.user.id}
  })
  console.log(order);
  return res.send(order);
})

route.post("/", async (req, res) => {//ซื่อเกมทีละเกม
  const schema = Joi.object({
    gameId: Joi.number().required(),
  }).required();

  const key = crypto.randomBytes(20).toString("hex");
  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).send({ error: "Invalid body" });
  }

  const game = await prisma.game.findUnique({
    where: { id: value.gameId },
  });
  if(!game){
    return res.status(404).send({
      error: "Game not found",
    });
  }
  const check = await prisma.order.findFirst({
    where: {
      userId: req.user.id,
      gameId: game.id,
    },
  });
  if(check){
    return res.send({ check: false });
  }
  //let sales =game.sales+1;
  const update = await prisma.game.update({
    where: {
      id: game.id,
    },
    data:{
      sales:game.sales+1
    }
  });
  console.log(value);
  try {

    
    const bill = await prisma.bill.create({
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
    return res.send(bill);
  } catch (error) {
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

route.post("/cart", async (req, res) => {//ซื้อเกมในตะกร้า
  try {
    const cart = await prisma.cart.findMany({
      where: { userId: req.user.id },
    });

    const billData = await Promise.all(cart.map(async (v) => {
      const key = crypto.randomBytes(20).toString("hex");
      const game = await prisma.game.findUnique({
        where: { id: v.gameId },
      });

      await prisma.cart.delete({
        where: { id: v.id },
      });
      const check = await prisma.order.findFirst({
        where: {
          userId: req.user.id,
          gameId: game.id,
        },
      });
      if(check){
        return res.send({check: false})
      }
      const update = await prisma.game.update({
        where: {
          id: game.id,
        },
        data:{
          sales:game.sales+1
        }
      });
      return prisma.bill.create({
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
    }));

    console.log(billData);
    return res.send(billData);
  } catch (e) {
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
