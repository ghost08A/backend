const Joi = require("joi");
const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken");
const SECRET = process.env.SECRET

const route = Router();

route.post("/", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
    tel: Joi.string().required(),
    email: Joi.string().required(),
  }).required();

  const { error, value } = schema.validate(req.body);
  
  const passwordhash = await bcrypt.hash(value.password, 10);
  console.log(error);
  if (error) {
    return res.status(400).send({
      error: "Invalid body",
    });
  }
  
  try {
    const user = await prisma.user.create({  //create
      data: {
        ...value,
        password: passwordhash
      },
    });

    return res.send(user);
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


route.post("/login", async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }).required();
  const { error, value } = schema.validate(req.body);
  //console.log(value);
  if (error) {
    return res.status(400).send({
      error: "Invalid body",
    });
  }
  let { username, password } = value;
  const existingUser = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });
  
  if (existingUser) {
    
    if (bcrypt.compareSync(password,existingUser.password)) {
      const token = jwt.sign({id:existingUser.id, role:existingUser.role},SECRET);
      
      return  res.send({token,id:existingUser.id,role:existingUser.role});
    } else {
      return res.send({error:"Invalid credentials"});
    }
  } else {
    return res.send({error:"Invalid credentials"});
  }

});

module.exports = route;

/*{
        id: existingUser.id,
        name: existingUser.name,
        username: existingUser.username,
        birth: existingUser.birth,
        password: existingUser.password,
        tel: existingUser.tel,
        address: existingUser.address,
        email: existingUser.email,
        role: existingUser.role
      }*/ 