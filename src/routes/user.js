const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const fs = require('fs');
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)

const route = Router();

route.get("/:id", async (req, res) => {
  const schema = Joi.number().required();

  const { error, value } = schema.validate(req.params.id);

  if (error) {
    return res.status(400).send({
      error: "Invalid id",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: value,
      },
    });

    if (!user) {
      return res.status(404).send({
        error: "user not found",
      });
    }

    return res.send(user);
  } catch (e) {
    return res.status(500).send({
      error: "Internal Service Error",
    });
  }
});

route.patch("/:id", async (req, res) => {
  const schema = {
    params: Joi.number().required(),
    body: Joi.object({
      name: Joi.string().required(),
      username: Joi.string().required(),
      password: Joi.string().required(),
      tel: Joi.string().required(), //edit
      email: Joi.string().required(),
      profile: Joi.string().required(),
    }).required(),
  };

  const params = schema.params.validate(req.params.id);

  if (params.error) {
    return res.status(400).send({
      error: "Invalid id",
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: params.value,
    },
  });

  if (!user) {
    return res.status(404).send({
      error: "user not found",
    });
  }

  const body = schema.body.validate(req.body);

  if (body.error) {
    return res.status(400).send({
      error: "Invalid body",
    });
  }

  try {
    const updated = await prisma.user.update({
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
    const user = await prisma.user.findUnique({
      where: {
        id: value,
      },
    });

    if (!user) {
      return res.status(404).send({
        error: "user not found",
      });
    }

    const removed = await prisma.user.delete({
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

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./uploads/users");
  },
});
const upload = multer({ storage, limits: { fileSize: 1000000 } });
route.post("/photo", upload.single("photo"), async (req, res) => {
  
  console.log(req.file.path);

  /*if(req.file && req.file.path){
    await unlinkAsync(path.join(__dirname, "../../"+req.file.path))
  }*/
  
  const updated = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      profile: req.file.path,
    },
  });
  
  res.send(req.file);
});

route.get("/", async (req, res) => {
  res.setHeader("Content-Type", "image/jpeg");
  const image = await prisma.user.findUnique({
    where: {id: req.user.id}
  })
  console.log(image.profile);
  res.sendFile(path.join(__dirname, "../../"+image.profile));
});


module.exports = route;
