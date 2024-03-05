const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");

const route = Router();

route.get("/", async (req, res) => {
  try {
    const games = await prisma.game.findMany();

    return res.send(games);
  } catch (e) {
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.get("/:id", async (req, res) => {
  const schema = Joi.number().required();

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
      },
    });

    if (!game) {
      return res.status(404).send({
        error: "Game not found",
      });
    }

    return res.send(game);
  } catch (e) {
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.post("/", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    release: Joi.date().required(),
    price: Joi.number().required(),
    video: Joi.string().required(),
    description: Joi.string().required(),
    key: Joi.string().required(),
    category: Joi.string().valid("Action", "Adventure").required(),
  }).required();

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).send({
      error: "Invalid body",
    });
  }

  try {
    const game = await prisma.game.create({
      data: value,
    });

    return res.send(game);
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

route.patch("/:id", async (req, res) => {
  const schema = {
    params: Joi.number().required(),
    body: Joi.object({
      name: Joi.string().required(),
      release: Joi.date().required(),
      price: Joi.number().required(),
      video: Joi.string().required(),
      description: Joi.string().required(),
      key: Joi.string().required(),
      category: Joi.string().valid("Action", "Adventure").required(),
    }).required(),
  };

  const params = schema.params.validate(req.params.id);

  if (params.error) {
    return res.status(400).send({
      error: "Invalid id",
    });
  }

  const game = await prisma.game.findUnique({
    where: {
      id: params.value,
    },
  });

  if (!game) {
    return res.status(404).send({
      error: "Game not found",
    });
  }

  const body = schema.body.validate(req.body);

  if (body.error) {
    return res.status(400).send({
      error: "Invalid body",
    });
  }

  try {
    const updated = await prisma.game.update({
      where: {
        id: params.value,
      },
      data: body.value,
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

route.delete("/:id", async (req, res) => {
  const schema = Joi.number().required();

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
      },
    });

    if (!game) {
      return res.status(404).send({
        error: "Game not found",
      });
    }

    const removed = await prisma.game.delete({
      where: {
        id: value,
      },
    });

    return res.send(removed);
  } catch (e) {
    return res.status(500).send({
      error: "Internal Server Error",
    });
  }
});

module.exports = route;
