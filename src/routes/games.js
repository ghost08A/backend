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

route.get("/", async (req, res) => { //ดูเกมทั้งหมด
  const { authorization } = req.headers;
  try {
    const games = await prisma.game.findMany({
      where: { publish: true },
    });
    if (authorization) {
      const id = gettoken(authorization);
      const responseData = { games, id };

      return res.send(responseData);
    } else {
      console.log(authorization);
      return res.send(games);
    }
  } catch (e) {
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.get("/:id", async (req, res) => {//ดูเกม
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
      const responseData = { game, id };
      return res.send(responseData);
    } else {
      //console.log(authorization);
      return res.send(game);
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.get("/search/:name", async (req, res) => {//search
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
      const responseData = { game, id };
      return res.send(responseData);
    } else {
      console.log(authorization);
      return res.send(game);
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
});

route.get("/category/:category", async (req, res) => {//category
  const schema = Joi.string()
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
  const { authorization } = req.headers;
  if (error) {
    return res.status(400).send({
      error: "Invalid category",
    });
  }

  try {
    const game = await prisma.game.findMany({
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

    if (!game || game.length === 0) {
      return res.status(404).send({
        error: "Games not found in this category",
      });
    }

    if (authorization) {
      const id = gettoken(authorization);
      const responseData = { game, id };
      return res.send(responseData);
    } else {
      console.log(authorization);
      return res.send(game);
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.post("/", auth,async (req, res) => {//สร้างเกม
  const schema = Joi.object({
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
      }).required()
    

  const {error, value} = schema.validate(req.body);

  console.log(value);

  if (error) {
    return res.status(400).send({
      error: "Invalid body",
    });
  }
 
  try {
    const game = await prisma.game.create({
      data: {
        ...value, // ใช้ spread operator เพื่อนำค่าข้อมูลจาก value มาสร้าง
        User: {
          connect: { id: req.user.id } // เชื่อมโยงกับผู้ใช้โดยใช้ id
        }
      }
    });

    return res.send(game);
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

route.patch("/",auth, async (req, res) => {//แก้ไขเกม
  if(req.user.role!=="ADMIN"){
    return res.send({error:"You are not allowed to"})
  }
  const schema =  Joi.object({
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
    }).required()
  
  const {error, value} = schema.validate(req.body);

  if(error){
    console.log(error);
    return res.status(400).send({error:"Invalid body"})
  }

  const game = await prisma.game.findUnique({
    where: {
      id: value.id,
    },
  });
  console.log(value);
  if (!game) {
    return res.status(404).send({
      error: "Game not found",
    });
  }

  try {
    const updated = await prisma.game.update({
      where: {
        id: game.id,
      },
      data: value,
    });

    return res.send(updated);
  } catch (e) {
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

route.delete("/", auth, async (req, res) => {//ลบเกม
  const schema = Joi.object({
    gameId: Joi.number().required(),
  }).required();

  const { error, value } = schema.validate(req.body);
  if(req.user.role!=="ADMIN"){
    return res.send({error:"You are not allowed to"})
  }
  if (error) {
    return res.status(400).send({ error: "Invalid body" });
  }

  try {
    const game = await prisma.game.findUnique({
      where: {
        id: value.gameId,
      },
    });

    if (!game) {
      return res.status(404).send({
        error: "Game not found",
      });
    }

    const removed = await prisma.game.delete({
      where: {
        id: value.gameId,
      },
    });

    return res.send(removed);
  } catch (e) {
    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
});

route.patch('/confirm', auth , async (req, res) =>{ //ยืนยันเกม
  const schema = Joi.object({
    gameId: Joi.number().required(),
  }).required();

  const { error, value } = schema.validate(req.body);
  if(req.user.role!=="ADMIN"){
    return res.send({error:"You are not allowed to"})
  }

  if (error) {
    return res.status(400).send({ error: "Invalid body" });
  }

  try {
    const update = await prisma.game.update({
      where: {
        id: value.gameId,
      },
      data:{
        publish:true
      }
    });

    return res.send(update);
  } catch (error) {
    console.log(error);
    return res.send(error);
  }
});

module.exports = route;

